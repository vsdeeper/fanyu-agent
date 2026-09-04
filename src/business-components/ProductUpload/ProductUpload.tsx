import { CloseOutlined, PictureOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Image, Upload } from 'antd';
import {
  MAX_PRODUCT_IMAGES,
  PRODUCT_IMAGE_ACCEPT,
  UPLOAD_HINT,
  UPLOAD_SUBTITLE,
} from './constants';
import type { ProductUploadItem } from './types';
import { getProductUploadItemName, interceptLocalFiles } from './utils';
import styles from './ProductUpload.module.css';

type ProductUploadProps = {
  images: ProductUploadItem[];
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
 */
export default function ProductUpload({
  images,
  disabled = false,
  onAppend,
  onRemove,
  max = MAX_PRODUCT_IMAGES,
  label = '产品图',
  subtitle = UPLOAD_SUBTITLE,
  hint = UPLOAD_HINT,
  ariaLabel = '上传产品图',
}: ProductUploadProps) {
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
          accept={PRODUCT_IMAGE_ACCEPT}
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
          {images.map((item, index) => (
            <div key={item.uid} className={styles.thumb}>
              <Image src={item.previewUrl} alt={getProductUploadItemName(item)} preview={false} />
              <span className={`${styles.mark} ${styles.index}`}>{index + 1}</span>
              <button
                type="button"
                className={`${styles.mark} ${styles.remove}`}
                aria-label={`移除 ${getProductUploadItemName(item)}`}
                disabled={disabled}
                onClick={() => onRemove(item.uid)}
              >
                <CloseOutlined />
              </button>
            </div>
          ))}
          {remaining > 0 ? (
            <Upload
              className={styles.addUpload}
              accept={PRODUCT_IMAGE_ACCEPT}
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
