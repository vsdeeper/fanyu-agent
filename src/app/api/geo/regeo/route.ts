import { handleRegeoPost } from '@/app/api/geo/_server/handle-regeo';

export async function POST(req: Request) {
  return handleRegeoPost(req);
}
