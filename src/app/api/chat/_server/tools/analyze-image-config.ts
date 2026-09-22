/**
 * 已配置返回 trim 后的识图模型 id；未设置或空串返回 null → 不启用专用识图 tool。
 * 与 IMAGE_MODEL_ID 同为可空语义，勿用 requireEnv。
 */
export function getConfiguredAnalyzeImageModelId(): string | null {
  return process.env.ANALYZE_IMAGE_MODEL_ID?.trim() || null;
}
