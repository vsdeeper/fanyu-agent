import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { ECOMMERCE_TASK_TYPES } from '@/app/api/studio/ecommerce/_shared/task-constants';
import {
  DETAIL_IMAGE_CONTINUITY_PROMPT,
  MAIN_IMAGE_BRAND_LOGO_PROMPT,
  MAIN_IMAGE_COPY_REFERENCE_PROMPT,
  MAIN_IMAGE_COPY_TYPOGRAPHY_PROMPT,
  MAIN_IMAGE_COPY_TYPOGRAPHY_WITH_REFERENCE_PROMPT,
  PRODUCT_FIDELITY_NO_REFERENCE_PROMPT,
  PRODUCT_FIDELITY_PROMPT_GUARD,
} from './constants';
import {
  buildDesignPrompt,
  buildDetailImagePrompt,
  buildMainImagePrompt,
  buildProductModelPrompt,
  buildProductMultiviewPrompt,
  buildProductRefinePrompt,
  buildProductViewPrompt,
  buildVisualPrompt,
} from './generate-instructions';
import { parseGenerateBody } from './parse-generate-request';

const SPEC_FIELDS = {
  model: 'gpt-image-2-vip',
  aspectRatio: '16:9',
  quality: 'high',
  clarity: '2K',
};

describe('电商生图指令', () => {
  it('独立产品精修按原图一对一出图', () => {
    const prompt = buildProductRefinePrompt('清理划痕并优化金属高光', 3);

    expect(prompt).toContain('本批共 3 张原图');
    expect(prompt).toContain('当前参考图只对应其中一张');
    expect(prompt).toContain('【精修要求】\n清理划痕并优化金属高光');
    expect(prompt).toContain('Logo、品牌文字、标签和图案必须原样、清晰、完整保留');
    expect(prompt).not.toContain('第1个参考图定义产品本体');
    expect(prompt).not.toContain('其余参考图仅补充同一产品的可见角度与细节');
    expect(prompt).not.toContain('【多视角要求】');

    const single = buildProductRefinePrompt('清理划痕并优化金属高光');
    expect(single).toContain('当前参考图就是待精修的原图');
    expect(single).not.toContain('本批共');
  });

  it('独立产品多视角以已选精修标准图为事实依据', () => {
    const prompt = buildProductMultiviewPrompt('生成正面、侧面与背面视角');

    expect(prompt).toContain('已选精修标准图均为同一产品的事实依据');
    expect(prompt).toContain('第1张锁定外观');
    expect(prompt).toContain('其余各张补充该产品其它可见角度与细节');
    expect(prompt).toContain('【多视角要求】\n生成正面、侧面与背面视角');
    expect(prompt).toContain('背面或被遮挡的部件不得搬移、复制或补画');
  });

  it('产品多视角基于精修图出视图板，不重复精修提示、不依赖商业分析', () => {
    const prompt = buildProductViewPrompt();

    expect(prompt).toContain('参考图均为已精修的同一产品事实依据');
    expect(prompt).toContain('Logo、品牌文字、标签和图案必须原样、清晰、完整保留');
    expect(prompt).toContain('背面或被遮挡的部件不得搬移、复制或补画');
    expect(prompt).toContain('纯色背景和统一光线');
    expect(prompt).not.toContain('【第一阶段：产品精修】');
    expect(prompt).not.toContain('修复产品瑕疵');
    expect(prompt).not.toContain('先精修、再出多视角');
    expect(prompt).not.toContain('【商业分析】');
    expect(prompt).not.toContain('电影感');
  });

  it('独立产品模特以产品图确定品类、视觉气质与风格', () => {
    const prompt = buildProductModelPrompt('正面、侧面、背面三种全身视角', 2, false);

    expect(prompt).toContain('第1至第2个参考图=同一产品的事实参考');
    expect(prompt).toContain('决定模特的视觉、气质、造型、配色、光影与整体风格');
    expect(prompt).toContain('可穿戴品类');
    expect(prompt).toContain('模特须正确穿戴参考产品');
    expect(prompt).toContain('非可穿戴品类');
    expect(prompt).toContain('画面中不得出现产品本体');
    expect(prompt).toContain('只允许单行四栏横向拼图');
    expect(prompt).toContain('左侧约占总宽度40%');
    expect(prompt).toContain('右侧约占总宽度60%');
    expect(prompt).toContain('先分别生成四张解剖结构正确、自然完整的人像');
    expect(prompt).toContain('禁止为塞入窄栏而横向压扁、拉伸、扭曲身体');
    expect(prompt).toContain('侧视栏必须是自然的90度全身侧面站姿');
    expect(prompt).toContain('不得缺失、粘连躯干或长出额外肢体');
    expect(prompt).toContain('左栏半身特写姿态硬约束');
    expect(prompt).toContain('双肩保持水平且左右对称');
    expect(prompt).toContain('人物商业级修饰硬约束');
    expect(prompt).toContain('不得复刻参考图这张照片上的模糊、瑕疵');
    expect(prompt).toContain('身体中轴线与画面垂直');
    expect(prompt).toContain('禁止2×2宫格、上下两排');
    expect(prompt).toContain('【视角要求】\n正面、侧面、背面三种全身视角');
  });

  it('独立产品模特用后续参考图锁定人物身份而不继承姿态', () => {
    const prompt = buildProductModelPrompt('四格视角', 2, true);

    expect(prompt).toContain('第3个及之后的参考图=同一位模特的身份参考照片');
    expect(prompt).toContain('全部视角必须保持同一人物');
    expect(prompt).toContain('不得沿用其姿态、动作、身体朝向');
  });

  it('营销主视觉保留商业分析并叠加广告视觉规则', () => {
    const prompt = buildVisualPrompt('品牌采用克制的暖色调');

    expect(prompt).toContain('【商业分析】\n品牌采用克制的暖色调');
    expect(prompt).toContain('Logo、品牌文字、标签和图案必须原样、清晰、完整保留');
    expect(prompt).toContain('控制部件的数量、形状、颜色、尺寸和安装位置必须逐一对应原图');
    expect(prompt).toContain('电影感定向光');
    expect(prompt).toContain('产品必须稳定放置在场景中的支撑面');
    expect(prompt).toContain('不得悬空、悬浮、漂浮');
    expect(prompt).toContain('产品与人物、场景的比例关系必须真实协调');
    expect(prompt).toContain('显著小于成人人体尺度');
    expect(prompt).toContain('文字编排');
    expect(prompt).toContain('层次分明');
    expect(prompt).not.toContain('显著小于画面主视觉');
  });

  it('电商主图以商业分析定气质、本张主题卡定文案与拍法', () => {
    const prompt = buildMainImagePrompt({
      requirement:
        '设计目标：一眼记住哑光金属机身与轻巧体量。\n展示重点：\n- 正视特写整机轮廓，突出冷白金属壳\n- 书房书桌近景，午后窗光侧打，留白构图',
      analysisText: '目标人群偏好冷白，Logo 克制',
      productImageCount: 1,
      hasCopyReference: false,
      hasBrandLogo: false,
    });

    expect(prompt).toContain(
      '【本张主题卡】\n设计目标：一眼记住哑光金属机身与轻巧体量。\n展示重点：\n- 正视特写整机轮廓，突出冷白金属壳\n- 书房书桌近景，午后窗光侧打，留白构图',
    );
    expect(prompt).toContain('【商业分析】\n目标人群偏好冷白，Logo 克制');
    expect(prompt).not.toContain('【套图视觉规范】');
    expect(prompt).toContain('以【本张主题卡】的展示重点为准');
    expect(prompt).toContain('画面文案只来自【本张主题卡】设计目标可转化的短句与展示重点');
    expect(prompt).toContain('禁止把拍摄写法说明当文字写进画面');
    expect(prompt).toContain('电影感定向光');
    expect(prompt).toContain('简洁、清晰、易读');
    expect(prompt).not.toContain('必要时辅以 3～5 条卖点要点');
    expect(prompt).toContain('第1个参考图=用户上传的产品精修图');
    expect(prompt).not.toContain('已选营销主视觉');
    expect(prompt).toContain('产品必须稳定放置在场景中的支撑面');
    expect(prompt).toContain('主图不允许悬浮创意');
    expect(prompt).toContain('字体家族、文案配色必须整套统一');
    expect(prompt).not.toContain('【商业分析】里的字体与文案配色');
    expect(prompt).not.toContain('【文案标准参考图】');
    expect(prompt).toContain('构图、光影、场景与道具以本张展示重点为准');
    expect(prompt).not.toContain('主标题：');
  });

  it('主图带产品资料时叠加【产品资料】段与事实优先级', () => {
    const prompt = buildMainImagePrompt({
      requirement: '设计目标：一眼记住哑光金属机身。\n展示重点：\n- 正视特写整机轮廓',
      analysisText: '目标人群偏好冷白',
      productImageCount: 1,
      hasCopyReference: false,
      hasBrandLogo: false,
      productDocumentsText: '容量 500ml，品牌 凡域',
    });

    expect(prompt).toContain('【商业分析】\n目标人群偏好冷白');
    expect(prompt).toContain('【产品资料】\n容量 500ml，品牌 凡域');
    expect(prompt).toContain('第一手产品事实以【产品资料】为准，缺失时以【商业分析】为准');
    expect(prompt.indexOf('【商业分析】')).toBeLessThan(prompt.indexOf('【产品资料】'));
    expect(prompt.indexOf('【产品资料】')).toBeLessThan(prompt.indexOf('\n【本张主题卡】\n'));
  });

  it('主图无产品资料时不出现【产品资料】段', () => {
    const prompt = buildMainImagePrompt({
      requirement: '设计目标：一眼记住哑光金属机身。\n展示重点：\n- 正视特写整机轮廓',
      analysisText: '目标人群偏好冷白',
      productImageCount: 1,
      hasCopyReference: false,
      hasBrandLogo: false,
    });

    expect(prompt).not.toContain('【产品资料】');
  });

  it('主图无商业分析但有主图说明时以主图说明定气质，不留空锚点', () => {
    const prompt = buildMainImagePrompt({
      requirement: '设计目标：一眼记住哑光金属机身。',
      analysisText: '   ',
      mainImageDescription: '底色走冷白，画面不要促销大字',
      productImageCount: 1,
      hasCopyReference: false,
      hasBrandLogo: false,
    });

    expect(prompt).toContain('【主图说明】\n底色走冷白，画面不要促销大字');
    expect(prompt).not.toContain('【商业分析】');
    expect(prompt).not.toContain('根据【商业分析】确定整套配色');
    expect(prompt).toContain('根据【主图说明】确定整套配色、光影气质、材质与品牌氛围');
  });

  it('主图有商业分析又有主图说明时以主图说明为最终口径', () => {
    const prompt = buildMainImagePrompt({
      requirement: '设计目标：一眼记住哑光金属机身。',
      analysisText: '目标人群偏好冷白',
      mainImageDescription: '底色走冷白',
      productImageCount: 1,
      hasCopyReference: false,
      hasBrandLogo: false,
    });

    expect(prompt).toContain('【商业分析】\n目标人群偏好冷白');
    expect(prompt).toContain('以【主图说明】为最终口径（两者冲突时以【主图说明】为准）');
    expect(prompt.indexOf('【商业分析】')).toBeLessThan(prompt.indexOf('【主图说明】'));
  });

  it('主图既无商业分析也无主图说明时交由主题卡与产品本体收束', () => {
    const prompt = buildMainImagePrompt({
      requirement: '设计目标：一眼记住哑光金属机身。',
      analysisText: '',
      productImageCount: 1,
      hasCopyReference: false,
      hasBrandLogo: false,
    });

    expect(prompt).toContain('配色、光影气质、材质与品牌氛围按【本张主题卡】与产品本体自行收束');
    expect(prompt).not.toContain('【商业分析】');
    expect(prompt).not.toContain('【主图说明】');
  });

  it('主图无商业分析但有产品资料时不追加指向商业分析的兜底句', () => {
    const prompt = buildMainImagePrompt({
      requirement: '设计目标：一眼记住哑光金属机身。',
      analysisText: '',
      mainImageDescription: '底色走冷白',
      productImageCount: 1,
      hasCopyReference: false,
      hasBrandLogo: false,
      productDocumentsText: '容量 500ml，品牌 凡域',
    });

    expect(prompt).toContain('第一手产品事实以【产品资料】为准。');
    expect(prompt).not.toContain('缺失时以【商业分析】为准');
  });

  it('主图点选文案标准参考图后按序号点名，且只锁文案字体与配色', () => {
    const prompt = buildMainImagePrompt({
      requirement: '设计目标：一眼记住哑光金属机身。\n展示重点：\n- 正视特写整机轮廓',
      analysisText: '目标人群偏好冷白',
      productImageCount: 2,
      hasCopyReference: true,
      hasBrandLogo: false,
    });

    expect(prompt).toContain('第1至第2个参考图=用户上传的产品精修图');
    expect(prompt).toContain('第3个参考图（即【文案标准参考图】）');
    expect(prompt).toContain(MAIN_IMAGE_COPY_REFERENCE_PROMPT);
    expect(prompt).toContain(MAIN_IMAGE_COPY_TYPOGRAPHY_WITH_REFERENCE_PROMPT);
    expect(prompt).not.toContain(MAIN_IMAGE_COPY_TYPOGRAPHY_PROMPT);
    expect(prompt).toContain('禁止复制其产品主体呈现');
    expect(prompt).toContain('也禁止因它改变本张的主色板');
    // 商业分析已非必填，配色来源不得指向可能缺席的【商业分析】
    expect(prompt).not.toContain('画面整体配色仍以【商业分析】为准');
    // 防与详情图的「上一屏」机制串味
    expect(prompt).not.toContain(DETAIL_IMAGE_CONTINUITY_PROMPT);
  });

  it('主图仅一张精修图时文案标准参考图序号为 2', () => {
    const prompt = buildMainImagePrompt({
      requirement: '设计目标：一眼记住哑光金属机身。',
      analysisText: '目标人群偏好冷白',
      productImageCount: 1,
      hasCopyReference: true,
      hasBrandLogo: false,
    });

    expect(prompt).toContain('第1个参考图=用户上传的产品精修图');
    expect(prompt).toContain('第2个参考图（即【文案标准参考图】）');
  });

  it('主图未点选参考图时不含文案标准参考图的角色说明与锁定语', () => {
    const prompt = buildMainImagePrompt({
      requirement: '设计目标：一眼记住哑光金属机身。',
      analysisText: '目标人群偏好冷白',
      productImageCount: 2,
      hasCopyReference: false,
      hasBrandLogo: false,
    });

    expect(prompt).toContain('第1个参考图=用户上传的产品精修图');
    expect(prompt).toContain('其余参考图仅补充同一产品的可见角度与细节');
    expect(prompt).toContain(MAIN_IMAGE_COPY_TYPOGRAPHY_PROMPT);
    expect(prompt).not.toContain('【文案标准参考图】');
    expect(prompt).not.toContain(MAIN_IMAGE_COPY_REFERENCE_PROMPT);
  });

  it('主图上传品牌 Logo 时按序号点名，并限定产品图范围不把 Logo 当成产品角度', () => {
    // 无文案标准参考图时 Logo 紧随产品图，此时产品图那句不得再用「其余参考图」泛指
    const withoutCopyRef = buildMainImagePrompt({
      requirement: '设计目标：一眼记住哑光金属机身。',
      analysisText: '目标人群偏好冷白',
      productImageCount: 2,
      hasCopyReference: false,
      hasBrandLogo: true,
    });

    // 产品图那条规则必须限定范围，否则 Logo 会被当成产品的另一个角度
    expect(withoutCopyRef).toContain(
      '第1至第2个参考图=用户上传的产品精修图，定义产品本体；该范围内的图都属于同一产品',
    );
    expect(withoutCopyRef).toContain('第3个参考图（即【品牌 Logo】）');
    expect(withoutCopyRef).toContain(MAIN_IMAGE_BRAND_LOGO_PROMPT);

    // 两者都有时 Logo 顺延到第 4，文案标准参考图序号不变
    const withBoth = buildMainImagePrompt({
      requirement: '设计目标：一眼记住哑光金属机身。',
      analysisText: '目标人群偏好冷白',
      productImageCount: 2,
      hasCopyReference: true,
      hasBrandLogo: true,
    });

    expect(withBoth).toContain('第3个参考图（即【文案标准参考图】）');
    expect(withBoth).toContain('第4个参考图（即【品牌 Logo】）');
    expect(withBoth.indexOf('【文案标准参考图】')).toBeLessThan(
      withBoth.indexOf('第4个参考图（即【品牌 Logo】）'),
    );
  });

  it('主图仅一张精修图且有 Logo 时 Logo 序号为 2', () => {
    const prompt = buildMainImagePrompt({
      requirement: '设计目标：一眼记住哑光金属机身。',
      analysisText: '目标人群偏好冷白',
      productImageCount: 1,
      hasCopyReference: false,
      hasBrandLogo: true,
    });

    expect(prompt).toContain('第1个参考图=用户上传的产品精修图');
    expect(prompt).toContain('本张只有这一张产品图，没有其它产品角度参考');
    expect(prompt).toContain('第2个参考图（即【品牌 Logo】）');
  });

  it('主图未上传 Logo 时不含 Logo 角色说明与 Logo 注入语', () => {
    const prompt = buildMainImagePrompt({
      requirement: '设计目标：一眼记住哑光金属机身。',
      analysisText: '目标人群偏好冷白',
      productImageCount: 1,
      hasCopyReference: false,
      hasBrandLogo: false,
    });

    expect(prompt).not.toContain('【品牌 Logo】');
    expect(prompt).not.toContain(MAIN_IMAGE_BRAND_LOGO_PROMPT);
  });

  it('主图无产品精修图时不点名产品参考图，保真底线换成按描述呈现', () => {
    const prompt = buildMainImagePrompt({
      requirement: '设计目标：一眼记住哑光金属机身。',
      analysisText: '目标人群偏好冷白',
      productImageCount: 0,
      hasCopyReference: false,
      hasBrandLogo: false,
    });

    expect(prompt).toContain('本张没有产品精修图参考');
    expect(prompt).not.toContain('第1个参考图=用户上传的产品精修图');
    expect(prompt).not.toContain('其余参考图仅补充同一产品的可见角度与细节');
    // 「第1个参考图定义产品本体」无从对位，必须换成无参考图的那条底线
    expect(prompt).not.toContain(PRODUCT_FIDELITY_PROMPT_GUARD);
    expect(prompt).toContain(PRODUCT_FIDELITY_NO_REFERENCE_PROMPT);
    expect(prompt).toContain('整套主图必须是同一个产品');
  });

  it('主图无产品精修图时文案标准参考图序号为 1、Logo 顺延', () => {
    // 参考图数组此时只剩文案标准参考图 → 它是第 1 张（用 max(1, P)+1 会错算成第 2 张）
    const onlyCopyRef = buildMainImagePrompt({
      requirement: '设计目标：一眼记住哑光金属机身。',
      analysisText: '目标人群偏好冷白',
      productImageCount: 0,
      hasCopyReference: true,
      hasBrandLogo: true,
    });

    expect(onlyCopyRef).toContain('第1个参考图（即【文案标准参考图】）');
    expect(onlyCopyRef).toContain('第2个参考图（即【品牌 Logo】）');

    const onlyLogo = buildMainImagePrompt({
      requirement: '设计目标：一眼记住哑光金属机身。',
      analysisText: '目标人群偏好冷白',
      productImageCount: 0,
      hasCopyReference: false,
      hasBrandLogo: true,
    });

    expect(onlyLogo).toContain('第1个参考图（即【品牌 Logo】）');
  });

  it('主图排版常量保留套图内部一致性规则，且不再指向商业分析', () => {
    expect(MAIN_IMAGE_COPY_TYPOGRAPHY_PROMPT).toContain('字体家族、文案配色必须整套统一');
    expect(MAIN_IMAGE_COPY_TYPOGRAPHY_PROMPT).toContain('禁止一张衬线一张无衬线');
    expect(MAIN_IMAGE_COPY_TYPOGRAPHY_PROMPT).toContain('禁止各张自选字色');
    expect(MAIN_IMAGE_COPY_TYPOGRAPHY_PROMPT).not.toContain('【商业分析】');
    expect(MAIN_IMAGE_COPY_TYPOGRAPHY_PROMPT).not.toContain('【文案标准参考图】');
    expect(MAIN_IMAGE_COPY_TYPOGRAPHY_WITH_REFERENCE_PROMPT).toContain('【文案标准参考图】');
  });

  it('详情图有上一屏时标明参考图角色、当前屏主题卡与连贯句', () => {
    const prompt = buildDetailImagePrompt(
      '设计目标：建立品牌第一印象。\n展示重点：Logo 与定位。',
      '目标人群偏好冷白',
      2,
      true,
    );

    expect(prompt).toContain('第1至第2个参考图=用户上传的产品精修图');
    expect(prompt).toContain('不得把精修图的拍摄角度、取景远近或产品占画面大小复制到本屏');
    expect(prompt).toContain('第3个参考图=上一屏详情图');
    expect(prompt).toContain('【当前屏主题卡】');
    expect(prompt).toContain('设计目标：建立品牌第一印象。');
    expect(prompt).toContain(DETAIL_IMAGE_CONTINUITY_PROMPT);
    expect(prompt).toContain(
      '产品拍摄角度、取景远近与占画面比例必须按【当前屏主题卡】的展示重点重新决定',
    );
    expect(prompt).toContain('【商业分析】\n目标人群偏好冷白');
  });

  it('详情图无上一屏时不含上一屏角色说明与连贯句', () => {
    const prompt = buildDetailImagePrompt(
      '设计目标：建立品牌第一印象。',
      '目标人群偏好冷白',
      1,
      false,
    );

    expect(prompt).toContain('第1个参考图=用户上传的产品精修图');
    expect(prompt).not.toContain('上一屏');
    expect(prompt).not.toContain(DETAIL_IMAGE_CONTINUITY_PROMPT);
    expect(prompt).toContain('【当前屏主题卡】');
    expect(prompt).toContain(
      '产品拍摄角度、取景远近与占画面比例必须按【当前屏主题卡】的展示重点重新决定',
    );
  });

  it('详情图带产品资料时叠加【产品资料】段与事实优先级', () => {
    const prompt = buildDetailImagePrompt(
      '设计目标：建立品牌第一印象。\n展示重点：Logo 与定位。',
      '目标人群偏好冷白',
      1,
      false,
      '容量 500ml，品牌 凡域',
    );

    expect(prompt).toContain('【商业分析】\n目标人群偏好冷白');
    expect(prompt).toContain('【产品资料】\n容量 500ml，品牌 凡域');
    expect(prompt).toContain('第一手产品事实以【产品资料】为准，缺失时以【商业分析】为准');
    expect(prompt.indexOf('【商业分析】')).toBeLessThan(prompt.indexOf('【产品资料】'));
    expect(prompt.indexOf('【产品资料】')).toBeLessThan(prompt.indexOf('\n【当前屏主题卡】\n'));
  });

  it('详情图无产品资料时不出现【产品资料】段', () => {
    const prompt = buildDetailImagePrompt(
      '设计目标：建立品牌第一印象。\n展示重点：Logo 与定位。',
      '目标人群偏好冷白',
      1,
      false,
    );

    expect(prompt).not.toContain('【产品资料】');
  });

  it.each(ECOMMERCE_TASK_TYPES)('视觉设计为“%s”时包含类型要求与商业分析', (taskType) => {
    const prompt = buildDesignPrompt(taskType, '目标人群偏好暖色', true);

    expect(prompt).toContain(`“${taskType}”视觉设计成品`);
    expect(prompt).toContain('【商业分析】\n目标人群偏好暖色');
    expect(prompt).toContain('第1个参考图=用户上传的产品图');
    expect(prompt).toContain('第2个参考图=已选营销主视觉');
    expect(prompt).toContain('第3个及之后的参考图=同一位模特的身份与着装参考');
    expect(prompt).toContain('必须把该人物融合进成品画面并参与构图');
    expect(prompt).toContain('姿势、站位、动作与取景可按当前物料的广告设计需要调整');
    expect(prompt).toContain('产品必须稳定放置在场景中的支撑面');
    expect(prompt).toContain('产品与人物、场景的比例关系必须真实协调');
    expect(prompt).toContain('文字编排');
    expect(prompt).toContain('电影感定向光');
  });

  it('营销海报在有模特参考时将人物融入构图并锁定外貌与服装', () => {
    const prompt = buildDesignPrompt('营销海报', '分析', true);

    expect(prompt).toContain('该人物必须出现在海报中');
    expect(prompt).toContain('第2个参考图=已选营销主视觉');
    expect(prompt).toContain(
      '锁定性别、五官、脸型、肤色、发型、气质，以及服装款式、颜色、材质与关键服饰细节',
    );
    expect(prompt).toContain(
      '姿势、站位、动作与取景可按当前物料的广告设计需要调整，不必照搬参考图',
    );
    expect(prompt).not.toContain('不得沿用');
  });

  it('营销海报未带模特参考时不强制入画', () => {
    const prompt = buildDesignPrompt('营销海报', '分析', false);

    expect(prompt).not.toContain('该人物必须出现在海报中');
    expect(prompt).toContain('未带入模特参考图');
    expect(prompt).toContain('第2个参考图=已选营销主视觉');
  });
});

