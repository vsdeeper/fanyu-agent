import { CloseOutlined, FileOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { App, Button, Upload } from 'antd';
import { useState } from 'react';
import {
  appendLocalUploadItems,
  interceptLocalFiles,
  removeLocalUploadItem,
} from '@/lib/shared/client/upload-items';
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
import {
  createProductDocUploadItem,
  getProductDocDisplay,
  isAllowedProductDoc,
  toDocIcon,
} from './utils';
import styles from './ProductDocsUpload.module.css';

type ProductDocsUploadProps = {
  /** 受控值；未传按空列表处理（Form.Item 首帧可能注入 undefined） */
  value?: ProductDocUploadItem[];
  /** 追加与移除都在组件内部完成，只经这一个出口回写 */
  onChange?: (next: ProductDocUploadItem[]) => void;
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
 * 产品资料 / 商业分析本地上传（TXT / MD）：空态为虚线投放区，有文件后为卡片列表。
 */
export default function ProductDocsUpload({
  value,
  onChange,
  disabled = false,
  max = MAX_PRODUCT_DOCS,
  label = PRODUCT_DOC_LABEL,
  subtitle = PRODUCT_DOC_SUBTITLE,
  hint = PRODUCT_DOC_HINT,
  ariaLabel,
  required = false,
  id,
  'aria-describedby': ariaDescribedBy,
}: ProductDocsUploadProps) {
  const { message } = App.useApp();
  const documents = value ?? [];
  const remaining = max - documents.length;
  const empty = documents.length === 0;
  const multiple = max > 1;
  // 红星只是视觉标记（且 aria-hidden），必填语义得进可访问名，读屏才听得到
  const uploadAriaLabel = required
    ? `${ariaLabel ?? `上传${label}`}（必填）`
    : (ariaLabel ?? `上传${label}`);
  const [previewItem, setPreviewItem] = useState<ProductDocUploadItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  /** 过滤掉类型与体积不合法的文件，其余追加进受控值，超出 max 的部分丢弃。 */
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
    if (accepted.length > 0) {
      onChange?.(appendLocalUploadItems(documents, accepted, max, createProductDocUploadItem));
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <div className={styles.headMain}>
          <span className={styles.headIcon} aria-hidden>
            <FileOutlined />
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
            id={id}
            aria-label={uploadAriaLabel}
            aria-describedby={ariaDescribedBy}
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
                  onClick={() => onChange?.(removeLocalUploadItem(documents, item.uid))}
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
                id={id}
                aria-label={uploadAriaLabel}
                aria-describedby={ariaDescribedBy}
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
