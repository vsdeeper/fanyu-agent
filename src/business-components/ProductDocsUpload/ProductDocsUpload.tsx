import { CloseOutlined, FileOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { App, Button, Upload } from 'antd';
import { useState } from 'react';
import { interceptLocalFiles } from '@/business-components/StudioImageUpload/utils';
import FileCard from '@/components/FileCard';
import ProductDocPreview from './ProductDocPreview';
import {
  DOC_TOO_LARGE_WARNING,
  DOC_TYPE_WARNING,
  MAX_PRODUCT_DOCS,
  MAX_PRODUCT_DOC_BYTES,
  PRODUCT_DOC_ACCEPT,
  PRODUCT_DOC_HINT,
  PRODUCT_DOC_LABEL,
  PRODUCT_DOC_SUBTITLE,
} from './constants';
import type { ProductDocUploadItem } from './types';
import { getProductDocDisplay, isAllowedProductDoc, toDocIcon } from './utils';
import styles from './ProductDocsUpload.module.css';

type ProductDocsUploadProps = {
  documents: ProductDocUploadItem[];
  disabled?: boolean;
  max?: number;
  label?: string;
  subtitle?: string;
  hint?: string;
  ariaLabel?: string;
  onAppend: (files: File[]) => void;
  onRemove: (uid: string) => void;
};

/**
 * 产品资料 / 商业分析本地上传（TXT / MD）：空态为虚线投放区，有文件后为卡片列表。
 */
export default function ProductDocsUpload({
  documents = [],
  disabled = false,
  max = MAX_PRODUCT_DOCS,
  label = PRODUCT_DOC_LABEL,
  subtitle = PRODUCT_DOC_SUBTITLE,
  hint = PRODUCT_DOC_HINT,
  ariaLabel,
  onAppend,
  onRemove,
}: ProductDocsUploadProps) {
  const { message } = App.useApp();
  const remaining = max - documents.length;
  const empty = documents.length === 0;
  const multiple = max > 1;
  const uploadAriaLabel = ariaLabel ?? `上传${label}`;
  const [previewItem, setPreviewItem] = useState<ProductDocUploadItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

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
            <span className={styles.label}>{label}</span>
            <span className={styles.sub}>{subtitle}</span>
          </div>
        </div>
        <span className={styles.counter}>
          {documents.length}/{max}
        </span>
      </div>

      {empty ? (
        <Upload
          className={styles.emptyUpload}
          accept={PRODUCT_DOC_ACCEPT}
          multiple={multiple}
          disabled={disabled}
          showUploadList={false}
          beforeUpload={(file, fileList) => interceptLocalFiles(file, fileList, handleFiles)}
        >
          <button
            type="button"
            className={styles.emptyDrop}
            disabled={disabled}
            aria-label={uploadAriaLabel}
          >
            <span className={styles.emptyIcon} aria-hidden>
              <UploadOutlined />
            </span>
            <span className={styles.emptyHint}>{hint}</span>
          </button>
        </Upload>
      ) : (
        <div className={styles.list}>
          {documents.map((item) => {
            const display = getProductDocDisplay(item);
            return (
              <div key={item.uid} className={styles.item}>
                <FileCard
                  className={styles.card}
                  fileName={display.name}
                  byteSize={display.size}
                  icon={toDocIcon(display.name)}
                  showDownload={false}
                  onPreview={() => {
                    setPreviewItem(item);
                    setPreviewOpen(true);
                  }}
                />
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
              multiple={multiple}
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
                aria-label={uploadAriaLabel}
              >
                添加资料
              </Button>
            </Upload>
          ) : null}
        </div>
      )}

      <ProductDocPreview
        key={previewItem?.uid ?? 'none'}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        item={previewItem}
      />
    </section>
  );
}
