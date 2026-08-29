import { requireEnv } from '@/lib/shared/server/env';
import { buildImagePrompt, decodeBase64Image, downloadImage, sniffImageMime } from '../image-utils';
import type { ImageGenerateRequest, ImageGenerateResult, ImageProvider } from '../../types';
import { getImageSpec, IMAGE_ASPECT_RATIO_AUTO, IMAGE_ASPECT_RATIOS } from '../../image-spec';

/** Gemini generateContent 图片段：请求用 snake `inline_data`，响应可能回 camel `inlineData`，两种都认。 */
type InlineData = { mime_type?: string; mimeType?: string; data?: string };

type GeminiRequestPart = { text?: string; inline_data?: { mime_type?: string; data?: string } };

type GeminiResponsePart = { text?: string; inlineData?: InlineData; inline_data?: InlineData };

type GeminiGenerateResponse = {
  candidates?: Array<{ content?: { parts?: GeminiResponsePart[] } }>;
  error?: { message?: string };
};

/** Gemini imageConfig.aspectRatio 支持的枚举（白名单），非枚举比例直接不发送以免 400。 */
const SUPPORTED_ASPECT_RATIOS = IMAGE_ASPECT_RATIOS as readonly string[];

/**
 * 参考图源 → Gemini inline_data 载荷。
 * 编辑源图恒为 data URL（assetToDataUrl / pastedImageDataUrl），主路径解析出 MIME 与 base64；
 * 兜底下载外链再转 base64。
 */
async function toInlineData(source: string): Promise<{ mime_type?: string; data?: string }> {
  const m = /^data:([^;,]+)?;base64,(.+)$/.exec(source);
  if (m) return { mime_type: m[1] || 'image/jpeg', data: m[2] };
  const { bytes, mimeType } = await downloadImage(source);
  return { mime_type: mimeType, data: Buffer.from(bytes).toString('base64') };
}

/** 从 generateContent 响应取第一张图：遍历 candidates / parts，认 inlineData 或 inline_data。 */
function extractImage(
  payload: GeminiGenerateResponse,
): { bytes: Uint8Array; mimeType: string } | undefined {
  for (const candidate of payload.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      const inline = part.inlineData ?? part.inline_data;
      if (!inline?.data) continue;
      const bytes = decodeBase64Image(inline.data);
      return {
        bytes,
        mimeType: inline.mimeType ?? inline.mime_type ?? sniffImageMime(bytes),
      };
    }
  }
  return undefined;
}

export const laozhangProvider: ImageProvider = {
  id: 'laozhang',
  async generate(req: ImageGenerateRequest): Promise<ImageGenerateResult> {
    const apiKey = requireEnv('LAOZHANG_API_KEY');
    const baseURL = requireEnv('LAOZHANG_BASE_URL').replace(/\/$/, '');
    const spec = getImageSpec(req.modelId);

    // Gemini imageConfig 直传比例串与档位，无需换算成像素宽高（非方舟 WxH 端点）。
    // 仅发送白名单内的比例；'auto' / 未指定 / 非枚举比例 → 省略 aspectRatio，交由模型自选。
    const ratio =
      req.aspectRatio &&
      req.aspectRatio !== IMAGE_ASPECT_RATIO_AUTO &&
      SUPPORTED_ASPECT_RATIOS.includes(req.aspectRatio)
        ? req.aspectRatio
        : undefined;

    // imageSize 仅认档位串（1K/2K/4K…），WxH 或未知值回退到模型默认档位。
    const requestedTier = req.size?.trim().toUpperCase();
    const imageSize =
      spec.presets.find((preset) => preset.toUpperCase() === requestedTier) ?? spec.defaultSize;

    // 生成/改图统一：参考图逐个追加 inline_data 段（Gemini generateContent 支持多图输入），无则仅文本。
    // req.mode 已由 router 按能力校验；edit 才带上参考图，generate 保持纯文本。
    const refs = req.mode === 'edit' ? (req.referenceImageDataUrls ?? []) : [];

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
        // 对齐参照脚本 timeout=180；生图耗时长，缺省 fetch 无超时风险更高。
        signal: req.abortSignal
          ? AbortSignal.any([req.abortSignal, AbortSignal.timeout(180_000)])
          : AbortSignal.timeout(180_000),
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
      console.error('[laozhang] upstream error', response.status, payload);
      throw new Error('老张生图服务暂不可用');
    }

    const image = extractImage(payload);
    if (!image) {
      throw new Error('老张生图未返回图片');
    }

    return { images: [image] };
  },
};
