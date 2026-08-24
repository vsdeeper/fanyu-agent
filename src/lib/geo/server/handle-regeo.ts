import 'server-only';

import { parseRegeoBody } from './parse-request';
import { regeoFromCoordinates } from './regeo';

export async function handleRegeoPost(req: Request): Promise<Response> {
  const parsed = await parseRegeoBody(req);
  if (parsed instanceof Response) {
    return parsed;
  }

  return regeoFromCoordinates(parsed.latitude, parsed.longitude);
}
