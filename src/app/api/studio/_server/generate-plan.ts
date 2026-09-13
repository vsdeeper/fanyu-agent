import 'server-only';

import type { StudioGenerateRequest } from '../_shared/generate-types';
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

/** 单张出图任务：已算好的 prompt 与参考图。 */
export type StudioGeneratePlanItem = {
  index: number;
  prompt: string;
  referenceImageDataUrls: string[];
};

/**
 * 把各 kind 的分组/数量语义摊平成**有序的单张出图清单**。
 *
 * 三条展开规则：产品精修按上传原图一对一（忽略表单数量）；主图/详情图按「主题 × 数量」；
 * 其余 kind 单一 prompt 按表单数量重复。NDJSON 流式路由与后台作业共用这一份展开，
 * 避免两处各写一遍导致顺序或 index 对不上。
 */
export function buildGeneratePlan(body: StudioGenerateRequest): StudioGeneratePlanItem[] {
  if (body.kind === 'productRefine') {
    const prompt = buildProductRefinePrompt(body.refineRequirement, body.images.length);
    return body.images.map((image, index) => ({
      index,
      prompt,
      referenceImageDataUrls: [image.dataUrl],
    }));
  }

  if (body.kind === 'mainImage' || body.kind === 'detailImage') {
    const count = body.count;
    const productImageCount = body.productViewImages.length;
    // 参考图数组顺序固定为「产品精修图 → 点选参考图（主图=文案标准参考图，详情图=上一屏）→ 品牌 Logo」，
    // 两种任务的额外参考图恒为末尾且 Logo 在后，故 prompt 可按张数点名序号
    const copyStyleReferenceDataUrl =
      body.kind === 'mainImage' ? body.copyStyleReferenceDataUrl : undefined;
    const brandLogoDataUrl = body.brandLogoDataUrl;
    const hasCopyReference = Boolean(copyStyleReferenceDataUrl);
    const hasBrandLogo = Boolean(brandLogoDataUrl);
    const hasPreviousScreen =
      body.kind === 'detailImage' ? Boolean(body.previousScreenDataUrl) : false;
    const referenceImageDataUrls =
      body.kind === 'detailImage'
        ? [
            ...body.productViewImages.map((image) => image.dataUrl),
            ...(body.previousScreenDataUrl ? [body.previousScreenDataUrl] : []),
            ...(brandLogoDataUrl ? [brandLogoDataUrl] : []),
          ]
        : [
            ...body.productViewImages.map((image) => image.dataUrl),
            ...(copyStyleReferenceDataUrl ? [copyStyleReferenceDataUrl] : []),
            ...(brandLogoDataUrl ? [brandLogoDataUrl] : []),
          ];

    const plan: StudioGeneratePlanItem[] = [];
    for (const item of body.requirements) {
      const prompt =
        body.kind === 'detailImage'
          ? buildDetailImagePrompt({
              requirement: item.requirement,
              analysisText: body.analysisText,
              productImageCount,
              hasPreviousScreen,
              hasBrandLogo,
              productDocumentsText: body.productDocumentsText,
            })
          : buildMainImagePrompt({
              requirement: item.requirement,
              analysisText: body.analysisText,
              productImageCount,
              hasCopyReference,
              hasBrandLogo,
              productDocumentsText: body.productDocumentsText,
            });
      for (let i = 0; i < count; i++) {
        plan.push({ index: plan.length, prompt, referenceImageDataUrls });
      }
    }
    return plan;
  }

  let prompt: string;
  let referenceImageDataUrls: string[];
  if (body.kind === 'productMultiview') {
    prompt = buildProductMultiviewPrompt(body.multiviewRequirement);
    referenceImageDataUrls = body.refinedImageDataUrls;
  } else if (body.kind === 'productView') {
    prompt = buildProductViewPrompt();
    referenceImageDataUrls = body.images.map((image) => image.dataUrl);
  } else if (body.kind === 'productModel') {
    prompt = buildProductModelPrompt(
      body.viewRequirement,
      body.images.length,
      (body.modelImages?.length ?? 0) > 0,
    );
    referenceImageDataUrls = [
      ...body.images.map((image) => image.dataUrl),
      ...(body.modelImages?.map((image) => image.dataUrl) ?? []),
    ];
  } else if (body.kind === 'visual') {
    // 参考图数组顺序固定为「产品精修图 → 品牌 Logo」，两者都可缺省，prompt 按真实张数点名序号
    prompt = buildVisualPrompt({
      analysisText: body.analysisText,
      productImageCount: body.productViewImages.length,
      hasBrandLogo: Boolean(body.brandLogoDataUrl),
    });
    referenceImageDataUrls = [
      ...body.productViewImages.map((image) => image.dataUrl),
      ...(body.brandLogoDataUrl ? [body.brandLogoDataUrl] : []),
    ];
  } else {
    // 参考图数组顺序固定为「产品精修图 → 主视觉 → 品牌 Logo → 模特图」，除主视觉外都可缺省
    prompt = buildDesignPrompt({
      taskType: body.taskType,
      analysisText: body.analysisText,
      includeModel: body.includeModel,
      productImageCount: body.productViewImages.length,
      hasBrandLogo: Boolean(body.brandLogoDataUrl),
    });
    referenceImageDataUrls = [
      ...body.productViewImages.map((image) => image.dataUrl),
      body.visualDataUrl,
      ...(body.brandLogoDataUrl ? [body.brandLogoDataUrl] : []),
      ...(body.modelImages?.map((image) => image.dataUrl) ?? []),
    ];
  }

  return Array.from({ length: body.count }, (_, index) => ({
    index,
    prompt,
    referenceImageDataUrls,
  }));
}
