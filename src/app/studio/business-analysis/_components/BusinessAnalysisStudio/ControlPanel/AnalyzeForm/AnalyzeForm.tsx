import { Input } from 'antd';
import type { ProductDocUploadItem } from '@/business-components/ProductDocsUpload/types';
import type { StudioImageUploadItem } from '@/business-components/StudioImageUpload/types';
import ProductDocsUpload from '@/business-components/ProductDocsUpload';
import StudioImageUpload from '@/business-components/StudioImageUpload';
import { MAX_BRAND_LOGOS } from '../../constants';
import {
  BRAND_LOGO_ARIA_LABEL,
  BRAND_LOGO_HINT,
  BRAND_LOGO_LABEL,
  BRAND_LOGO_SUBTITLE,
  PRODUCT_DESCRIPTION_HINT,
  PRODUCT_DESCRIPTION_LABEL,
  PRODUCT_DESCRIPTION_PLACEHOLDER,
  PRODUCT_DOCS_HINT,
  PRODUCT_IMAGE_LABEL,
  PRODUCT_IMAGE_SUBTITLE,
} from './constants';
import styles from './AnalyzeForm.module.css';

type AnalyzeFormProps = {
  images: StudioImageUploadItem[];
  brandLogo: StudioImageUploadItem[];
  productDescription: string;
  documents: ProductDocUploadItem[];
  disabled: boolean;
  onImagesAppend: (files: File[]) => void;
  onImageRemove: (uid: string) => void;
  onBrandLogoAppend: (files: File[]) => void;
  onBrandLogoRemove: (uid: string) => void;
  onProductDescriptionChange: (value: string) => void;
  onDocsAppend: (files: File[]) => void;
  onDocRemove: (uid: string) => void;
};

/**
 * 商业分析左栏表单：品牌 Logo、产品精修图、产品资料与产品说明，不含出图参数。
 *
 * 四块都是可选项，能否开始分析由 `hasAnalyzeMaterials` 统一判定；两个图片上传必须各带 ariaLabel，
 * StudioImageUpload 的默认值是「上传图片」，同页两个实例会重名。
 */
export default function AnalyzeForm({
  images,
  brandLogo,
  productDescription,
  documents,
  disabled,
  onImagesAppend,
  onImageRemove,
  onBrandLogoAppend,
  onBrandLogoRemove,
  onProductDescriptionChange,
  onDocsAppend,
  onDocRemove,
}: AnalyzeFormProps) {
  return (
    <>
      <StudioImageUpload
        label={BRAND_LOGO_LABEL}
        subtitle={BRAND_LOGO_SUBTITLE}
        hint={BRAND_LOGO_HINT}
        ariaLabel={BRAND_LOGO_ARIA_LABEL}
        images={brandLogo}
        max={MAX_BRAND_LOGOS}
        disabled={disabled}
        onAppend={onBrandLogoAppend}
        onRemove={onBrandLogoRemove}
      />
      <StudioImageUpload
        label={PRODUCT_IMAGE_LABEL}
        subtitle={PRODUCT_IMAGE_SUBTITLE}
        images={images}
        disabled={disabled}
        onAppend={onImagesAppend}
        onRemove={onImageRemove}
      />
      <ProductDocsUpload
        documents={documents}
        hint={PRODUCT_DOCS_HINT}
        disabled={disabled}
        onAppend={onDocsAppend}
        onRemove={onDocRemove}
      />
      <label className={styles.field}>
        <span className={styles.label}>{PRODUCT_DESCRIPTION_LABEL}</span>
        <Input.TextArea
          value={productDescription}
          disabled={disabled}
          autoSize={{ minRows: 4, maxRows: 8 }}
          placeholder={PRODUCT_DESCRIPTION_PLACEHOLDER}
          aria-label={PRODUCT_DESCRIPTION_LABEL}
          onChange={(event) => onProductDescriptionChange(event.target.value)}
        />
        <span className={styles.hint}>{PRODUCT_DESCRIPTION_HINT}</span>
      </label>
    </>
  );
}
