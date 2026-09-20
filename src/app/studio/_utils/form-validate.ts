import type { FormInstance } from 'antd';
import type { NamePath } from 'antd/es/form/interface';

/** validateFields 失败时的拒绝值：至少含 errorFields，取第一项定位要滚到哪个字段 */
type ValidateErrorEntity = { errorFields?: { name: NamePath }[] };

/**
 * 提交前校验左栏表单。
 *
 * 失败即静默返回 false：错误已由 Form.Item 行内呈现，不再叠一条 Toast。
 * 调用方拿到 false 直接 return，不要自己再报错。
 *
 * 滚动必须在这里做：Form 的 `scrollToFirstError` 只在 `onFinishFailed`（即走 submit/onFinish）里生效，
 * 本函数直调 `validateFields` 绕不开它。少了这一步，错误若渲染在滚出视口的字段上，
 * 用户只看到「按钮点了没反应」——原来这些按钮是 disabled，改成行内校验后必须补上这个反馈。
 */
export async function validateForm<T>(form: FormInstance<T>): Promise<boolean> {
  try {
    await form.validateFields();
    return true;
  } catch (error) {
    const first = (error as ValidateErrorEntity)?.errorFields?.[0]?.name;
    if (first) form.scrollToField(first, { block: 'nearest' });
    return false;
  }
}
