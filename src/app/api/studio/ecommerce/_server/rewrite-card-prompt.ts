import 'server-only';

import type { DetailImageThemeId } from '@/app/api/studio/ecommerce/_shared/detail-image-plan';
import type { MainImageThemeId } from '@/app/api/studio/ecommerce/_shared/main-image-plan';
import type {
  RewriteCardKind,
  RewriteCardPeer,
} from '@/app/api/studio/ecommerce/_shared/rewrite-card';
import { DETAIL_IMAGE_REQUIREMENT_SAMPLE } from '@/app/api/studio/ecommerce/_shared/detail-image-requirement';
import { MAIN_IMAGE_REQUIREMENT_SAMPLE } from '@/app/api/studio/ecommerce/_shared/main-image-requirement';
import { formatThemePlanRequirement } from '@/app/api/studio/ecommerce/_shared/theme-plan-requirement';
import { REWRITE_CARD_POLISH_TEMPERATURE, REWRITE_CARD_RANDOM_TEMPERATURE } from './constants';
import {
  DETAIL_IMAGE_THEME_DUTIES,
  MAIN_IMAGE_THEME_DUTIES,
  detailThemeTitle,
  mainImageThemeTitle,
} from './rewrite-card-instructions';

/** 按任务域切换 prompt 措辞与样例：主图论「张」，详情图论「屏」。 */
const PROMPT_BY_KIND: Record<
  RewriteCardKind,
  {
    formatSample: string;
    currentLabel: string;
    dutyLabel: string;
    peersLabel: string;
    noPeersLabel: string;
    randomLabel: string;
    outputLabel: string;
  }
> = {
  mainImage: {
    formatSample: `【输出格式样例】（仅示意结构，内容须按本张职责与商业分析重写）\n${MAIN_IMAGE_REQUIREMENT_SAMPLE}`,
    currentLabel: '【当前张】',
    dutyLabel: '【本张职责】',
    peersLabel: '【其它张（必须互斥，禁止复用其卖点、细节、场景、机位）】',
    noPeersLabel: '（暂无其它张）',
    randomLabel:
      '【随机生成】用户未提供草稿。请根据本批提供的商业分析 / 主图说明为本张职责换一个新的信息切片；禁止复述其它张，禁止空泛套话。',
    outputLabel: '请只输出当前张正文。',
  },
  detailImage: {
    formatSample: `【输出格式样例】（仅示意结构，内容须按本屏职责与商业分析重写）\n${DETAIL_IMAGE_REQUIREMENT_SAMPLE}`,
    currentLabel: '【当前屏】',
    dutyLabel: '【本屏职责】',
    peersLabel: '【其它屏（必须互斥，禁止复用其卖点、细节、场景、机位）】',
    noPeersLabel: '（暂无其它屏）',
    randomLabel:
      '【随机生成】用户未提供草稿。请根据商业分析为本屏职责换一个新的信息切片；禁止复述其它屏，禁止空泛套话。',
    outputLabel: '请只输出当前屏正文。',
  },
};

/**
 * 有用户草稿用较低温度润色，无草稿用较高温度随机生成。
 */
export function rewriteCardTemperature(draft: string): number {
  return draft.trim() ? REWRITE_CARD_POLISH_TEMPERATURE : REWRITE_CARD_RANDOM_TEMPERATURE;
}

/**
 * 组装帮写用户 prompt：本卡/本屏职责、商业分析、可选主图说明与产品资料、其它卡互斥、草稿或随机指令。
 *
 * 商业分析在主图任务里非必填，故资料段一律仅在有内容时追加，不留空的【商业分析】段。
 */
export function buildRewriteCardPrompt(input: {
  kind: RewriteCardKind;
  themeId: MainImageThemeId | DetailImageThemeId;
  draft: string;
  otherCards: RewriteCardPeer[];
  analysisText: string;
  mainImageDescription?: string;
  productDocumentsText?: string;
}): string {
  const { kind } = input;
  const wording = PROMPT_BY_KIND[kind];
  // kind 与 themeId 的配对由请求 schema（可辨识联合）保证，此处按 kind 取同域职责与标题
  const title =
    kind === 'mainImage'
      ? mainImageThemeTitle(input.themeId as MainImageThemeId)
      : detailThemeTitle(input.themeId as DetailImageThemeId);
  const duty =
    kind === 'mainImage'
      ? MAIN_IMAGE_THEME_DUTIES[input.themeId as MainImageThemeId]
      : DETAIL_IMAGE_THEME_DUTIES[input.themeId as DetailImageThemeId];

  const peers = input.otherCards.filter((card) => card.themeId !== input.themeId);
  const peerBlock =
    peers.length === 0
      ? wording.noPeersLabel
      : peers.map((card) => `## ${card.title}\n${card.requirement.trim()}`).join('\n\n');

  const draft = input.draft.trim();
  const draftBlock = draft
    ? ['【用户草稿】请据此扩写或润色成统一格式，保留用户意图，不要另起无关主题。', draft].join('\n')
    : wording.randomLabel;

  const analysisText = input.analysisText.trim();
  const mainDescription = input.mainImageDescription?.trim();
  const productDocsText = input.productDocumentsText?.trim();
  return [
    `${wording.currentLabel}${title}`,
    `${wording.dutyLabel}${duty}`,
    ...(analysisText ? [`【商业分析】\n${analysisText}`] : []),
    ...(mainDescription ? [`【主图说明】\n${mainDescription}`] : []),
    ...(productDocsText ? [`【产品资料】\n${productDocsText}`] : []),
    `${wording.peersLabel}\n${peerBlock}`,
    draftBlock,
    wording.formatSample,
    wording.outputLabel,
  ].join('\n\n');
}

/**
 * 清洗帮写结果，收成设计目标 + 展示重点列表（主图与详情图共用格式）。
 */
export function sanitizeRewriteCardOutput(raw: string): string {
  return formatThemePlanRequirement(raw);
}
