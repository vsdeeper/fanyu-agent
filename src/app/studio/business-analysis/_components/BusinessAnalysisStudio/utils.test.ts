import { describe, expect, it } from 'vitest';
import {
  createAnalysisStepSnapshot,
  hasAnalyzeMaterials,
  isSameStepSnapshot,
  readAnalysisStepSnapshot,
} from './utils';
import type { ProductDocItem, ProductImageItem } from './types';

/** 可序列化的上传项：无 file、previewUrl 为 data URL，serializeUploadItem 会原样返回。 */
const IMAGE_ITEM = (uid: string, name: string): ProductImageItem => ({
  uid,
  previewUrl: 'data:image/png;base64,product',
  name,
  mimeType: 'image/png',
  size: 0,
});

const DOC_ITEM = (uid: string, name: string): ProductDocItem => ({
  uid,
  previewUrl: 'data:text/plain;base64,资料',
  name,
  mimeType: 'text/plain',
  size: 0,
});

const EMPTY = { images: [], brandLogo: [], productDescription: '', documents: [] };

describe('hasAnalyzeMaterials', () => {
  it('四项全空为 false', () => {
    expect(hasAnalyzeMaterials(EMPTY)).toBe(false);
    expect(hasAnalyzeMaterials({ ...EMPTY, productDescription: '   ' })).toBe(false);
  });

  it('任一项非空即为 true', () => {
    expect(hasAnalyzeMaterials({ ...EMPTY, images: [IMAGE_ITEM('1', 'a.png')] })).toBe(true);
    expect(hasAnalyzeMaterials({ ...EMPTY, brandLogo: [IMAGE_ITEM('2', 'logo.png')] })).toBe(true);
    expect(hasAnalyzeMaterials({ ...EMPTY, productDescription: '通勤人群' })).toBe(true);
    expect(hasAnalyzeMaterials({ ...EMPTY, documents: [DOC_ITEM('3', 'b.txt')] })).toBe(true);
  });
});

describe('分析步快照', () => {
  it('空素材不写键，键序固定为 images / documents / analysisText', async () => {
    const snapshot = await createAnalysisStepSnapshot([], [], [], '   ', '');
    expect(Object.keys(snapshot)).toEqual(['images', 'documents', 'analysisText']);
  });

  it('产品说明按 trim 归一：纯空白不写键', async () => {
    const blank = await createAnalysisStepSnapshot([], [], [], '   ', '正文');
    expect(blank.productDescription).toBeUndefined();

    const filled = await createAnalysisStepSnapshot([], [], [], '  通勤人群  ', '正文');
    expect(filled.productDescription).toBe('通勤人群');
  });

  it('品牌 Logo 为空数组不写键', async () => {
    const snapshot = await createAnalysisStepSnapshot([], [], [], '说明', '正文');
    expect(snapshot.brandLogoImages).toBeUndefined();
  });

  it('create / read 往返后 JSON 逐字相等（键序与空值都必须对称）', async () => {
    const created = await createAnalysisStepSnapshot(
      [IMAGE_ITEM('1', 'a.png')],
      [DOC_ITEM('2', 'b.txt')],
      [IMAGE_ITEM('3', 'logo.png')],
      '通勤人群',
      '分析正文',
    );
    const read = readAnalysisStepSnapshot(created);
    expect(read).toBeDefined();
    const recreated = await createAnalysisStepSnapshot(
      read!.images,
      read!.documents,
      read!.brandLogoImages ?? [],
      read!.productDescription ?? '',
      read!.analysisText,
    );
    expect(JSON.stringify(recreated)).toBe(JSON.stringify(created));
    expect(isSameStepSnapshot(recreated, created)).toBe(true);
  });

  it('旧快照（缺新键）读取后不凭空补出键', () => {
    const legacy = { images: [], documents: [], analysisText: '正文' };
    expect(JSON.stringify(readAnalysisStepSnapshot(legacy))).toBe(JSON.stringify(legacy));
  });

  it('read 对称归一化：空数组 Logo 与空白说明都不留键', () => {
    const restored = readAnalysisStepSnapshot({
      images: [],
      documents: [],
      brandLogoImages: [],
      productDescription: '   ',
      analysisText: '正文',
    });
    expect(restored?.brandLogoImages).toBeUndefined();
    expect(restored?.productDescription).toBeUndefined();
  });
});
