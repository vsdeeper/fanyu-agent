import { Form, Input } from 'antd';
import ProductDocsUpload from '@/app/studio/_components/ProductDocsUpload';
import StudioImageUpload from '@/app/studio/_components/StudioImageUpload';
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

type AnalyzeFormProps = {
  disabled: boolean;
};

/**
 * 商业分析左栏表单：品牌 Logo、产品精修图、产品资料与产品说明，不含出图参数。
 *
 * 四项都是可选项，能否开始分析由 `hasAnalyzeMaterials` 统一判定。那是「四项至少一项非空」的整表 OR 规则，
 * 挂到任何单个字段上都语义错位，故本表单不写 rules、提交时也不调 validateFields()，
 * 禁用与提示仍由 ControlPanel 的 footer 承担。
 *
 * 两个图片上传必须各带 ariaLabel：StudioImageUpload 的默认值是「上传图片」，同页两个实例会重名。
 */
export default function AnalyzeForm({ disabled }: AnalyzeFormProps) {
  return (
    <>
      <Form.Item name="brandLogo">
        <StudioImageUpload
          label={BRAND_LOGO_LABEL}
          subtitle={BRAND_LOGO_SUBTITLE}
          hint={BRAND_LOGO_HINT}
          ariaLabel={BRAND_LOGO_ARIA_LABEL}
          max={MAX_BRAND_LOGOS}
          disabled={disabled}
        />
      </Form.Item>
      <Form.Item name="images">
        <StudioImageUpload
          label={PRODUCT_IMAGE_LABEL}
          subtitle={PRODUCT_IMAGE_SUBTITLE}
          disabled={disabled}
        />
      </Form.Item>
      <Form.Item name="documents">
        <ProductDocsUpload hint={PRODUCT_DOCS_HINT} disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="productDescription"
        label={PRODUCT_DESCRIPTION_LABEL}
        extra={PRODUCT_DESCRIPTION_HINT}
      >
        <Input.TextArea
          autoSize={{ minRows: 4, maxRows: 8 }}
          placeholder={PRODUCT_DESCRIPTION_PLACEHOLDER}
          aria-label={PRODUCT_DESCRIPTION_LABEL}
        />
      </Form.Item>
    </>
  );
}
