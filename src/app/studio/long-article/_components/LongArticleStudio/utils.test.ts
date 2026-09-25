import { describe, expect, it } from 'vitest';
import {
  WATERMARK_BOTTOM_RATIO,
  WATERMARK_INK_ON_DARK,
  WATERMARK_INK_ON_LIGHT,
  WATERMARK_RIGHT_RATIO,
  WATERMARK_WIDTH_RATIO,
} from './constants';
import {
  findWatermarkInkBox,
  recolorWatermarkInk,
  resolveWatermarkInk,
  resolveWatermarkRect,
  stripWatermarkBackdrop,
} from './utils';

/** 长文正文的展示栏宽：正文配图都按它等比缩放，故「页面上一致」= 换到此宽度后一致。 */
const DISPLAY_WIDTH = 677;

/** gpt-image-2-vip 1K / 2K 档位各比例的成图尺寸（长边 1280 / 2048，16 倍数对齐）。 */
const IMAGE_SIZES = [
  { name: '1K 16:9', width: 1280, height: 720 },
  { name: '1K 1:1', width: 1280, height: 1280 },
  { name: '1K 3:4', width: 960, height: 1280 },
  { name: '1K 9:16', width: 720, height: 1280 },
  { name: '2K 16:9', width: 2048, height: 1152 },
  { name: '2K 3:4', width: 1536, height: 2048 },
];

/** 横版 logo、方形 logo、竖版水印 */
const MARKS = [
  { name: '横版 logo 600×200', width: 600, height: 200 },
  { name: '方形 logo 512×512', width: 512, height: 512 },
  { name: '竖版水印 200×600', width: 200, height: 600 },
];

function rectOf(image: { width: number; height: number }, mark = MARKS[0]!) {
  return resolveWatermarkRect({
    imageWidth: image.width,
    imageHeight: image.height,
    markWidth: mark.width,
    markHeight: mark.height,
  });
}

describe('水印落点', () => {
  it('尺寸与留白都按成图宽度换算，不随比例 / 档位变化', () => {
    for (const image of IMAGE_SIZES) {
      const rect = rectOf(image);
      const rightGap = image.width - rect.x - rect.width;
      const bottomGap = image.height - rect.y - rect.height;
      expect(Math.abs(rect.width - image.width * WATERMARK_WIDTH_RATIO), image.name).toBeLessThan(
        1,
      );
      expect(Math.abs(rightGap - image.width * WATERMARK_RIGHT_RATIO), image.name).toBeLessThan(1);
      // 底部留白单独放宽，用来避开常见平台底栏；两者都只跟图宽有关
      expect(Math.abs(bottomGap - image.width * WATERMARK_BOTTOM_RATIO), image.name).toBeLessThan(
        1,
      );
      expect(bottomGap, image.name).toBeGreaterThan(rightGap);
    }
  });

  it('同一栏宽展示时，各图水印大小与右下留白一致（整像素取整误差 ≤ 1px）', () => {
    const first = IMAGE_SIZES[0]!;
    const base = rectOf(first);
    const baseScale = DISPLAY_WIDTH / first.width;
    const baseWidth = base.width * baseScale;
    const baseRightGap = (first.width - base.x - base.width) * baseScale;
    const baseBottomGap = (first.height - base.y - base.height) * baseScale;

    for (const image of IMAGE_SIZES.slice(1)) {
      const rect = rectOf(image);
      const scale = DISPLAY_WIDTH / image.width;
      expect(Math.abs(rect.width * scale - baseWidth), image.name).toBeLessThan(1);
      expect(
        Math.abs((image.width - rect.x - rect.width) * scale - baseRightGap),
        image.name,
      ).toBeLessThan(1);
      expect(
        Math.abs((image.height - rect.y - rect.height) * scale - baseBottomGap),
        image.name,
      ).toBeLessThan(1);
    }
  });

  it('水印等比缩放进方形盒子，不出画', () => {
    for (const image of IMAGE_SIZES) {
      for (const mark of MARKS) {
        const rect = rectOf(image, mark);
        const label = `${image.name} / ${mark.name}`;
        expect(rect.width, label).toBeGreaterThan(0);
        expect(rect.height, label).toBeGreaterThan(0);
        expect(Math.max(rect.width, rect.height), label).toBeLessThanOrEqual(
          Math.round(image.width * WATERMARK_WIDTH_RATIO),
        );
        expect(rect.x, label).toBeGreaterThanOrEqual(0);
        expect(rect.y, label).toBeGreaterThanOrEqual(0);
        // 等比：宽高比与源水印一致（整数取整允许 1px 偏差）
        expect(Math.abs(rect.width / rect.height - mark.width / mark.height), label).toBeLessThan(
          1 / Math.min(rect.width, rect.height) + 0.02,
        );
      }
    }
  });
});

