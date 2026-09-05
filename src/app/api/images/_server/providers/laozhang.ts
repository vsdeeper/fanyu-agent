import { requireEnv } from '@/lib/shared/server/env';
import {
  buildImagePrompt,
  createRequestAbortSignal,
  decodeBase64Image,
  downloadImage,
  readImageDimensions,
  sniffImageMime,
} from '../image-utils';
import type { ImageGenerateRequest, ImageGenerateResult, ImageProvider, ImageSpec } from '../types';
import {
  getImageSpec,
  IMAGE_ASPECT_RATIO_AUTO,
  IMAGE_ASPECT_RATIOS,
  resolveImageQuality,
  resolveOutboundImageSize,
} from '../image-spec';
import { extractGeminiImage, type GeminiGenerateResponse } from './gemini-response';

/** Gemini generateContent 图片段：请求用 snake `inline_data`，响应可能回 camel `inlineData`，两种都认。 */
type GeminiRequestPart = { text?: string; inline_data?: { mime_type?: string; data?: string } };

/** Gemini imageConfig.aspectRatio 支持的枚举（白名单），非枚举比例直接不发送以免 400。 */
const SUPPORTED_ASPECT_RATIOS = IMAGE_ASPECT_RATIOS as readonly string[];

/**
 * 参考图源 → Gemini inline_data 载荷。
 * 编辑源图恒为 data URL（assetToDataUrl / pastedImageDataUrl），主路径解析出 MIME 与 base64；
 * 兜底下载外链再转 base64。
 */
async function toInlineData(source: string): Promise<{ mime_type?: string; data?: string }> {
  // 修复：勿改回 (.+)$——贪婪量词跨多 MB base64 会撑爆 V8 正则栈（Maximum call stack size exceeded）。
  // 只匹配前缀，payload 用 slice 截取，避免跨超大 payload 做量词回溯。
  const m = /^data:([^;,]+)?;base64,/.exec(source);
  if (m) return { mime_type: m[1] || 'image/jpeg', data: source.slice(m[0].length) };
  const { bytes, mimeType } = await downloadImage(source);
  return { mime_type: mimeType, data: Buffer.from(bytes).toString('base64') };
}

/** 压缩 Gemini 失败体：去掉可能存在的 base64，只留 finishReason / 文本片段供排查。 */
function summarizeGeminiFailurePayload(payload: GeminiGenerateResponse) {
  const first = payload.candidates?.[0];
  const parts = first?.content?.parts ?? [];
  return {
    error: payload.error,
    promptFeedback: payload.promptFeedback,
    finishReason: first?.finishReason,
    candidateCount: payload.candidates?.length ?? 0,
    parts: parts.map((part) => {
      if (part.inlineData?.data || part.inline_data?.data) return { type: 'image' as const };
      if (part.text) return { type: 'text' as const, text: part.text.slice(0, 200) };
      return { type: 'other' as const };
    }),
  };
}

/** 老张生图失败打服务端日志（含出站尺寸）；payload 摘要避免把整段 base64 刷进终端。 */
function logLaozhangFailure(
  reason: string,
  fields: {
    modelId: string;
    status: number;
    size?: string;
    aspectRatio?: string;
    payload: unknown;
  },
) {
  console.error(`[laozhang] ${reason}`, fields);
}

/** OpenAI images 通道的响应项：gpt-image 系列默认只回 b64_json，兼容 url。 */
type OpenAIImageItem = { b64_json?: string; url?: string };
type OpenAIImageResponse = { data?: OpenAIImageItem[]; error?: { message?: string } };

/**
 * 走 OpenAI /v1/images/* 通道的 laozhang 模型（非 Gemini generateContent）。
 * 网关按模型上报的通道格式路由；hit 此集合的模型用 OpenAI 载荷/响应，其余仍走 Gemini。
 */
const OPENAI_IMAGE_MODELS = new Set(['gpt-image-2-vip']);

/** 参考图源 → { bytes, mimeType }：data URL 主路径解码，兜底下载外链。 */
async function toSourceBytes(source: string): Promise<{ bytes: Uint8Array; mimeType: string }> {
  // 修复：勿改回 (.+)$——贪婪量词跨多 MB base64 会撑爆 V8 正则栈（Maximum call stack size exceeded）。
  // 只匹配前缀，payload 用 slice 截取，避免跨超大 payload 做量词回溯。
  const m = /^data:([^;,]+)?;base64,/.exec(source);
  if (m)
    return { bytes: decodeBase64Image(source.slice(m[0].length)), mimeType: m[1] || 'image/jpeg' };
  return downloadImage(source);
}