describe('产品多视角请求契约', () => {
  it('接受独立产品精修请求', () => {
    const parsed = parseGenerateBody({
      kind: 'productRefine',
      ...SPEC_FIELDS,
      count: 1,
      refineRequirement: '优化材质与光影',
      images: [
        {
          filename: 'product.png',
          mediaType: 'image/png',
          dataUrl: 'data:image/png;base64,AA==',
        },
      ],
    });

    expect(parsed?.kind).toBe('productRefine');
  });

  it('拒绝产品精修修改生成数量', () => {
    expect(
      parseGenerateBody({
        kind: 'productRefine',
        ...SPEC_FIELDS,
        count: 2,
        refineRequirement: '优化材质与光影',
        images: [
          {
            filename: 'product.png',
            mediaType: 'image/png',
            dataUrl: 'data:image/png;base64,AA==',
          },
        ],
      }),
    ).toBeNull();
  });

  it('接受基于精修标准图的独立多视角请求', () => {
    const parsed = parseGenerateBody({
      kind: 'productMultiview',
      ...SPEC_FIELDS,
      count: 1,
      multiviewRequirement: '统一光线生成六个角度',
      refinedImageDataUrls: ['data:image/png;base64,REFINED', 'data:image/png;base64,SIDE'],
    });

    expect(parsed?.kind).toBe('productMultiview');
    if (parsed?.kind === 'productMultiview') {
      expect(parsed.refinedImageDataUrls).toHaveLength(2);
      expect(parsed.count).toBe(1);
    }
  });

  it('拒绝产品多视角修改生成数量或缺少标准图', () => {
    expect(
      parseGenerateBody({
        kind: 'productMultiview',
        ...SPEC_FIELDS,
        count: 2,
        multiviewRequirement: '统一光线生成六个角度',
        refinedImageDataUrls: ['data:image/png;base64,REFINED'],
      }),
    ).toBeNull();
    expect(
      parseGenerateBody({
        kind: 'productMultiview',
        ...SPEC_FIELDS,
        count: 1,
        multiviewRequirement: '统一光线生成六个角度',
        refinedImageDataUrls: [],
      }),
    ).toBeNull();
  });

  it('拒绝空要求或缺失精修标准图', () => {
    expect(
      parseGenerateBody({
        kind: 'productRefine',
        ...SPEC_FIELDS,
        count: 1,
        refineRequirement: ' ',
        images: [
          {
            filename: 'product.png',
            mediaType: 'image/png',
            dataUrl: 'data:image/png;base64,AA==',
          },
        ],
      }),
    ).toBeNull();
    expect(
      parseGenerateBody({
        kind: 'productMultiview',
        ...SPEC_FIELDS,
        count: 1,
        multiviewRequirement: '生成六视图',
      }),
    ).toBeNull();
  });

  it('只需规格与产品图，不要求分析文本和产品要求', () => {
    const parsed = parseGenerateBody({
      kind: 'productView',
      ...SPEC_FIELDS,
      count: 1,
      images: [
        {
          filename: 'product.png',
          mediaType: 'image/png',
          dataUrl: 'data:image/png;base64,AA==',
        },
      ],
    });

    expect(parsed?.kind).toBe('productView');
  });

  it('接受产品图、视角要求和可选模特形象的独立产品模特请求', () => {
    const parsed = parseGenerateBody({
      kind: 'productModel',
      ...SPEC_FIELDS,
      count: 2,
      viewRequirement: '左侧半身，右侧正面、侧面、背面全身',
      images: [
        {
          filename: 'product.png',
          mediaType: 'image/png',
          dataUrl: 'data:image/png;base64,PRODUCT',
        },
      ],
      modelImages: [
        {
          filename: 'model.png',
          mediaType: 'image/png',
          dataUrl: 'data:image/png;base64,MODEL',
        },
      ],
    });

    expect(parsed?.kind).toBe('productModel');
  });

  it('拒绝缺少产品图、空视角要求或超过三张模特图的请求', () => {
    const base = {
      kind: 'productModel',
      ...SPEC_FIELDS,
      count: 1,
      viewRequirement: '四格视角',
      images: [
        {
          filename: 'product.png',
          mediaType: 'image/png',
          dataUrl: 'data:image/png;base64,PRODUCT',
        },
      ],
    } as const;
    const modelImage = {
      filename: 'model.png',
      mediaType: 'image/png',
      dataUrl: 'data:image/png;base64,MODEL',
    };

    expect(parseGenerateBody({ ...base, images: [] })).toBeNull();
    expect(parseGenerateBody({ ...base, viewRequirement: ' ' })).toBeNull();
    expect(parseGenerateBody({ ...base, modelImages: Array(4).fill(modelImage) })).toBeNull();
  });
});

