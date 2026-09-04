import { CloseOutlined, FileOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { App, Button, Image, Upload } from 'antd';
import { interceptLocalFiles } from '@/business-components/ProductUpload/utils';
import FileCard from '@/components/FileCard';
import {
  DOC_TOO_LARGE_WARNING,
  DOC_TYPE_WARNING,
  MAX_PRODUCT_DOCS,
  MAX_PRODUCT_DOC_BYTES,
  PRODUCT_DOC_ACCEPT,
  PRODUCT_DOC_HINT,
  PRODUCT_DOC_SUBTITLE,
} from './constants';
import type { ProductDocUploadItem } from './types';
import { getProductDocDisplay, isAllowedProductDoc, isImageProductDoc, toDocIcon } from './utils';
import styles from './ProductDocsUpload.module.css';

type ProductDocsUploadProps = {
  documents: ProductDocUploadItem[];
  disabled?: boolean;
  onAppend: (files: File[]) => void;
  onRemove: (uid: string) => void;
};

/**
 * 产品资料本地上传（图片 / PDF / TXT / MD / DOCX，最多 6 个）：空态为虚线投放区，有文件后为卡片或缩略图列表。
 */
export default function ProductDocsUpload({
  documents = [],
  disabled = false,
  onAppend,
  onRemove,
}: ProductDocsUploadProps) {
  const { message } = App.useApp();
  const remaining = MAX_PRODUCT_DOCS - documents.length;
  const empty = documents.length === 0;

  const handleFiles = (files: File[]) => {
    const accepted: File[] = [];
    for (const file of files) {
      if (!isAllowedProductDoc(file)) {
        message.warning(DOC_TYPE_WARNING);
        continue;
      }
      if (file.size > MAX_PRODUCT_DOC_BYTES) {
        message.warning(DOC_TOO_LARGE_WARNING);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length > 0) onAppend(accepted);
  };

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <div className={styles.headMain}>
          <span className={styles.headIcon} aria-hidden>
            <FileOutlined />
          </span>
          <div className={styles.titles}>
            <span className={styles.label}>产品资料</span>
            <span className={styles.sub}>{PRODUCT_DOC_SUBTITLE}</span>
          </div>
        </div>
        <span className={styles.counter}>
          {documents.length}/{MAX_PRODUCT_DOCS}
        </span>
      </div>

      {empty ? (
        <Upload
          className={styles.emptyUpload}
          accept={PRODUCT_DOC_ACCEPT}
          multiple
          disabled={disabled}
          showUploadList={false}
          beforeUpload={(file, fileList) => interceptLocalFiles(file, fileList, handleFiles)}
        >
          <button
            type="button"
            className={styles.emptyDrop}
            disabled={disabled}
            aria-label="上传产品资料"
          >
            <span className={styles.emptyIcon} aria-hidden>
              <UploadOutlined />
            </span>
            <span className={styles.emptyHint}>{PRODUCT_DOC_HINT}</span>
          </button>
        </Upload>
      ) : (
        <div className={styles.list}>
          {documents.map((item) => {
            const display = getProductDocDisplay(item);
            return (
              <div key={item.uid} className={styles.item}>
                {isImageProductDoc(display) ? (
                  <div className={styles.imageRow}>
                    <Image src={item.previewUrl} alt={display.name} preview={false} />
                    <span className={styles.imageName}>{display.name}</span>
                  </div>
                ) : (
                  <FileCard
                    className={styles.card}
                    fileName={display.name}
                    byteSize={display.size}
                    icon={toDocIcon(display.name)}
                    showDownload={false}
                  />
                )}
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`移除 ${display.name}`}
                  disabled={disabled}
                  onClick={() => onRemove(item.uid)}
                >
                  <CloseOutlined />
                </button>
              </div>
            );
          })}
          {remaining > 0 ? (
            <Upload
              accept={PRODUCT_DOC_ACCEPT}
              multiple
              disabled={disabled}
              showUploadList={false}
              beforeUpload={(file, fileList) => interceptLocalFiles(file, fileList, handleFiles)}
              styles={{ trigger: { display: 'block' } }}
            >
              <Button
                className={styles.addBtn}
                type="dashed"
                icon={<PlusOutlined />}
                disabled={disabled}
                block
                aria-label="上传产品资料"
              >
                添加资料
              </Button>
            </Upload>
          ) : null}
        </div>
      )}
    </section>
  );
}
