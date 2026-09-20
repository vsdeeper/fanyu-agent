import { HighlightOutlined } from '@ant-design/icons';
import { Button, Form, type FormInstance } from 'antd';
import { ANALYZE_BUTTON, NO_MATERIAL_WARNING } from '../constants';
import type { AnalysisPanelValues } from '../types';
import { hasAnalyzeMaterials } from '../utils';
import AnalyzeForm from './AnalyzeForm';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  form: FormInstance<AnalysisPanelValues>;
  initialValues: AnalysisPanelValues;
  analyzing: boolean;
  formLocked: boolean;
  onAnalyze: () => void;
};

/** 商业分析工作台左侧栏：品牌 Logo、产品图、产品资料、产品说明与开始分析。 */
export default function ControlPanel({
  form,
  initialValues,
  analyzing,
  formLocked,
  onAnalyze,
}: ControlPanelProps) {
  // 供「能否开始分析」取用；preserve 让完成步（左栏已卸载）也读得到，首帧 store 未播种时回落到初值
  const watched = Form.useWatch([], { form, preserve: true });
  const panelValues = watched ?? initialValues;
  // 四项素材全空时按钮不可点；提示必须就地渲染，disabled 按钮点不动 message.warning 那条路径
  const canAnalyze = hasAnalyzeMaterials(panelValues);

  return (
    <aside className={styles.panel}>
      <div className={styles.scroll}>
        {/*
          本表单没有 rules：必填是「四项至少一项」的整表 OR 规则，挂不到单个字段上，
          故提交路径也不走 validateFields()，禁用与提示仍由 footer 承担。
          左栏值的唯一真相是这份 Form store，读值一律用 getFieldsValue(true)，
          故不要加 clearOnDestroy，也不要改成 component={false}。
        */}
        <Form
          form={form}
          initialValues={initialValues}
          layout="vertical"
          disabled={formLocked}
          className={styles.form}
        >
          <AnalyzeForm disabled={formLocked} />
        </Form>
      </div>
      <div className={styles.footer}>
        {canAnalyze ? null : <span className={styles.footerHint}>{NO_MATERIAL_WARNING}</span>}
        <Button
          className={styles.analyzeBtn}
          type="primary"
          block
          size="large"
          icon={<HighlightOutlined />}
          loading={analyzing}
          disabled={!canAnalyze}
          onClick={onAnalyze}
        >
          {ANALYZE_BUTTON}
        </Button>
      </div>
    </aside>
  );
}
