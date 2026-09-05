import { unzipSync } from 'fflate';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResultImage } from './types';
import {
  appendImages,
  applyGenerateEvent,
  createResultArchive,
  decodeImageDataUrl,
  getGeneratedImages,
  pendingImages,
} from './utils';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PNG_DATA_URL = 'data:image/png;base64,AQID';
const READY_PNG: ResultImage = {
  index: 0,
  aspectRatio: '16:9',
  status: 'ready',
  url: PNG_DATA_URL,
};

describe('上传项 uid', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('新项使用 UUID 且不含文件名', () => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: () => 'blob:test',
      revokeObjectURL: () => undefined,
    });
    const file = new File(['img'], 'multiview-01.png', { type: 'image/png' });
    const images = appendImages([], [file], 6);

    expect(images[0]?.uid).toMatch(UUID_RE);
    expect(images[0]?.uid).not.toContain(file.name);
  });
});

describe('产品模特结果工具', () => {
  it('建立批次占位并按批次索引合并流事件', () => {
    const pending = pendingImages(2, 3, '16:9');
    const completed = applyGenerateEvent(pending, { index: 1, url: PNG_DATA_URL }, 3);

    expect(pending.map((item) => item.index)).toEqual([3, 4]);
    expect(completed[0].status).toBe('pending');
    expect(completed[1]).toMatchObject({ index: 4, status: 'ready', url: PNG_DATA_URL });
  });

  it('只保留成功且含 URL 的图片', () => {
    const images: ResultImage[] = [
      READY_PNG,
      { index: 1, aspectRatio: '16:9', status: 'pending' },
      { index: 2, aspectRatio: '16:9', status: 'failed', error: 'failed' },
    ];

    expect(getGeneratedImages(images)).toEqual([READY_PNG]);
  });

  it('解析图片数据并生成产品模特 ZIP 目录', async () => {
    const decoded = decodeImageDataUrl(PNG_DATA_URL);
    const archive = unzipSync(await createResultArchive([READY_PNG]));

    expect(decoded.mediaType).toBe('image/png');
    expect([...decoded.bytes]).toEqual([1, 2, 3]);
    expect(Object.keys(archive)).toEqual(['产品模特图/product-model-01.png']);
    expect([...archive['产品模特图/product-model-01.png']]).toEqual([1, 2, 3]);
  });
});