const WHITE: Rgba = [255, 255, 255, 255];
const INK: Rgba = [31, 42, 68, 255];
type Rgba = [number, number, number, number];

/** 造一张 width×height 的图，fill 按坐标给像素；无水印抠底只关心像素数组。 */
function makePixels(width: number, height: number, fill: (x: number, y: number) => Rgba) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      pixels.set(fill(x, y), (y * width + x) * 4);
    }
  }
  return pixels;
}

function pixelAt(pixels: Uint8ClampedArray, width: number, x: number, y: number) {
  const offset = (y * width + x) * 4;
  return [pixels[offset]!, pixels[offset + 1]!, pixels[offset + 2]!, pixels[offset + 3]!];
}

describe('水印抠底', () => {
  it('白底卡片只留墨迹：底变透明，墨迹本色不动', () => {
    const pixels = makePixels(10, 10, (x, y) =>
      x >= 3 && x <= 6 && y >= 3 && y <= 6 ? INK : WHITE,
    );

    stripWatermarkBackdrop(pixels, 10, 10);

    expect(pixelAt(pixels, 10, 0, 0)).toEqual([255, 255, 255, 0]);
    expect(pixelAt(pixels, 10, 4, 4)).toEqual([...INK.slice(0, 3), 255]);
  });

  it('抗锯齿边缘按覆盖率给半透明，并反解出墨迹本色（不留白边）', () => {
    // 一列满墨迹定出「满不透明」基准，另一列放 50% 覆盖的像素（色值 = 底与墨迹的中值）
    const pixels = makePixels(6, 6, (x) =>
      x === 1 ? INK : x === 3 ? [143, 148, 161, 255] : WHITE,
    );

    stripWatermarkBackdrop(pixels, 6, 6);

    const [r, g, b, a] = pixelAt(pixels, 6, 3, 0);
    expect(a, '半透明').toBeGreaterThan(100);
    expect(a, '半透明').toBeLessThan(180);
    // 反解回墨迹本色，而不是留在中灰
    expect(Math.abs(r - INK[0]), 'R').toBeLessThan(6);
    expect(Math.abs(g - INK[1]), 'G').toBeLessThan(6);
    expect(Math.abs(b - INK[2]), 'B').toBeLessThan(6);
  });

  it('四角透明的透明底图原样保留，不走抠底', () => {
    // 透明底 + 中间墨迹：四角 alpha 均为 0，才是真正的「透明底图」
    const pixels = makePixels(8, 8, (x, y) =>
      x >= 3 && x <= 4 && y >= 3 && y <= 4 ? INK : [0, 0, 0, 0],
    );
    const before = [...pixels];

    stripWatermarkBackdrop(pixels, 8, 8);

    expect([...pixels]).toEqual(before);
  });

  it('白底卡片上带几处半透明像素（投影 / 导出瑕疵）仍按白底抠', () => {
    const pixels = makePixels(8, 8, (x, y) => {
      if (x >= 3 && x <= 4 && y >= 3 && y <= 4) return INK;
      // 一角留下半透明像素：不能因此把整张图当成透明底
      return x === 0 && y === 0 ? [255, 255, 255, 120] : WHITE;
    });

    stripWatermarkBackdrop(pixels, 8, 8);

    expect(pixelAt(pixels, 8, 7, 7)[3], '白底').toBe(0);
    expect(pixelAt(pixels, 8, 3, 3)).toEqual([...INK.slice(0, 3), 255]);
  });

  it('四角不同色（整张照片当水印用）不抠，避免抠坏原图', () => {
    const pixels = makePixels(8, 8, (x, y) => [x * 30, y * 30, 10, 255] as Rgba);
    const before = [...pixels];

    stripWatermarkBackdrop(pixels, 8, 8);

    expect([...pixels]).toEqual(before);
  });

  it('整幅与底色同色（空白底图）不抠成全透明', () => {
    const pixels = makePixels(8, 8, () => WHITE);

    stripWatermarkBackdrop(pixels, 8, 8);

    expect(pixelAt(pixels, 8, 0, 0)).toEqual(WHITE);
  });

  it('烤进棋盘格的「伪透明」导出也能抠（四角不同色但都亮）', () => {
    const pixels = makePixels(8, 8, (x, y) => {
      if (x >= 3 && x <= 4 && y >= 3 && y <= 4) return INK;
      return x < 4 !== y < 4 ? [255, 255, 255, 255] : [236, 236, 236, 255];
    });

    stripWatermarkBackdrop(pixels, 8, 8);

    expect(pixelAt(pixels, 8, 0, 0)[3], '格底').toBe(0);
    expect(pixelAt(pixels, 8, 4, 0)[3], '另一色格底').toBe(0);
    expect(pixelAt(pixels, 8, 3, 3)).toEqual([...INK.slice(0, 3), 255]);
  });
});

