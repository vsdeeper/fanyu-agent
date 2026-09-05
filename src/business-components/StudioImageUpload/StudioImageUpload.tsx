import { CloseOutlined, PictureOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Image, Upload } from 'antd';
import {
  MAX_STUDIO_IMAGES,
  STUDIO_IMAGE_ACCEPT,
  STUDIO_IMAGE_HINT,
  STUDIO_IMAGE_PREVIEW_GROUP_CLASS_NAMES,
  STUDIO_IMAGE_SUBTITLE,
} from './constants';
import type { StudioImageUploadItem } from './types';
import { getStudioImageUploadItemName, interceptLocalFiles } from './utils';
import styles from './StudioImageUpload.module.css';

type StudioImageUploadProps = {
  images: StudioImageUploadItem[];
  disabled?: boolean;
  onAppend: (files: File[]) => void;
  onRemove: (uid: string) => void;
  max?: number;
  label?: string;
  subtitle?: string;
  hint?: string;
  ariaLabel?: string;
};

/**
 * 本地图片上传与预览：空态为大虚线投放区，有图后为网格缩略图 + 加号槽，不落盘。
 * 点击缩略图经 Image.PreviewGroup 打开大图预览，可左右切换与缩放。
 * 组件本身不绑定产品/模特语义，label / subtitle / hint / max 均由调用方通过 props 指定。
 */
export default function StudioImageUpload({
  images,
  disabled = false,
  onAppend,
  onRemove,
  max = MAX_STUDIO_IMAGES,
  label = '产品图',
  subtitle = STUDIO_IMAGE_SUBTITLE,
  hint = STUDIO_IMAGE_HINT,
  ariaLabel = '上传图片',
}: StudioImageUploadProps) {
  const remaining = max - images.length;
  const empty = images.length === 0;

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <div className={styles.headMain}>
          <span className={styles.headIcon} aria-hidden>
            <PictureOutlined />
          </span>
          <div className={styles.titles}>
            <span className={styles.label}>{label}</span>
            <span className={styles.sub}>{subtitle}</span>
          </div>
        </div>
        <span className={styles.counter}>
          {images.length}/{max}
        </span>
      </div>

      {empty ? (
        <Upload
          className={styles.emptyUpload}
          accept={STUDIO_IMAGE_ACCEPT}
          multiple
          disabled={disabled}
          showUploadList={false}
          beforeUpload={(file, fileList) => interceptLocalFiles(file, fileList, onAppend)}
        >
          <Button
            type="dashed"
            className={styles.emptyDrop}
            disabled={disabled}
            aria-label={ariaLabel}
          >
            <span className={styles.emptyIcon} aria-hidden>
              <UploadOutlined />
            </span>
            <span className={styles.emptyHint}>{hint}</span>
          </Button>
        </Upload>
      ) : (
        <div className={styles.thumbs}>
          <Image.PreviewGroup classNames={STUDIO_IMAGE_PREVIEW_GROUP_CLASS_NAMES}>
            {images.map((item, index) => (
              <div key={item.uid} className={styles.thumb}>
                <Image
                  src={item.previewUrl}
                  alt={getStudioImageUploadItemName(item)}
                  preview={{ mask: '预览' }}
                />
                <span className={`${styles.mark} ${styles.index}`}>{index + 1}</span>
                <button
                  type="button"
                  className={`${styles.mark} ${styles.remove}`}
                  aria-label={`移除 ${getStudioImageUploadItemName(item)}`}
                  disabled={disabled}
                  onClick={() => onRemove(item.uid)}
                >
                  <CloseOutlined />
                </button>
              </div>
            ))}
          </Image.PreviewGroup>
          {remaining > 0 ? (
            <Upload
              className={styles.addUpload}
              accept={STUDIO_IMAGE_ACCEPT}
              multiple
              disabled={disabled}
              showUploadList={false}
              beforeUpload={(file, fileList) => interceptLocalFiles(file, fileList, onAppend)}
            >
              <Button
                type="dashed"
                className={styles.addSlot}
                disabled={disabled}
                aria-label={ariaLabel}
              >
                <PlusOutlined />
              </Button>
            </Upload>
          ) : null}
        </div>
      )}
    </section>
  );
}
