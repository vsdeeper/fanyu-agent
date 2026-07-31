import { handleRegeoPost } from '@/lib/geo/handle-regeo';

export async function POST(req: Request) {
  return handleRegeoPost(req);
}
