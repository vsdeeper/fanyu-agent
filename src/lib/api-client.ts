'use client';

import { message } from 'antd';

const API_OK = 0;

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
    throw new ApiClientError('响应格式错误', undefined, res.status);
  }

  if (body.code !== API_OK) {
    throw new ApiClientError(body.message || '请求失败', body.code, res.status);
  }

  return body.data as T;
}

function notifyError(err: unknown, silent?: boolean): never {
  const apiErr =
    err instanceof ApiClientError
      ? err
      : err instanceof TypeError
        ? new ApiClientError('网络连接失败，请稍后重试')
        : new ApiClientError(err instanceof Error ? err.message : '请求失败');

  if (!silent) {
    message.error(apiErr.message);
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
