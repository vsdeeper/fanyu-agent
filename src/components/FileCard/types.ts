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
  /** 仅 ready 且有值时渲染下载图标 */
  href?: string;
  /** 仅 ready 生效；未传则卡片主体点击为空操作 */
  onPreview?: () => void;
  className?: string;
};