describe('视觉设计请求契约', () => {
  const BASE_DESIGN_REQUEST = {
    kind: 'design',
    ...SPEC_FIELDS,
    count: 1,
    taskType: '主图',
    analysisText: '商业分析',
    productViewImages: [
      {
        filename: 'product.png',
        mediaType: 'image/png',
        dataUrl: 'data:image/png;base64,PRODUCT',
      },
    ],
  } as const;

  it('接受可选模特形象参考图', () => {
    const parsed = parseGenerateBody({
      ...BASE_DESIGN_REQUEST,
      includeModel: true,
      visualDataUrl: 'data:image/png;base64,VISUAL',
      modelImages: [
        {
          filename: 'model.png',
          mediaType: 'image/png',
          dataUrl: 'data:image/png;base64,MODEL',
        },
      ],
    });

    expect(parsed?.kind).toBe('design');
    expect(parsed && parsed.kind === 'design' ? parsed.modelImages : []).toHaveLength(1);
  });

  it('未带模特时仍需主视觉参考图', () => {
    const parsed = parseGenerateBody({
      ...BASE_DESIGN_REQUEST,
      includeModel: false,
      visualDataUrl: 'data:image/png;base64,VISUAL',
    });

    expect(parsed?.kind).toBe('design');
  });

  it('拒绝缺少主视觉或模特开关与参考图不一致的请求', () => {
    expect(
      parseGenerateBody({
        ...BASE_DESIGN_REQUEST,
        includeModel: false,
      }),
    ).toBeNull();
    expect(
      parseGenerateBody({
        ...BASE_DESIGN_REQUEST,
        includeModel: true,
        visualDataUrl: 'data:image/png;base64,VISUAL',
      }),
    ).toBeNull();
  });
});

