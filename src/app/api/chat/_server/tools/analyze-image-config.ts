/**
 * 专用识图模型 id。ANALYZE_IMAGE_MODEL_ID 已移除；恒返回 null（analyze_image tool 源码暂留但不注册）。
 */
export function getConfiguredAnalyzeImageModelId(): string | null {
  return null;
}
