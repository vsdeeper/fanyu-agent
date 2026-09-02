/**
 * 电商用户上传图分类落盘仅在电商设计链路开启。
 * 本轮切到其它出图 skill 时关闭，避免把参考图/截图登记成产品图或前置锚点。
 */
const OTHER_IMAGE_SKILL_IDS = new Set(['web-design', 'mobile-design', 'brandkit']);

/**
 * 是否启用电商上传图登记 / 产品图锚点 / 上传图 hint。
 * 本轮或粘滞含 ecommerce-image，且本轮未激活其它出图 skill。
 */
export function isEcommerceUploadsEnabled(
  turnActivatedIds: string[] | undefined,
  stickySkillIds: string[] | undefined,
): boolean {
  const activated = turnActivatedIds ?? [];
  const sticky = stickySkillIds ?? [];
  if (activated.some((id) => OTHER_IMAGE_SKILL_IDS.has(id))) {
    return false;
  }
  return activated.includes('ecommerce-image') || sticky.includes('ecommerce-image');
}
