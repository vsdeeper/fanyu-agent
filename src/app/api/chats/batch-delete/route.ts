import { handleBatchDeleteChats } from '@/app/api/chats/_server/handle-batch-delete';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  return handleBatchDeleteChats(req);
}
