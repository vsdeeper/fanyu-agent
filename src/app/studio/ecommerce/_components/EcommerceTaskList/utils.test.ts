import { describe, expect, it } from 'vitest';
import { formatTaskDateTime, getTaskEditorPath, normalizeSearchName } from './utils';
import { stepLabelFor } from './constants';

describe('getTaskEditorPath', () => {
  it('生成流程设计页地址', () => {
    expect(getTaskEditorPath({ id: 'task/1' })).toBe('/studio/ecommerce/task%2F1');
  });
});

describe('formatTaskDateTime', () => {
  it('无法解析时原样返回', () => {
    expect(formatTaskDateTime('not-a-date')).toBe('not-a-date');
  });

  it('合法 ISO 转为本地日期时间', () => {
    expect(formatTaskDateTime('2026-09-05T00:36:31.000Z')).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
    );
  });
});

describe('normalizeSearchName', () => {
  it('空白视为未筛选', () => {
    expect(normalizeSearchName('  ')).toBeUndefined();
    expect(normalizeSearchName(' 主图 ')).toBe('主图');
  });
});

describe('stepLabelFor', () => {
  it('详情图显示详情图分析与详情图设计', () => {
    expect(stepLabelFor('详情图', 'analysis')).toBe('详情图分析');
    expect(stepLabelFor('详情图', 'design')).toBe('详情图设计');
    expect(stepLabelFor('主图', 'analysis')).toBe('商业分析');
    expect(stepLabelFor('主图', 'design')).toBe('视觉设计');
  });
});
