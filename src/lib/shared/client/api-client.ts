import 'client-only';

import { getAntdMessage } from './antd-message';

const API_OK = 0;

/** 客户端兜底文案：勿把 err.message / 服务端 stack 直接展示给用户 */
const FALLBACK_REQUEST_ERROR = '请求失败，请稍后重试';
const NETWORK_ERROR = '网络连接失败，请稍后重试';
const PARSE_ERROR = '响应格式错误';

type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T | null;
};

/** 客户端请求错误，携带业务码（若有） */
export class ApiClientError extends Error {
  code?: number;
  status?: number;

  constructor(msg: string, code?: number, status?: number) {
    super(msg);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}

export type ApiRequestInit = RequestInit & { silent?: boolean };

async function parseApiEnvelope<T>(res: Response): Promise<T> {
  let body: ApiEnvelope<T>;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiClientError(PARSE_ERROR, undefined, res.status);
  }

  if (body.code !== API_OK) {
    throw new ApiClientError(body.message || FALLBACK_REQUEST_ERROR, body.code, res.status);
  }

  return body.data as T;
}

function notifyError(err: unknown, silent?: boolean): never {
  const apiErr =
    err instanceof ApiClientError
      ? err
      : err instanceof TypeError
        ? new ApiClientError(NETWORK_ERROR)
        : new ApiClientError(FALLBACK_REQUEST_ERROR);

  // 修复：原始错误仅打日志，Toast 只用 apiErr.message，避免透传英文 stack / provider 原文
  if (!(err instanceof ApiClientError)) {
    console.error('[api-client]', err);
  }

  if (!silent) {
    getAntdMessage().error(apiErr.message);
  }

  throw apiErr;
}

/** 统一 JSON API 请求：解析信封、Toast 错误、抛出 ApiClientError */
export async function apiRequest<T>(input: string, init?: ApiRequestInit): Promise<T> {
  const { silent, ...fetchInit } = init ?? {};

  try {
    const res = await fetch(input, fetchInit);
    return await parseApiEnvelope<T>(res);
  } catch (err) {
    notifyError(err, silent);
  }
}

export function apiGet<T>(url: string, init?: ApiRequestInit): Promise<T> {
  return apiRequest<T>(url, { ...init, method: 'GET' });
}

export function apiPost<T>(url: string, body?: unknown, init?: ApiRequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return apiRequest<T>(url, {
    ...init,
    method: 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiDelete<T>(url: string, init?: ApiRequestInit): Promise<T> {
  return apiRequest<T>(url, { ...init, method: 'DELETE' });
}
