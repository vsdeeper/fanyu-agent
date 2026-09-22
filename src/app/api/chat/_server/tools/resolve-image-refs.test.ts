import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAsset = vi.hoisted(() => vi.fn());
const getWorkingAsset = vi.hoisted(() => vi.fn());
const assetToDataUrl = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('@/app/api/images/_server/assets', () => ({
  getAsset,
  getWorkingAsset,
  assetToDataUrl,
}));

import { IMAGE_TOOL_PASTE_SOURCE_ERROR } from '@/app/api/chat/_shared/tool-errors';
import { resolveImageRefs } from './resolve-image-refs';

beforeEach(() => {
  getAsset.mockReset();
  getWorkingAsset.mockReset();
  assetToDataUrl.mockReset();
});

describe('resolveImageRefs', () => {
  it('有粘贴图时默认只用第一张', async () => {
    const result = await resolveImageRefs({
      chatId: 'c1',
      pastedImageDataUrls: ['data:image/png;base64,aaa', 'data:image/png;base64,bbb'],
    });

    expect(result).toEqual({
      dataUrls: ['data:image/png;base64,aaa'],
      parentIds: [null],
    });
  });

  it('按 pastedImageIndexes 选择多张粘贴图', async () => {
    const result = await resolveImageRefs({
      chatId: 'c1',
      pastedImageDataUrls: ['data:image/png;base64,aaa', 'data:image/png;base64,bbb'],
      pastedImageIndexes: [1, 0],
    });

    expect(result).toEqual({
      dataUrls: ['data:image/png;base64,bbb', 'data:image/png;base64,aaa'],
      parentIds: [null, null],
    });
  });

  it('粘贴图索引越界返回错误', async () => {
    const result = await resolveImageRefs({
      chatId: 'c1',
      pastedImageDataUrls: ['data:image/png;base64,aaa'],
      pastedImageIndexes: [2],
    });

    expect(result).toEqual({ error: '粘贴图第 3 张不存在' });
  });

  it('无粘贴图时回退 working image', async () => {
    getWorkingAsset.mockResolvedValue({ id: 'a1', chatId: 'c1' });
    getAsset.mockReturnValue({ id: 'a1', chatId: 'c1' });
    assetToDataUrl.mockReturnValue('data:image/png;base64,work');

    const result = await resolveImageRefs({ chatId: 'c1' });

    expect(result).toEqual({
      dataUrls: ['data:image/png;base64,work'],
      parentIds: ['a1'],
    });
  });

  it('无源图时返回粘贴提示错误', async () => {
    getWorkingAsset.mockResolvedValue(undefined);

    const result = await resolveImageRefs({ chatId: 'c1' });

    expect(result).toEqual({ error: IMAGE_TOOL_PASTE_SOURCE_ERROR });
  });

  it('sourceAssetIds 不属于会话时返回错误', async () => {
    getAsset.mockReturnValue({ id: 'a1', chatId: 'other' });

    const result = await resolveImageRefs({
      chatId: 'c1',
      sourceAssetIds: ['a1'],
    });

    expect(result).toEqual({ error: '参考图不存在或不属于当前会话' });
  });
});
