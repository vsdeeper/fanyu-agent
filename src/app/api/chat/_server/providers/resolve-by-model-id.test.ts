import { describe, expect, it } from 'vitest';

import { resolveChatProviderByModelId } from './resolve-by-model-id';

describe('resolveChatProviderByModelId', () => {
  it('按前缀映射到 chat Provider', () => {
    expect(resolveChatProviderByModelId('doubao-seed-2-0-pro-260215')).toBe('ark');
    expect(resolveChatProviderByModelId('deepseek-v4-flash')).toBe('deepseek');
    expect(resolveChatProviderByModelId('glm-4.6v')).toBe('zhipu');
  });

  it('空串与未知前缀返回 null', () => {
    expect(resolveChatProviderByModelId('')).toBeNull();
    expect(resolveChatProviderByModelId('   ')).toBeNull();
    expect(resolveChatProviderByModelId('gpt-image-2-vip')).toBeNull();
  });
});