describe('水印裁边距', () => {
  it('裁到墨迹边界，导出图四周的透明留白不带进落点', () => {
    const pixels = makePixels(10, 10, (x, y) =>
      x >= 2 && x <= 5 && y >= 6 && y <= 8 ? [0, 0, 0, 255] : [0, 0, 0, 0],
    );

    expect(findWatermarkInkBox(pixels, 10, 10)).toEqual({ x: 2, y: 6, width: 4, height: 3 });
  });

  it('全透明图没有墨迹边界', () => {
    expect(
      findWatermarkInkBox(
        makePixels(4, 4, () => [0, 0, 0, 0]),
        4,
        4,
      ),
    ).toBeNull();
  });
});

describe('水印墨色', () => {
  it('底图偏暗用白墨、偏亮用近黑墨', () => {
    expect(resolveWatermarkInk(makePixels(4, 4, () => [20, 20, 20, 255]))).toEqual(
      WATERMARK_INK_ON_DARK,
    );
    expect(resolveWatermarkInk(makePixels(4, 4, () => [240, 240, 240, 255]))).toEqual(
      WATERMARK_INK_ON_LIGHT,
    );
  });

  it('暗底上几处高光不改判（按偏亮占比，不看平均亮度）', () => {
    const pixels = makePixels(4, 4, (x, y) =>
      x === 0 && y === 0 ? [255, 255, 255, 255] : [25, 25, 25, 255],
    );

    expect(resolveWatermarkInk(pixels)).toEqual(WATERMARK_INK_ON_DARK);
  });

  it('刷墨色只改墨迹像素，透明处与其 alpha 都不动', () => {
    const pixels = makePixels(2, 1, (x) => (x === 0 ? [31, 42, 68, 255] : [31, 42, 68, 0]));

    recolorWatermarkInk(pixels, WATERMARK_INK_ON_DARK);

    expect(pixelAt(pixels, 2, 0, 0)).toEqual([255, 255, 255, 255]);
    expect(pixelAt(pixels, 2, 1, 0)).toEqual([31, 42, 68, 0]);
  });
});
