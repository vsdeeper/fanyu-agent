import { serveDesignDoc } from '@/app/api/docs/_server/serve-asset';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  context: { params: Promise<{ chatId: string; assetId: string }> },
) {
  try {
    const { chatId, assetId } = await context.params;
    return serveDesignDoc(chatId, assetId);
  } catch (err) {
    console.error('[GET /api/docs]', err);
    return new Response('Not Found', { status: 404 });
  }
}
