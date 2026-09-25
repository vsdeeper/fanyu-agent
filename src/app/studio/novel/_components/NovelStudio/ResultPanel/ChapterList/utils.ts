const ONES = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;

/** 将正整数转为中文数字（1–99），超出范围回退阿拉伯数字。 */
export function toChineseNumeral(n: number): string {
  if (!Number.isInteger(n) || n <= 0) return String(n);
  if (n > 99) return String(n);
  if (n < 10) return ONES[n];
  if (n === 10) return '十';
  if (n < 20) return `十${ONES[n - 10]}`;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${ONES[tens]}十${ones ? ONES[ones] : ''}`;
}

/** 按序号生成「第N章」前缀（1-based）。 */
export function formatChapterPrefix(index: number): string {
  return `第${toChineseNumeral(index)}章`;
}

/** 去掉已有「第…章」前缀，兼容历史/模型输出带序号的标题。 */
export function stripChapterPrefix(title: string): string {
  return title.replace(/^第[零一二三四五六七八九十百千\d]+章[　\s]*/, '').trim();
}
