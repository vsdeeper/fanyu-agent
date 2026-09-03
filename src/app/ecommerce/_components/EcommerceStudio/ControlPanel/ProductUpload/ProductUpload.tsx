import { CloseOutlined, PictureOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Image, Upload } from 'antd';
import {
  MAX_PRODUCT_IMAGES,
  PRODUCT_IMAGE_ACCEPT,
  UPLOAD_HINT,
  UPLOAD_SUBTITLE,
} from '../../constants';
import type { ProductImageItem } from '../../types';
import { interceptLocalFiles } from './utils';
import styles from './ProductUpload.module.css';

type ProductUploadProps = {
  images: ProductImageItem[];
  disabled?: boolean;
  onAppend: (files: File[]) => void;
  onRemove: (uid: string) => void;
};

/**
 * 产品图本地上传与预览（最多 6 张）：空态为大虚线投放区，有图后为网格缩略图 + 加号槽，不落盘。
 */
export default function ProductUpload({
  images,
  disabled = false,
  onAppend,
  onRemove,
}: ProductUploadProps) {
  const remaining = MAX_PRODUCT_IMAGES - images.length;
  const empty = images.length === 0;

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <div className={styles.headMain}>
          <span className={styles.headIcon} aria-hidden>
            <PictureOutlined />
          </span>
          <div className={styles.titles}>
            <span className={styles.label}>产品图</span>
            <span className={styles.sub}>{UPLOAD_SUBTITLE}</span>
          </div>
        </div>
        <span className={styles.counter}>
          {images.length}/{MAX_PRODUCT_IMAGES}
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
          <button
            type="button"
            className={styles.emptyDrop}
            disabled={disabled}
            aria-label="上传产品图"
          >
            <span className={styles.emptyIcon} aria-hidden>
              <UploadOutlined />
            </span>
            <span className={styles.emptyHint}>{UPLOAD_HINT}</span>
          </button>
        </Upload>
      ) : (
        <div className={styles.thumbs}>
          {images.map((item, index) => (
            <div key={item.uid} className={styles.thumb}>
              <Image src={item.previewUrl} alt={item.file.name} preview={false} />
              <span className={`${styles.mark} ${styles.index}`}>{index + 1}</span>
              <button
                type="button"
                className={`${styles.mark} ${styles.remove}`}
                aria-label={`移除 ${item.file.name}`}
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
              <button
                type="button"
                className={styles.addSlot}
                disabled={disabled}
                aria-label="上传产品图"
              >
                <PlusOutlined />
              </button>
            </Upload>
          ) : null}
        </div>
      )}
    </section>
  );
}
