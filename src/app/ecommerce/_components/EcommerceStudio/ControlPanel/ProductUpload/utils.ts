/**
 * antd Upload `beforeUpload` 会对每个文件回调一次；只在首个文件时取出整批，避免重复追加。
 */
export function filesFromBeforeUpload(file: File, fileList: File[]): File[] {
  return file === fileList[0] ? [...fileList] : [];
}

/**
 * 拦截本地选中文件交给 onAppend，并始终阻止 antd 默认上传。
 */
export function interceptLocalFiles(
  file: File,
  fileList: File[],
  onAppend: (files: File[]) => void,
): false {
  const files = filesFromBeforeUpload(file, fileList);
  if (files.length > 0) {
    onAppend(files);
  }
  return false;
}
