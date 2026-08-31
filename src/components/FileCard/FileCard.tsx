import { DownloadOutlined } from '@ant-design/icons';
import { Skeleton } from 'antd';
import { FILE_CARD_SKELETON_STYLE } from './constants';
import styles from './FileCard.module.css';
import type { FileCardProps } from './types';
import {
  bindPreviewClick,
  formatFileMeta,
  handleDownloadClick,
  handlePreviewKeyDown,
} from './utils';

export type { FileCardProps, FileCardStatus } from './types';

/**
 * 通用文件卡片：就绪态点主体预览、点图标下载；失败静态展示；加载中为骨架屏。
 */
export default function FileCard({
  status = 'ready',
  fileName,
  icon,
  byteSize,
  href,
  onPreview,
  className,
}: FileCardProps) {
  if (status === 'loading') {
    return <Skeleton.Input active size="large" style={FILE_CARD_SKELETON_STYLE} />;
  }

  const isFailed = status === 'failed';
  const isReady = status === 'ready';
  const canPreview = isReady && Boolean(onPreview);
  const meta = formatFileMeta(fileName, byteSize);

  return (
    <div
      className={`${styles.card}${isFailed ? ` ${styles.failed}` : ''}${className ? ` ${className}` : ''}`}
    >
      <div
        className={`${styles.body}${canPreview ? ` ${styles.previewable}` : ''}`}
        onClick={bindPreviewClick(status, onPreview)}
        onKeyDown={
          isReady && onPreview
            ? (event) => {
                handlePreviewKeyDown(event, onPreview);
              }
            : undefined
        }
        role={isReady && onPreview ? 'button' : undefined}
        tabIndex={isReady && onPreview ? 0 : undefined}
      >
        {icon ? <span className={styles.icon}>{icon}</span> : null}
        <div className={styles.meta}>
          {fileName ? <div className={styles.name}>{fileName}</div> : null}
          {meta ? <div className={styles.hint}>{meta}</div> : null}
        </div>
      </div>
      {isReady && href ? (
        <a
          className={styles.download}
          href={href}
          download={fileName}
          aria-label={`下载 ${fileName ?? ''}`.trim()}
          onClick={handleDownloadClick}
        >
          <DownloadOutlined />
        </a>
      ) : null}
    </div>
  );
}
