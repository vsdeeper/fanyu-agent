import { readFileSync } from 'fs';
import { getAsset, getAssetFilePath } from '@/lib/image-gen/assets';

export const runtime = 'nodejs';

export async function GET(_req: Request, context: { params: Promise<{ assetId: string }> }) {
  try {
    const { assetId } = await context.params;
    if (!assetId?.trim()) {
      return new Response('Not Found', { status: 404 });
    }

    const asset = getAsset(assetId.trim());
    if (!asset) {
      return new Response('Not Found', { status: 404 });
    }

    const filePath = getAssetFilePath(asset);
    const bytes = readFileSync(filePath);

    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': asset.mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('[GET /api/images]', err);
    return new Response('Not Found', { status: 404 });
  }
}
