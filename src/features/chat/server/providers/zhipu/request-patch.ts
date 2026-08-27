export type ZhipuRequestBody = {
  /** OpenAI Responses 专有出站残留，智谱不认，出站前剥离 */
  store?: unknown;
  include?: unknown;
};

/**
 * 修补出站请求体以兼容智谱 Chat Completions；有改动时返回 true。
 */
export function patchZhipuRequestBody(body: ZhipuRequestBody): boolean {
  let patched = false;

  if ('store' in body) {
    delete body.store;
    patched = true;
  }

  if ('include' in body) {
    delete body.include;
    patched = true;
  }

  return patched;
}
