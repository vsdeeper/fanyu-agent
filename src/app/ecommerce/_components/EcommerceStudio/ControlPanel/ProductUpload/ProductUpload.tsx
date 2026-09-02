import { CloudUploadOutlined, CloseOutlined } from '@ant-design/icons';
import { Button, Image, Upload } from 'antd';
import {
  MAX_PRODUCT_IMAGES,
  PRODUCT_IMAGE_ACCEPT,
  RETOUCH_HINT,
  UPLOAD_HINT,
} from '../../constants';
import type { ProductImageItem } from '../../types';
import { notifyComingSoon } from '../../utils';
import styles from './ProductUpload.module.css';

type ProductUploadProps = {
  images: ProductImageItem[];
  onAppend: (files: File[]) => void;
  onRemove: (uid: string) => void;
};

/**
 * 产品图本地上传与预览（最多 6 张），不落盘。
 */
export default function ProductUpload({ images, onAppend, onRemove }: ProductUploadProps) {
  const remaining = MAX_PRODUCT_IMAGES - images.length;

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <span className={styles.label}>产品图</span>
        <span className={styles.counter}>
          {images.length}/{MAX_PRODUCT_IMAGES}
        </span>
      </div>

      {images.length > 0 ? (
        <div className={styles.thumbs}>
          {images.map((item) => (
            <div key={item.uid} className={styles.thumb}>
              <Image src={item.previewUrl} alt={item.file.name} preview={false} />
              <Button
                className={styles.remove}
                type="text"
                size="small"
                shape="circle"
                aria-label={`移除 ${item.file.name}`}
                icon={<CloseOutlined />}
                onClick={() => onRemove(item.uid)}
              />
            </div>
          ))}
        </div>
      ) : null}

      {remaining > 0 ? (
        <Upload.Dragger
          className={styles.dropzone}
          accept={PRODUCT_IMAGE_ACCEPT}
          multiple
          showUploadList={false}
          beforeUpload={(file, fileList) => {
            const files = file === fileList[0] ? [...fileList] : [];
            if (files.length > 0) onAppend(files);
            return false;
          }}
        >
          <div className={styles.dropInner}>
            <CloudUploadOutlined className={styles.dropIcon} />
            <p className={styles.dropHint}>{UPLOAD_HINT}</p>
          </div>
        </Upload.Dragger>
      ) : null}

      <Button type="link" className={styles.retouch} onClick={notifyComingSoon}>
        {RETOUCH_HINT}
      </Button>
    </section>
  );
}
