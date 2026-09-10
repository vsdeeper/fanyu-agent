import { unzipSync } from 'fflate';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResultImage } from './types';
import {
  appendImages,
  applyGenerateEvent,
  createResultArchive,
  decodeImageDataUrl,
  getGeneratedImages,
  isSameStepSnapshot,
  pendingImages,
} from './utils';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PNG_DATA_URL = 'data:image/png;base64,AQID';
const READY_PNG: ResultImage = {
  id: 'png-0',
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
  it('建立批次占位并按槽位 id 合并流事件', () => {
    const pending = pendingImages(2, '16:9');
    const completed = applyGenerateEvent(pending, {
      slotId: pending[1]!.id,
      url: PNG_DATA_URL,
    });

    expect(new Set(pending.map((item) => item.id)).size).toBe(2);
    expect(completed[0]?.status).toBe('pending');
    expect(completed[1]).toMatchObject({ id: pending[1]!.id, status: 'ready', url: PNG_DATA_URL });
  });

  it('只保留成功且含 URL 的图片', () => {
    const images: ResultImage[] = [
      READY_PNG,
      { id: 'p1', aspectRatio: '16:9', status: 'pending' },
      { id: 'p2', aspectRatio: '16:9', status: 'failed', error: 'failed' },
    ];

    expect(getGeneratedImages(images)).toEqual([READY_PNG]);
  });

  it('解析图片数据并生成产品模特 ZIP 目录', async () => {
    const decoded = decodeImageDataUrl(PNG_DATA_URL);
    const archive = unzipSync(await createResultArchive([READY_PNG]));

    expect(decoded.mediaType).toBe('image/png');
    expect([...decoded.bytes]).toEqual([1, 2, 3]);
    // ZIP 内按比例二级分目录存放：目录名=物料分类，文件名=比例-序号
    expect(Object.keys(archive)).toEqual(['产品模特图/16:9-01.png']);
    expect([...archive['产品模特图/16:9-01.png']]).toEqual([1, 2, 3]);
  });
});

describe('isSameStepSnapshot', () => {
  it('无基线视为已变化', () => {
    expect(isSameStepSnapshot({ results: [] }, undefined)).toBe(false);
  });

  it('完全相同则相等', () => {
    const snapshot = {
      form: {
        viewRequirement: '正面',
        model: 'm',
        aspectRatio: '16:9',
        quality: 'high',
        clarity: '2K',
        count: '1',
      },
      productImages: [],
      modelImages: [],
      results: [READY_PNG],
    };
    expect(isSameStepSnapshot(snapshot, snapshot)).toBe(true);
  });

  it('结果 URL 变化则不相等', () => {
    const baseline = {
      form: {
        viewRequirement: '正面',
        model: 'm',
        aspectRatio: '16:9',
        quality: 'high',
        clarity: '2K',
        count: '1',
      },
      productImages: [],
      modelImages: [],
      results: [READY_PNG],
    };
    expect(
      isSameStepSnapshot(
        { ...baseline, results: [{ ...READY_PNG, url: 'data:image/png;base64,ZZ' }] },
        baseline,
      ),
    ).toBe(false);
  });
});
