import 'server-only';

import {
  SKILL_SCORE_HIGH,
  SKILL_SCORE_MEDIUM,
  STICKY_FOLLOWUP_CUES,
  STICKY_FOLLOWUP_MAX_CHARS,
} from './constants';
import { listSkills } from './registry';
import type { Skill } from '../types';

export type SkillMatchBand = 'high' | 'medium' | 'low';

export type SkillMatchReason = 'high' | 'sticky-followup' | 'below-threshold';

export type SkillMatchResult = {
  id: string;
  score: number;
  band: SkillMatchBand;
  activated: boolean;
  reason: SkillMatchReason;
};

/**
 * 关键词主分：首命中 0.72，略高于 SKILL_SCORE_HIGH(0.70)，使「命中一个 activationKeywords」
 * 即可单独过自动激活线，不依赖 description 辅分，也不受词表长度稀释（不用 命中数/总数 比例）。
 */
const KEYWORD_FIRST_HIT = 0.72;
/** 每多命中一个关键词再 +0.08，表示意图更明确，但递减贡献，避免堆词爆表 */
const KEYWORD_EXTRA_HIT = 0.08;
/** 用户直接说出 skill 中文名或 id 时的加分；单独 0.2 不过线，常与关键词/description 叠加 */
const NAME_BONUS = 0.2;
/** description 词面辅分首命中；权重低，单独难以触发 High，减少泛化词误触 */
const DESC_FIRST_HIT = 0.08;
/** description 额外命中加分，最多再计 3 次，防止长 description 叠分过高 */
const DESC_EXTRA_HIT = 0.04;

/** description 切词后去掉的泛化片段，避免「生成」「高端」等拉高误触 */
const DESC_STOPWORDS = new Set([
  '生成',
  '高端',
  '适用于',
  '适用',
  '可选',
  '默认',
  '参考图',
  '横向',
  '构图',
  '一区块一图',
]);

/**
 * 从 description 抽出辅助匹配词（标点切分后的片段），去掉过于泛化的停用词。
 */
function extractDescTerms(description: string): string[] {
  const terms: string[] = [];
  const seen = new Set<string>();
  for (const part of description.split(/[：:，,。、／/（）()\s]+/)) {
    const term = part.trim().toLowerCase();
    if (term.length < 2 || DESC_STOPWORDS.has(term) || seen.has(term)) continue;
    seen.add(term);
    terms.push(term);
  }
  return terms;
}

/**
 * 将连续分数映射为三档信度，阈值见 constants.ts（High ≥0.70 / Medium ≥0.55）。
 */
function bandOf(score: number): SkillMatchBand {
  if (score >= SKILL_SCORE_HIGH) return 'high';
  if (score >= SKILL_SCORE_MEDIUM) return 'medium';
  return 'low';
}

/**
 * 对单个 skill 做确定性意图打分（无 LLM），子串匹配、大小写不敏感，结果封顶 1.0。
 *
 * 合成公式（各项可叠加）：
 * - name/id：命中 +0.20
 * - activationKeywords：首命中 +0.72，第 n 个额外命中 +0.08×(n−1)
 * - description 词面：首命中 +0.08，额外命中 +0.04×min(n−1, 3)
 *
 * 示例（仅关键词）：
 * - 1 个关键词 → 0.72 → High，可自动激活
 * - 2 个关键词 → 0.80 → High
 * - 0 关键词、仅 description 若干词 → 通常 <0.70，不自动激活
 */
export function scoreSkill(text: string, skill: Skill): number {
  const hay = text.toLowerCase();
  let score = 0;

  if (hay.includes(skill.id.toLowerCase()) || hay.includes(skill.name.toLowerCase())) {
    score += NAME_BONUS;
  }

  const keywords = skill.activationKeywords ?? [];
  let keywordHits = 0;
  for (const keyword of keywords) {
    if (keyword && hay.includes(keyword.toLowerCase())) {
      keywordHits += 1;
    }
  }
  if (keywordHits > 0) {
    // 首命中承担主信号；后续命中边际递减，公式：0.72 + 0.08×(hits−1)
    score += KEYWORD_FIRST_HIT + KEYWORD_EXTRA_HIT * (keywordHits - 1);
  }

  const descTerms = extractDescTerms(skill.description);
  let descHits = 0;
  for (const term of descTerms) {
    if (hay.includes(term)) {
      descHits += 1;
    }
  }
  if (descHits > 0) {
    // 辅分封顶：额外最多计 3 次，公式：0.08 + 0.04×min(hits−1, 3)
    score += DESC_FIRST_HIT + DESC_EXTRA_HIT * Math.min(descHits - 1, 3);
  }

  return Math.min(1, score);
}

