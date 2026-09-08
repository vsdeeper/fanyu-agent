import 'server-only';

import type { DetailImageThemeId } from '@/app/api/studio/ecommerce/_shared/detail-image-plan';
import type { RewriteCardPeer } from '@/app/api/studio/ecommerce/_shared/rewrite-card';
import {
  DETAIL_IMAGE_REQUIREMENT_SAMPLE,
  formatDetailImageRequirement,
} from '@/app/api/studio/ecommerce/_shared/detail-image-requirement';
import { REWRITE_CARD_POLISH_TEMPERATURE, REWRITE_CARD_RANDOM_TEMPERATURE } from './constants';
import { DETAIL_IMAGE_THEME_DUTIES, detailThemeTitle } from './rewrite-card-instructions';

const FORMAT_SAMPLE = `【输出格式样例】（仅示意结构，内容须按本屏职责与商业分析重写）
${DETAIL_IMAGE_REQUIREMENT_SAMPLE}`;

/**
 * 有用户草稿用较低温度润色，无草稿用较高温度随机生成。
 */
export function rewriteCardTemperature(draft: string): number {
  return draft.trim() ? REWRITE_CARD_POLISH_TEMPERATURE : REWRITE_CARD_RANDOM_TEMPERATURE;
}

/**
 * 组装帮写用户 prompt：本屏职责、商业分析、其它卡互斥、草稿或随机指令。
 */
export function buildRewriteCardPrompt(input: {
  themeId: DetailImageThemeId;
  draft: string;
  otherCards: RewriteCardPeer[];
  analysisText: string;
}): string {
  const title = detailThemeTitle(input.themeId);
  const peers = input.otherCards.filter((card) => card.themeId !== input.themeId);
  const peerBlock =
    peers.length === 0
      ? '（暂无其它屏）'
      : peers.map((card) => `## ${card.title}\n${card.requirement.trim()}`).join('\n\n');

  const draft = input.draft.trim();
  const draftBlock = draft
    ? ['【用户草稿】请据此扩写或润色成统一格式，保留用户意图，不要另起无关主题。', draft].join('\n')
    : '【随机生成】用户未提供草稿。请根据商业分析为本屏职责换一个新的信息切片；禁止复述其它屏，禁止空泛套话。';

  return [
    `【当前屏】${title}`,
    `【本屏职责】${DETAIL_IMAGE_THEME_DUTIES[input.themeId]}`,
    `【商业分析】\n${input.analysisText.trim()}`,
    `【其它屏（必须互斥，禁止复用其卖点、细节、场景、机位）】\n${peerBlock}`,
    draftBlock,
    FORMAT_SAMPLE,
    '请只输出当前屏正文。',
  ].join('\n\n');
}

/**
 * 清洗帮写结果，收成设计目标 + 展示重点列表。
 */
export function sanitizeRewriteCardOutput(raw: string): string {
  return formatDetailImageRequirement(raw);
}
