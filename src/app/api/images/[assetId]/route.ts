import { serveImageAsset } from '@/app/api/images/_server/serve-asset';

export const runtime = 'nodejs';

export async function GET(_req: Request, context: { params: Promise<{ assetId: string }> }) {
  try {
    const { assetId } = await context.params;
    return serveImageAsset(assetId);
  } catch (err) {
    console.error('[GET /api/images]', err);
    return new Response('Not Found', { status: 404 });
  }
}
