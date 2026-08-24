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

const KEYWORD_FIRST_HIT = 0.72;
const KEYWORD_EXTRA_HIT = 0.08;
const NAME_BONUS = 0.2;
const DESC_FIRST_HIT = 0.08;
const DESC_EXTRA_HIT = 0.04;

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

function bandOf(score: number): SkillMatchBand {
  if (score >= SKILL_SCORE_HIGH) return 'high';
  if (score >= SKILL_SCORE_MEDIUM) return 'medium';
  return 'low';
}

/**
 * 对单个 skill 打分：关键词主分 + description 辅分 + 名称/id 加分，封顶 1.0。
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
 * 按用户文本对全部 skill 打分并分档。
 * High 直接激活；未达 High 时仅 sticky 短 follow-up（且无其它 High 新领域）可降阈激活；其余不激活。
 * 手动 /id 不走本函数（由 resolve-turn 合并）。
 */
export function matchSkillsByIntent(
  text: string,
  stickyIds: string[],
  options?: { log?: boolean },
): SkillMatchResult[] {
  const skills = listSkills();
  const stickySet = new Set(stickyIds);
  const scores = skills.map((skill) => ({
    skill,
    score: scoreSkill(text, skill),
  }));

  const hasNewDomainIntent = scores.some(
    ({ skill, score }) => score >= SKILL_SCORE_HIGH && !stickySet.has(skill.id),
  );
  const followup = isStickyFollowup(text);

  const matches: SkillMatchResult[] = scores.map(({ skill, score }) => {
    const band = bandOf(score);
    if (band === 'high') {
      return { id: skill.id, score, band, activated: true, reason: 'high' };
    }

    const stickyFollowup = stickySet.has(skill.id) && followup && !hasNewDomainIntent;
    if (stickyFollowup && (band === 'medium' || band === 'low')) {
      return { id: skill.id, score, band, activated: true, reason: 'sticky-followup' };
    }

    return { id: skill.id, score, band, activated: false, reason: 'below-threshold' };
  });

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
