import { handleRegeoPost } from '@/lib/geo/server/handle-regeo';

export async function POST(req: Request) {
  return handleRegeoPost(req);
}
