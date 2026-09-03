import type { ReactNode } from 'react';

export type FileCardStatus = 'ready' | 'failed' | 'loading';

export type FileCardProps = {
  /** 默认 ready；loading 只渲染骨架，failed 为静态失败卡 */
  status?: FileCardStatus;
  /** loading 可不传；ready / failed 用于标题 */
  fileName?: string;
  icon?: ReactNode;
  /** 字节数；与扩展名一起拼副标题，如 MD 8.43KB */
  byteSize?: number;
  /** 下载地址；仅 ready 且有值时下载按钮可点击 */
  href?: string;
  /** 是否显示下载按钮，默认显示 */
  showDownload?: boolean;
  /** 仅 ready 生效；未传则卡片主体不可预览 */
  onPreview?: () => void;
  className?: string;
};
