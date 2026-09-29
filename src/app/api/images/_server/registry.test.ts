import { describe, expect, it } from 'vitest';
import { resolveExplicitImageModelId } from './registry';

describe('resolveExplicitImageModelId', () => {
  it('显式模型选择返回登记 id', () => {
    expect(resolveExplicitImageModelId('gpt-image-2.5-flare-vip')).toBe('gpt-image-2.5-flare-vip');
  });

  it('未知模型返回 null', () => {
    expect(resolveExplicitImageModelId('unknown-model')).toBeNull();
  });
});
