import { requireEnv } from '@/lib/env';
import type { ImageProvider } from '../types';

type ArkImageResponse = {
  data?: Array<{ url?: string; b64_json?: string }>;
  error?: { message?: string };
};

function decodeBase64Image(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

async function downloadImage(url: string): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载生图结果失败: HTTP ${response.status}`);
  }
  const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
  const buffer = await response.arrayBuffer();
  return { bytes: new Uint8Array(buffer), mimeType };
}

export const arkSeedreamProvider: ImageProvider = {
  id: 'ark',
  async generate(req) {
    const apiKey = requireEnv('ARK_API_KEY');
    const baseURL = requireEnv('ARK_BASE_URL').replace(/\/$/, '');

    const body: Record<string, unknown> = {
      model: req.modelId,
      prompt: req.prompt,
      response_format: 'url',
      size: req.size ?? '2K',
      watermark: false,
    };

    // 修复：改图用本地 data URL/base64，勿依赖方舟返回的临时 CDN URL（易过期）
    if (req.mode === 'edit' && req.referenceImageDataUrls?.length) {
      const ref = req.referenceImageDataUrls[0];
      if (ref.startsWith('data:')) {
        body.image = ref;
      } else {
        body.image = ref;
      }
    }

    const response = await fetch(`${baseURL}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as ArkImageResponse;
    if (!response.ok) {
      console.error('[ark-seedream] upstream error', response.status, payload);
      throw new Error('方舟生图服务暂不可用');
    }

    const items = payload.data ?? [];
    if (items.length === 0) {
      throw new Error('方舟生图未返回图片');
    }

    const images = await Promise.all(
      items.map(async (item) => {
        if (item.b64_json) {
          return { bytes: decodeBase64Image(item.b64_json), mimeType: 'image/jpeg' };
        }
        if (item.url) {
          const downloaded = await downloadImage(item.url);
          return downloaded;
        }
        throw new Error('方舟生图结果格式无效');
      }),
    );

    return { images };
  },
};
