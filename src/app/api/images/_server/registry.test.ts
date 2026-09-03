import { afterEach, describe, expect, it } from 'vitest';
import { getConfiguredImageModelId, resolveExplicitImageModelId } from './registry';

const ORIGINAL_IMAGE_MODEL_ID = process.env.IMAGE_MODEL_ID;

afterEach(() => {
  process.env.IMAGE_MODEL_ID = ORIGINAL_IMAGE_MODEL_ID;
});

describe('resolveExplicitImageModelId', () => {
  it('显式模型选择不受 IMAGE_MODEL_ID 覆盖', () => {
    process.env.IMAGE_MODEL_ID = 'gemini-3.1-flash-lite-image';

    expect(getConfiguredImageModelId()).toBe('gemini-3.1-flash-lite-image');
    expect(resolveExplicitImageModelId('gpt-image-2-vip')).toBe('gpt-image-2-vip');
  });

  it('未知模型返回 null', () => {
    expect(resolveExplicitImageModelId('unknown-model')).toBeNull();
  });
});