describe('营销主视觉请求契约', () => {
  const BASE_VISUAL_REQUEST = {
    kind: 'visual',
    ...SPEC_FIELDS,
    count: 1,
    analysisText: '商业分析',
    productViewImages: [
      {
        filename: 'product.png',
        mediaType: 'image/png',
        dataUrl: 'data:image/png;base64,PRODUCT',
      },
    ],
  } as const;

  it('接受商业分析与全部产品图', () => {
    const parsed = parseGenerateBody(BASE_VISUAL_REQUEST);

    expect(parsed?.kind).toBe('visual');
    expect(parsed && parsed.kind === 'visual' ? parsed.productViewImages : []).toHaveLength(1);
  });

  it('缺少产品图或无商业分析时拒绝', () => {
    expect(parseGenerateBody({ ...BASE_VISUAL_REQUEST, productViewImages: [] })).toBeNull();
    expect(parseGenerateBody({ ...BASE_VISUAL_REQUEST, analysisText: '' })).toBeNull();
  });
});

describe('电商主图请求契约', () => {
  const BASE_MAIN_IMAGE_REQUEST = {
    kind: 'mainImage',
    ...SPEC_FIELDS,
    count: 2,
    analysisText: '目标人群偏好冷白',
    requirements: [{ themeId: 'scene', title: '使用场景', requirement: '本轮只出使用场景' }],
    productViewImages: [
      {
        filename: 'product.png',
        mediaType: 'image/png',
        dataUrl: 'data:image/png;base64,PRODUCT',
      },
    ],
  } as const;

  it('接受商业分析、主题要求与产品精修图', () => {
    const parsed = parseGenerateBody(BASE_MAIN_IMAGE_REQUEST);

    expect(parsed?.kind).toBe('mainImage');
    expect(parsed && parsed.kind === 'mainImage' ? parsed.analysisText : '').toBe(
      '目标人群偏好冷白',
    );
    expect(parsed && parsed.kind === 'mainImage' ? parsed.requirements : []).toEqual([
      { themeId: 'scene', title: '使用场景', requirement: '本轮只出使用场景' },
    ]);
  });

  it('接受空产品精修图（非必填），但缺主题要求时拒绝', () => {
    const withoutProductImages = parseGenerateBody({
      ...BASE_MAIN_IMAGE_REQUEST,
      productViewImages: [],
    });
    expect(withoutProductImages?.kind).toBe('mainImage');
    expect(
      withoutProductImages && withoutProductImages.kind === 'mainImage'
        ? withoutProductImages.productViewImages
        : null,
    ).toEqual([]);

    expect(parseGenerateBody({ ...BASE_MAIN_IMAGE_REQUEST, requirements: [] })).toBeNull();
  });

  it('详情图仍必须有产品精修图', () => {
    expect(
      parseGenerateBody({
        kind: 'detailImage',
        ...SPEC_FIELDS,
        count: 1,
        analysisText: '商业分析',
        requirements: [{ themeId: 'brand', title: '品牌认知', requirement: '建立品牌第一印象' }],
        productViewImages: [],
      }),
    ).toBeNull();
  });

  it('商业分析非必填，但与主图说明至少一项非空', () => {
    // 商业分析为空但填了主图说明 → 通过
    const withDescription = parseGenerateBody({
      ...BASE_MAIN_IMAGE_REQUEST,
      analysisText: '',
      mainImageDescription: '底色走冷白',
    });
    expect(withDescription?.kind).toBe('mainImage');
    expect(
      withDescription && withDescription.kind === 'mainImage'
        ? withDescription.mainImageDescription
        : '',
    ).toBe('底色走冷白');

    // 两者皆空（含全空白）→ 拒绝
    expect(parseGenerateBody({ ...BASE_MAIN_IMAGE_REQUEST, analysisText: '' })).toBeNull();
    expect(
      parseGenerateBody({
        ...BASE_MAIN_IMAGE_REQUEST,
        analysisText: ' ',
        mainImageDescription: '   ',
      }),
    ).toBeNull();
  });

  it('可附带品牌 Logo data URL，缺省为 undefined，且必须是 data URL', () => {
    const parsed = parseGenerateBody({
      ...BASE_MAIN_IMAGE_REQUEST,
      brandLogoDataUrl: 'data:image/png;base64,LOGO',
    });
    expect(parsed && parsed.kind === 'mainImage' ? parsed.brandLogoDataUrl : '').toBe(
      'data:image/png;base64,LOGO',
    );

    const withoutLogo = parseGenerateBody(BASE_MAIN_IMAGE_REQUEST);
    expect(
      withoutLogo && withoutLogo.kind === 'mainImage' ? withoutLogo.brandLogoDataUrl : '',
    ).toBeUndefined();

    expect(
      parseGenerateBody({ ...BASE_MAIN_IMAGE_REQUEST, brandLogoDataUrl: 'https://x/y.png' }),
    ).toBeNull();
  });

  it('商业分析仍必须是非空字符串字段，不接受非字符串', () => {
    expect(parseGenerateBody({ ...BASE_MAIN_IMAGE_REQUEST, analysisText: undefined })).toBeNull();
  });

  it('可附带产品资料正文，缺省为 undefined', () => {
    const withDocs = { ...BASE_MAIN_IMAGE_REQUEST, productDocumentsText: '容量 500ml' };
    const parsed = parseGenerateBody(withDocs);
    expect(parsed && parsed.kind === 'mainImage' ? parsed.productDocumentsText : '').toBe(
      '容量 500ml',
    );

    const withoutDocs = parseGenerateBody(BASE_MAIN_IMAGE_REQUEST);
    expect(
      withoutDocs && withoutDocs.kind === 'mainImage' ? withoutDocs.productDocumentsText : '',
    ).toBeUndefined();
  });

  it('可附带文案标准参考图，缺省为 undefined，且必须是 data URL', () => {
    const parsed = parseGenerateBody({
      ...BASE_MAIN_IMAGE_REQUEST,
      copyStyleReferenceDataUrl: 'data:image/png;base64,REF',
    });
    expect(parsed && parsed.kind === 'mainImage' ? parsed.copyStyleReferenceDataUrl : '').toBe(
      'data:image/png;base64,REF',
    );

    const withoutRef = parseGenerateBody(BASE_MAIN_IMAGE_REQUEST);
    expect(
      withoutRef && withoutRef.kind === 'mainImage' ? withoutRef.copyStyleReferenceDataUrl : '',
    ).toBeUndefined();

    expect(
      parseGenerateBody({
        ...BASE_MAIN_IMAGE_REQUEST,
        copyStyleReferenceDataUrl: 'https://x/y.png',
      }),
    ).toBeNull();
  });
});

