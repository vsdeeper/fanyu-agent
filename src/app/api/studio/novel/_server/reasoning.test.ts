import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { resolveNovelReasoningEffort } from './reasoning';

describe('resolveNovelReasoningEffort', () => {
  it('DeepSeek 使用左栏值，缺省为 max', () => {
    expect(resolveNovelReasoningEffort('deepseek', 'low')).toBe('low');
    expect(resolveNovelReasoningEffort('deepseek', 'none')).toBe('none');
    expect(resolveNovelReasoningEffort('deepseek', undefined)).toBe('max');
    expect(resolveNovelReasoningEffort('deepseek', 'medium')).toBe('max');
  });

  it('智谱不收 none，回落 max', () => {
    expect(resolveNovelReasoningEffort('zhipu', 'none')).toBe('max');
    expect(resolveNovelReasoningEffort('zhipu', 'high')).toBe('high');
  });

  it('方舟不传思考强度', () => {
    expect(resolveNovelReasoningEffort('ark', 'max')).toBeUndefined();
  });
});