function hasFollowupCue(text: string): boolean {
  const hay = text.toLowerCase();
  return STICKY_FOLLOWUP_CUES.some((cue) => hay.includes(cue.toLowerCase()));
}

/**
 * 是否为 sticky 短 follow-up：字数 ≤ 上限且含修订线索。
 */
function isStickyFollowup(text: string): boolean {
  return text.trim().length <= STICKY_FOLLOWUP_MAX_CHARS && hasFollowupCue(text);
}

/**
 * 按用户文本对全部 skill 打分并决定是否自动 Activation。
 *
 * 入参：
 * - `text`：本轮最新 user 消息正文（resolve-turn 已 trim）
 * - `stickyIds`：历史 sticky ∪ 客户端 skillIds，供 follow-up 降阈与「新领域」判断
 *
 * 激活规则（手动 /id 不走本函数，由 resolve-turn 直接并入 turnActivated）：
 * 1. score ≥ High(0.70) → activated，reason: high
 * 2. 否则若该 skill 已在 sticky，且本轮为短 follow-up（≤40 字 + 修订线索），
 *    且没有「其它非 sticky skill 达 High」的新领域意图 → 降阈激活，reason: sticky-followup
 * 3. 其余 → 不激活，reason: below-threshold（Discovery 目录仍常驻，但不注入正文）
 *
 * 返回每个 skill 的匹配结果（含未激活项），供 resolve-turn 筛 `activated` 与观测日志。
 */
export function matchSkillsByIntent(
  text: string,
  stickyIds: string[],
  options?: { log?: boolean },
): SkillMatchResult[] {
  const skills = listSkills();
  const stickySet = new Set(stickyIds);

  // 对每个 skill 独立打分；多 skill 可同时达 High（如同时提「品牌板」与「落地页」）
  const scores = skills.map((skill) => ({
    skill,
    score: scoreSkill(text, skill),
  }));

  // 「新领域」：存在某个 skill 分数达 High，且它不在当前 sticky 里。
  // 用于挡住 sticky follow-up 误续：例如已在 brandkit 会话里用户说「帮我做落地页」，
  // web-design 达 High → hasNewDomainIntent=true → brandkit 不再因短句降阈续活。
  const hasNewDomainIntent = scores.some(
    ({ skill, score }) => score >= SKILL_SCORE_HIGH && !stickySet.has(skill.id),
  );

  // 短 follow-up：字数与修订线索合取，避免「今天天气怎么样」这类闲聊触发降阈
  const followup = isStickyFollowup(text);

  const matches: SkillMatchResult[] = scores.map(({ skill, score }) => {
    const band = bandOf(score);

    // 路径 1：分数过 High 线，直接自动激活（与 band 是否为 medium 无关，high 已覆盖）
    if (band === 'high') {
      return { id: skill.id, score, band, activated: true, reason: 'high' };
    }

    // 路径 2：降阈续活——三个条件同时满足：
    // (a) 本 skill 已在 sticky（用户曾手动选过或历史自动激活过）
    // (b) 本轮是短句修订（如「改成 2×3」「确认出图」）
    // (c) 没有其它 skill 以 High 分表达新任务（避免旧 skill 抢新意图）
    const stickyFollowup = stickySet.has(skill.id) && followup && !hasNewDomainIntent;
    if (stickyFollowup && (band === 'medium' || band === 'low')) {
      return { id: skill.id, score, band, activated: true, reason: 'sticky-followup' };
    }

    // 路径 3：未达 High 且不满足降阈 → 本轮不注入正文；Discovery 目录仍可见该 skill
    return { id: skill.id, score, band, activated: false, reason: 'below-threshold' };
  });

  // 默认打日志；stream-chat 二次调用时传 log:false 避免与 handle-post 重复
  if (options?.log !== false) {
    console.info(
      '[skills] intent-match',
      matches.map(({ id, score, band, activated, reason }) => ({
        id,
        score: Number(score.toFixed(3)),
        band,
        activated,
        reason,
      })),
    );
  }

  return matches;
}