describe('电商详情图请求契约', () => {
  const BASE_DETAIL_IMAGE_REQUEST = {
    kind: 'detailImage',
    ...SPEC_FIELDS,
    count: 1,
    analysisText: '目标人群偏好冷白',
    requirements: [{ themeId: 'brand', title: '品牌认知', requirement: '建立品牌第一印象' }],
    productViewImages: [
      {
        filename: 'product.png',
        mediaType: 'image/png',
        dataUrl: 'data:image/png;base64,PRODUCT',
      },
    ],
  } as const;

  it('接受商业分析、当前屏主题卡与产品精修图', () => {
    const parsed = parseGenerateBody(BASE_DETAIL_IMAGE_REQUEST);

    expect(parsed?.kind).toBe('detailImage');
    expect(parsed && parsed.kind === 'detailImage' ? parsed.requirements : []).toEqual([
      { themeId: 'brand', title: '品牌认知', requirement: '建立品牌第一印象' },
    ]);
  });

  it('可附带上一屏参考图', () => {
    const parsed = parseGenerateBody({
      ...BASE_DETAIL_IMAGE_REQUEST,
      previousScreenDataUrl: 'data:image/png;base64,PREV',
    });

    expect(parsed?.kind).toBe('detailImage');
    expect(parsed && parsed.kind === 'detailImage' ? parsed.previousScreenDataUrl : '').toBe(
      'data:image/png;base64,PREV',
    );
  });

  it('缺少产品图、商业分析或主题要求时拒绝', () => {
    expect(parseGenerateBody({ ...BASE_DETAIL_IMAGE_REQUEST, productViewImages: [] })).toBeNull();
    expect(parseGenerateBody({ ...BASE_DETAIL_IMAGE_REQUEST, analysisText: ' ' })).toBeNull();
    expect(parseGenerateBody({ ...BASE_DETAIL_IMAGE_REQUEST, requirements: [] })).toBeNull();
  });
});
