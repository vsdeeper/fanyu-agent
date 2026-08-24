import { generateText } from 'ai';
import { z } from 'zod';

import { getArkClient } from '@/features/chat/server/providers/ark/client';

/**
 * 视觉分析模块：调火山方舟视觉模型（Chat Completions）分析图片，输出结构化中文描述。
 * 供 analyze_image 工具调用；失败一律返回 { ok:false, error }，绝不向主对话链路抛错。
 */

/** 当前识图模型；换接入点改此处（与生图 CURRENT_IMAGE_MODEL_ID 一样写死，不走环境变量） */
export const CURRENT_VISION_MODEL_ID = 'doubao-seed-2-0-lite-260428';

/** 当前识图模型 ID */
export function getVisionModelId(): string {
  return CURRENT_VISION_MODEL_ID;
}

/** 图片体积上限（解码后字节数）：前端附件上限 10MB，base64 后约 13.4MB；20MB 覆盖两类来源且留余量 */
export const MAX_VISION_IMAGE_BYTES = 20 * 1024 * 1024;

/** 视觉分析结果 zod schema（v4），容错模型输出 */
export const visionAnalysisSchema = z.object({
  imageType: z.string().describe('图片类型（照片/插画/截图/海报/UI设计图/图表等）'),
  summary: z.string().describe('一句话内容概括'),
  subject: z.string().describe('主体内容'),
  background: z.string().describe('背景内容'),
  text: z.string().describe('图中全部可见文字；无文字填"无"'),
  objects: z.array(z.string()).default([]).describe('主要物体/元素数组'),
  colors: z.string().describe('整体色调'),
  composition: z.string().describe('构图与布局'),
  style: z.string().describe('风格'),
  qualityNote: z.string().describe('清晰度与异常说明（模糊/低清/旋转/裁剪等）；正常填"无"'),
});

export type VisionAnalysis = z.infer<typeof visionAnalysisSchema>;

export type VisionAnalyzeResult =
  { ok: true; analysis: VisionAnalysis } | { ok: false; error: string };

/** 要求纯 JSON、全中文输出的视觉分析指令 */
const VISION_INSTRUCTIONS = `你是图片分析助手。仔细观察图片，只输出一个 JSON 对象，不要任何其他文字、解释或代码块，字段如下：
{
  "imageType": "图片类型（照片/插画/截图/海报/UI设计图/图表等）",
  "summary": "一句话内容概括",
  "subject": "主体内容",
  "background": "背景内容",
  "text": "图中全部可见文字；无文字填「无」",
  "objects": ["主要物体/元素，数组"],
  "colors": "整体色调",
  "composition": "构图与布局",
  "style": "风格",
  "qualityNote": "清晰度与异常说明（模糊/低清/旋转/裁剪等）；正常填「无」"
}
若用户提出了具体问题，在 summary 中先针对该问题作答。全部使用中文简体。`;

/** 解析 data:<mediaType>;base64,<data> → 字节与媒体类型；非 base64 视为 percent-encoding 兜底 */
function parseImageDataUrl(dataUrl: string): { bytes: Buffer; mediaType: string } | null {
  const comma = dataUrl.indexOf(',');
  if (comma === -1) return null;
  const meta = dataUrl.slice(0, comma);
  const data = dataUrl.slice(comma + 1);
  const mimeMatch = /^data:([^;]+)/.exec(meta);
  if (!mimeMatch) return null;
  try {
    const bytes = meta.endsWith(';base64')
      ? Buffer.from(data, 'base64')
      : Buffer.from(decodeURIComponent(data), 'utf-8');
    return { bytes, mediaType: mimeMatch[1] };
  } catch {
    return null;
  }
}

/** 提取首个 JSON 对象（容错 markdown 代码块与前后缀文字） */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

/**
 * 调用方舟视觉模型分析图片。dataUrl 支持 data: 前缀的 base64 / percent-encoding。
 * 失败（数据无效/过大/网络/解析）返回 { ok:false, error }，不抛错。
 */
export async function analyzeImage(
  dataUrl: string,
  question?: string,
  abortSignal?: AbortSignal,
): Promise<VisionAnalyzeResult> {
  const parsed = parseImageDataUrl(dataUrl);
  if (!parsed) {
    return { ok: false, error: '图片数据无效' };
  }
  const { bytes, mediaType } = parsed;

  if (bytes.length > MAX_VISION_IMAGE_BYTES) {
    return { ok: false, error: '图片过大，无法分析，请压缩后重试' };
  }

  try {
    const result = await generateText({
      // 方舟 Responses 非流式缺 annotations 会 schema 校验失败，故走 Chat Completions
      model: getArkClient().chat(getVisionModelId()),
      instructions: VISION_INSTRUCTIONS,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: question?.trim() || '请描述这张图片' },
            // v7 推荐 FilePart（ImagePart 已废弃），SDK 内部转 image_url
            { type: 'file', data: bytes, mediaType },
          ],
        },
      ],
      temperature: 0,
      maxOutputTokens: 1024,
      abortSignal,
    });

    const raw = extractJsonObject(result.text);
    if (!raw) {
      return { ok: false, error: '图片分析结果无法解析，请重试' };
    }

    let json: unknown;
    try {
      json = JSON.parse(raw) as unknown;
    } catch {
      return { ok: false, error: '图片分析结果无法解析，请重试' };
    }

    const parsedSchema = visionAnalysisSchema.safeParse(json);
    if (!parsedSchema.success) {
      return { ok: false, error: '图片分析结果无法解析，请重试' };
    }

    return { ok: true, analysis: parsedSchema.data };
  } catch (err) {
    console.error('[analyzeImage]', err);
    return { ok: false, error: '图片分析服务暂不可用，请稍后重试' };
  }
}

/** 把结构化分析结果格式化为中文文本（供 toModelOutput 回喂主模型） */
export function formatVisionAnalysisText(analysis: VisionAnalysis, assetId?: string): string {
  const lines = [
    '图片分析结果：',
    `- 类型：${analysis.imageType}`,
    `- 概括：${analysis.summary}`,
    `- 主体：${analysis.subject}`,
    `- 背景：${analysis.background}`,
    `- 画面文字：${analysis.text}`,
    `- 主要元素：${analysis.objects.length ? analysis.objects.join('、') : '无'}`,
    `- 色调：${analysis.colors}`,
    `- 构图布局：${analysis.composition}`,
    `- 风格：${analysis.style}`,
    `- 说明：${analysis.qualityNote}`,
  ];
  if (assetId) {
    lines.push(
      `- 已分析资产 assetId：${assetId}（改图时可将该 id 放入 generate_image 的 sourceAssetIds）`,
    );
  }
  lines.push(
    '若用户针对图片提问或改图，请基于以上信息用自然语言回答或写 generate_image 的 prompt，勿原样复述本清单。',
  );
  return lines.join('\n');
}
