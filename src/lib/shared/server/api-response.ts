export type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T | null;
};

export const API_OK = 0 as const;

/** 业务错误码：按模块分段，便于后续对外 Open API */
export const ApiErrorCode = {
  INVALID_PARAMS: 40001,
  CHAT_NOT_FOUND: 40401,
  TASK_NOT_FOUND: 40402,
  INTERNAL_ERROR: 50001,
  AMAP_UPSTREAM: 50201,
  AMAP_NOT_CONFIGURED: 50301,
  ARK_NOT_CONFIGURED: 50302,
} as const;

const OK_MESSAGE = 'ok';

export function jsonOk<T>(data: T, init?: ResponseInit): Response {
  const body: ApiEnvelope<T> = {
    code: API_OK,
    message: OK_MESSAGE,
    data,
  };
  return Response.json(body, init);
}

export function jsonFail(
  code: number,
  message: string,
  status: number,
  init?: ResponseInit,
): Response {
  const body: ApiEnvelope<null> = {
    code,
    message,
    data: null,
  };
  return Response.json(body, { ...init, status });
}

/** 解析 JSON API 信封；code !== 0 时抛 Error(message) */
export async function readApiData<T>(res: Response): Promise<T> {
  const body = (await res.json()) as ApiEnvelope<T>;
  if (body.code !== API_OK) {
    throw new Error(body.message || '请求失败');
  }
  return body.data as T;
}
