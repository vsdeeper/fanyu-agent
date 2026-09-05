import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { ResultImage } from '../types';
import { createResultArchive, decodeImageDataUrl, getGeneratedImages } from './utils';

const PNG_DATA_URL = 'data:image/png;base64,AQID';
const READY_PNG: ResultImage = {
  index: 0,
  aspectRatio: '1:1',
  status: 'ready',
  url: PNG_DATA_URL,
};

describe('产品精修成果导出', () => {
  it('只保留已生成且含 URL 的图片', () => {
    const images: ResultImage[] = [
      READY_PNG,
      { index: 1, aspectRatio: '1:1', status: 'pending' },
      { index: 2, aspectRatio: '1:1', status: 'failed', error: 'failed' },
    ];

    expect(getGeneratedImages(images)).toEqual([READY_PNG]);
  });

  it('解析图片 data URL 的类型和字节', () => {
    const result = decodeImageDataUrl(PNG_DATA_URL);

    expect(result.mediaType).toBe('image/png');
    expect([...result.bytes]).toEqual([1, 2, 3]);
  });

  it('按精修图和多视角图目录生成 ZIP', async () => {
    const archive = unzipSync(await createResultArchive([READY_PNG], [READY_PNG]));

    expect(Object.keys(archive)).toEqual([
      '产品精修图/refine-01.png',
      '产品多视角图/multiview-01.png',
    ]);
    expect([...archive['产品精修图/refine-01.png']]).toEqual([1, 2, 3]);
  });
});
