import { afterEach, describe, expect, it } from 'vitest';
import {
  getConfiguredEditImageModelId,
  getConfiguredImageModelId,
  resolveExplicitImageModelId,
} from './registry';

const ORIGINAL_IMAGE_MODEL_ID = process.env.IMAGE_MODEL_ID;
const ORIGINAL_EDIT_IMAGE_MODEL_ID = process.env.EDIT_IMAGE_MODEL_ID;

afterEach(() => {
  process.env.IMAGE_MODEL_ID = ORIGINAL_IMAGE_MODEL_ID;
  if (ORIGINAL_EDIT_IMAGE_MODEL_ID === undefined) {
    delete process.env.EDIT_IMAGE_MODEL_ID;
  } else {
    process.env.EDIT_IMAGE_MODEL_ID = ORIGINAL_EDIT_IMAGE_MODEL_ID;
  }
});

describe('getConfiguredImageModelId', () => {
  it('读取 IMAGE_MODEL_ID', () => {
    process.env.IMAGE_MODEL_ID = 'gemini-3.1-flash-lite-image';
    expect(getConfiguredImageModelId()).toBe('gemini-3.1-flash-lite-image');
  });

  it('缺失时抛错', () => {
    delete process.env.IMAGE_MODEL_ID;
    expect(() => getConfiguredImageModelId()).toThrow(/IMAGE_MODEL_ID/);
  });
});

describe('getConfiguredEditImageModelId', () => {
  it('未设置时回落为 IMAGE_MODEL_ID', () => {
    process.env.IMAGE_MODEL_ID = 'gpt-image-2.5-flare-vip';
    delete process.env.EDIT_IMAGE_MODEL_ID;
    expect(getConfiguredEditImageModelId()).toBe('gpt-image-2.5-flare-vip');
  });

  it('设置后优先使用 EDIT_IMAGE_MODEL_ID', () => {
    process.env.IMAGE_MODEL_ID = 'gpt-image-2.5-flare-vip';
    process.env.EDIT_IMAGE_MODEL_ID = 'gpt-image-2.5-sunburst-vip';
    expect(getConfiguredEditImageModelId()).toBe('gpt-image-2.5-sunburst-vip');
  });
});

describe('resolveExplicitImageModelId', () => {
  it('显式模型选择不受 IMAGE_MODEL_ID 覆盖', () => {
    process.env.IMAGE_MODEL_ID = 'gemini-3.1-flash-lite-image';

    expect(getConfiguredImageModelId()).toBe('gemini-3.1-flash-lite-image');
    expect(resolveExplicitImageModelId('gpt-image-2.5-flare-vip')).toBe('gpt-image-2.5-flare-vip');
  });

  it('未知模型返回 null', () => {
    expect(resolveExplicitImageModelId('unknown-model')).toBeNull();
  });
});
