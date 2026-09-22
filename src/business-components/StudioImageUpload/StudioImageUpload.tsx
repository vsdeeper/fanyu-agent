import { CloseOutlined, PictureOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Image, Upload } from 'antd';
import {
  appendLocalUploadItems,
  interceptLocalFiles,
  removeLocalUploadItem,
} from '@/lib/shared/client/upload-items';
import {
  MAX_STUDIO_IMAGES,
  STUDIO_IMAGE_ACCEPT,
  STUDIO_IMAGE_HINT,
  STUDIO_IMAGE_PREVIEW_GROUP_CLASS_NAMES,
  STUDIO_IMAGE_SUBTITLE,
} from './constants';
import type { StudioImageUploadItem } from './types';
import { createStudioImageUploadItem, getStudioImageUploadItemName } from './utils';
import styles from './StudioImageUpload.module.css';

type StudioImageUploadProps = {
  /** 受控值；未传按空列表处理（Form.Item 首帧可能注入 undefined） */
  value?: StudioImageUploadItem[];
  /** 追加与移除都在组件内部完成，只经这一个出口回写 */
  onChange?: (next: StudioImageUploadItem[]) => void;
  disabled?: boolean;
  max?: number;
  label?: string;
  subtitle?: string;
  hint?: string;
  ariaLabel?: string;
  /** 必填红星；label 在组件内部，Form.Item 的 requiredMark 插不进来，故由调用方传入并与 rules 保持一致 */
  required?: boolean;
  /**
   * Form.Item 注入的报错关联，落在真正可聚焦的上传按钮上（挂到外层 section 上，焦点进到按钮时读屏读不到错误）。
   * 不收 aria-invalid：按钮也不支持这个属性。
   */
  id?: string;
  'aria-describedby'?: string;
};

/**
 * 本地图片上传与预览：空态为大虚线投放区，有图后为网格缩略图 + 加号槽，不落盘。
 * 点击缩略图经 Image.PreviewGroup 打开大图预览，可左右切换与缩放。
 * 组件本身不绑定产品/模特语义，label / subtitle / hint / max 均由调用方通过 props 指定。
 */
export default function StudioImageUpload({
  value,
  onChange,
  disabled = false,
  max = MAX_STUDIO_IMAGES,
  label = '产品图',
  subtitle = STUDIO_IMAGE_SUBTITLE,
  hint = STUDIO_IMAGE_HINT,
  ariaLabel = '上传图片',
  required = false,
  id,
  'aria-describedby': ariaDescribedBy,
}: StudioImageUploadProps) {
  const images = value ?? [];
  const remaining = max - images.length;
  const empty = images.length === 0;
  // 红星只是视觉标记（且 aria-hidden），必填语义得进可访问名，读屏才听得到
  const uploadAriaLabel = required ? `${ariaLabel}（必填）` : ariaLabel;

  /** 追加本地文件，超出 max 的部分丢弃。 */
  const appendFiles = (files: File[]) => {
    onChange?.(appendLocalUploadItems(images, files, max, createStudioImageUploadItem));
  };

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <div className={styles.headMain}>
          <span className={styles.headIcon} aria-hidden>
            <PictureOutlined />
          </span>
          <div className={styles.titles}>
            <span className={styles.label}>
              {required ? (
                <span className={styles.requiredMark} aria-hidden>
                  *
                </span>
              ) : null}
              {label}
            </span>
            {subtitle ? <span className={styles.sub}>{subtitle}</span> : null}
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
          beforeUpload={(file, fileList) => interceptLocalFiles(file, fileList, appendFiles)}
        >
          <Button
            type="dashed"
            className={styles.emptyDrop}
            disabled={disabled}
            id={id}
            aria-label={uploadAriaLabel}
            aria-describedby={ariaDescribedBy}
          >
            <span className={styles.emptyIcon} aria-hidden>
              <UploadOutlined />
            </span>
            {hint ? <span className={styles.emptyHint}>{hint}</span> : null}
          </Button>
        </Upload>
      ) : (
        <div className={styles.thumbs}>
          <Image.PreviewGroup
            classNames={STUDIO_IMAGE_PREVIEW_GROUP_CLASS_NAMES}
            preview={{ minScale: 0.5 }}
          >
            {images.map((item) => (
              <div key={item.uid} className={styles.thumb}>
                <Image
                  src={item.previewUrl}
                  alt={getStudioImageUploadItemName(item)}
                  preview={{ mask: '预览' }}
                />
                <button
                  type="button"
                  className={`${styles.mark} ${styles.remove}`}
                  aria-label={`移除 ${getStudioImageUploadItemName(item)}`}
                  disabled={disabled}
                  onClick={() => onChange?.(removeLocalUploadItem(images, item.uid))}
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
              beforeUpload={(file, fileList) => interceptLocalFiles(file, fileList, appendFiles)}
            >
              <Button
                type="dashed"
                className={styles.addSlot}
                disabled={disabled}
                id={id}
                aria-label={uploadAriaLabel}
                aria-describedby={ariaDescribedBy}
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