/** 按 mime 取上传文件名后缀（openai edits 的 image 字段），默认 jpg。 */
function extFromMime(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

/**
 * laozhang 的 OpenAI images 通道：生成走 /v1/images/generations，改图走 /v1/images/edits（multipart）。
 * 响应认 data[].b64_json / data[].url；多参考被上游 400 拒绝时降级仅首图重试。
 */
async function generateOpenAIImage(
  req: ImageGenerateRequest,
  apiKey: string,
  baseURL: string,
  spec: ImageSpec,
): Promise<ImageGenerateResult> {
  // gpt-image 按模型声明走像素入参：不支持 *K 档位时统一转 WxH，并结合比例 reshape。
  const outboundSize = resolveOutboundImageSize(req.size, req.aspectRatio, spec);
  // 仅支持 quality 的模型（gpt-image）透传该档位；不支持时 resolveImageQuality 返回 undefined，payload 不带该字段。
  const quality = resolveImageQuality(req.quality, spec);
  const refs = req.mode === 'edit' ? (req.referenceImageDataUrls ?? []) : [];

  const buildPayload = async (sources: string[]) => {
    const prompt = buildImagePrompt(req.prompt, req.transparent);
    if (req.mode === 'edit') {
      // edits 为 multipart：每张参考图一个 image 字段；同样带 size（OpenAI edits 兼容），
      // 否则改图收不到尺寸、按模型默认比例（如 16:10）出图，表现为 size 失效。
      const form = new FormData();
      form.append('model', req.modelId);
      form.append('prompt', prompt);
      form.append('size', outboundSize);
      if (quality) form.append('quality', quality);
      for (const ref of sources) {
        const { bytes, mimeType } = await toSourceBytes(ref);
        // 复制到独立 ArrayBuffer 再喂 Blob：TS lib 的 BlobPart 只认 ArrayBufferView<ArrayBuffer>，
        // 不接受可能 SharedArrayBuffer 后备的 Uint8Array<ArrayBufferLike>（否则 type-check 失败）。
        const buffer = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(buffer).set(bytes);
        form.append(
          'image',
          new Blob([buffer], { type: mimeType }),
          `ref.${extFromMime(mimeType)}`,
        );
      }
      return { body: form };
    }
    return {
      body: JSON.stringify({
        model: req.modelId,
        prompt,
        size: outboundSize,
        ...(quality ? { quality } : {}),
      }),
      contentType: 'application/json',
    };
  };

  const target = req.mode === 'edit' ? `${baseURL}/images/edits` : `${baseURL}/images/generations`;

  const requestSignal = createRequestAbortSignal(req.abortSignal);
  const doFetch = async (payload: { body: BodyInit; contentType?: string }) => {
    const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` };
    // multipart（FormData）由 fetch 自动带 boundary，勿手设 Content-Type；仅 JSON 分支设置。
    if (payload.contentType) headers['Content-Type'] = payload.contentType;
    const response = await fetch(target, {
      method: 'POST',
      headers,
      body: payload.body,
      signal: requestSignal,
    });
    let payloadJson: OpenAIImageResponse = {};
    try {
      payloadJson = (await response.json()) as OpenAIImageResponse;
    } catch {
      payloadJson = {};
    }
    return { response, payload: payloadJson };
  };

  let { response, payload } = await doFetch(await buildPayload(refs));

  // 多参考被上游明确 400（参数无效）拒绝时降级仅首图，其余靠 prompt 描述。
  if (response.status === 400 && refs.length > 1) {
    console.warn('[laozhang] gpt-image 多参考被上游拒绝(400)，降级仅首图', payload);
    if (req.abortSignal?.aborted) {
      throw new Error('已中断');
    }
    ({ response, payload } = await doFetch(await buildPayload([refs[0]])));
  }

  if (!response.ok) {
    logLaozhangFailure('upstream error', {
      modelId: req.modelId,
      status: response.status,
      size: outboundSize,
      aspectRatio: req.aspectRatio,
      payload,
    });
    throw new Error('老张生图服务暂不可用');
  }

  const items = payload.data ?? [];
  if (items.length === 0) {
    logLaozhangFailure('未返回图片', {
      modelId: req.modelId,
      status: response.status,
      size: outboundSize,
      aspectRatio: req.aspectRatio,
      payload,
    });
    throw new Error('老张生图未返回图片');
  }
  const images = await Promise.all(
    items.map(async (item) => {
      if (item.b64_json) {
        const bytes = decodeBase64Image(item.b64_json);
        return { bytes, mimeType: sniffImageMime(bytes) };
      }
      if (item.url) {
        return downloadImage(item.url, requestSignal);
      }
      throw new Error('老张生图结果格式无效');
    }),
  );
  console.info('[laozhang] gpt-image result', {
    modelId: req.modelId,
    mode: req.mode,
    requestedSize: req.size ?? '默认',
    outboundSize,
    aspectRatio: req.aspectRatio ?? IMAGE_ASPECT_RATIO_AUTO,
    quality: quality ?? '默认',
    refs: refs.length,
    dimensions: images.map((image) => readImageDimensions(image.bytes) ?? null),
  });
  return { images };
}

export const laozhangProvider: ImageProvider = {
  id: 'laozhang',
  async generate(req: ImageGenerateRequest): Promise<ImageGenerateResult> {
    const apiKey = requireEnv('LAOZHANG_API_KEY');
    const baseURL = requireEnv('LAOZHANG_BASE_URL').replace(/\/$/, '');
    const spec = getImageSpec(req.modelId);

    // gpt-image 等 OpenAI 通道模型：走 /v1/images/generations 与 /v1/images/edits，
    // 与下方 Gemini generateContent 路径（档位串 imageSize、inline_data）是两套载荷/响应。
    if (OPENAI_IMAGE_MODELS.has(req.modelId)) {
      return generateOpenAIImage(req, apiKey, baseURL, spec);
    }

    // Gemini native generateContent 支持 imageSize 档位串（1K/2K/4K），按模型声明直传而非换算 WxH。
    // 仅发送白名单内的比例；'auto' / 未指定 / 非枚举比例 → 省略 aspectRatio，交由模型自选。
    const ratio =
      req.aspectRatio &&
      req.aspectRatio !== IMAGE_ASPECT_RATIO_AUTO &&
      SUPPORTED_ASPECT_RATIOS.includes(req.aspectRatio)
        ? req.aspectRatio
        : undefined;

    // imageSize 仅认模型登记的档位串；WxH 或未知值回退到模型默认档位。
    const imageSize = resolveOutboundImageSize(req.size, undefined, spec);

    // 生成/改图统一：参考图逐个追加 inline_data 段（Gemini generateContent 支持多图输入），无则仅文本。
    // req.mode 已由 router 按能力校验；edit 才带上参考图，generate 保持纯文本。
    const refs = req.mode === 'edit' ? (req.referenceImageDataUrls ?? []) : [];
    const requestSignal = createRequestAbortSignal(req.abortSignal);

    const buildBody = async (sources: string[]) => {
      const parts: GeminiRequestPart[] = [{ text: buildImagePrompt(req.prompt, req.transparent) }];
      for (const reference of sources) {
        parts.push({ inline_data: await toInlineData(reference) });
      }
      return {
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            ...(ratio ? { aspectRatio: ratio } : {}),
            imageSize,
            ...(req.transparent ? { imageType: 'image/png' } : {}),
          },
        },
      };
    };

    const doFetch = async (candidateBody: unknown) => {
      const response = await fetch(`${baseURL}/models/${req.modelId}:generateContent`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(candidateBody),
        // 生图耗时长，显式设置 5 分钟超时；signal 复用 requestSignal，避免缺省 fetch 无限等待。
        signal: requestSignal,
      });
      let payload: GeminiGenerateResponse = {};
      try {
        payload = (await response.json()) as GeminiGenerateResponse;
      } catch {
        payload = {};
      }
      return { response, payload };
    };

    let { response, payload } = await doFetch(await buildBody(refs));

    // 默认模型多图输入能力未验证：上游 400 拒绝（不支持多 inline_data）时降级仅首图重试，其余靠 prompt 描述。
    if (response.status === 400 && refs.length > 1) {
      console.warn('[laozhang] 多参考被上游拒绝(400)，降级仅首图', payload);
      if (req.abortSignal?.aborted) {
        throw new Error('已中断');
      }
      ({ response, payload } = await doFetch(await buildBody([refs[0]])));
    }

    if (!response.ok) {
      logLaozhangFailure('upstream error', {
        modelId: req.modelId,
        status: response.status,
        size: imageSize,
        aspectRatio: ratio,
        payload: summarizeGeminiFailurePayload(payload),
      });
      throw new Error('老张生图服务暂不可用');
    }

    const image = extractGeminiImage(payload);
    if (!image) {
      logLaozhangFailure('未返回图片', {
        modelId: req.modelId,
        status: response.status,
        size: imageSize,
        aspectRatio: ratio,
        payload: summarizeGeminiFailurePayload(payload),
      });
      throw new Error('老张生图未返回图片');
    }

    return { images: [image] };
  },
};
