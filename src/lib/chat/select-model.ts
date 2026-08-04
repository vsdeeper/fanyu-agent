import type { UIMessage } from 'ai';

import { requireEnv } from '@/lib/shared/env';

/** 模型档次：pro（复杂推理/代码/长文）、lite（通用均衡）、mini（简单问候/短查询） */
export type ModelTier = 'pro' | 'lite' | 'mini';

const MODEL_TIER_ENV: Record<ModelTier, string> = {
  pro: 'ARK_MODEL_PRO',
  lite: 'ARK_MODEL_LITE',
  mini: 'ARK_MODEL_MINI',
};

/** 短文本视为 mini 的长度上限（字符数） */
const MINI_LENGTH_THRESHOLD = 20;
/** 长文本视为 pro 的长度下限（字符数） */
const PRO_LENGTH_THRESHOLD = 120;
/** 会话 user 消息数 ≥ 该值时禁止降级到 mini，防止"继续/嗯"丢上下文 */
const KEEP_LITE_MIN_TURNS = 4;

/** 命中即视为 pro 的中文关键词（覆盖代码、推理、长文、数学等） */
const COMPLEX_KEYWORDS_ZH = [
  '代码',
  '函数',
  '报错',
  '调试',
  '重构',
  '算法',
  '架构',
  '数据库',
  '正则',
  '接口',
  '性能',
  '并发',
  '异步',
  '线程',
  '部署',
  '测试',
  '分析',
  '比较',
  '对比',
  '总结',
  '讲解',
  '解释',
  '为什么',
  '如何',
  '怎么',
  '怎样',
  '什么是',
  '推导',
  '证明',
  '设计',
  '实现',
  '方案',
  '调研',
  '写作',
  '文章',
  '报告',
  '论文',
  '方程',
  '矩阵',
  '微积分',
];

/** 命中即视为 pro 的英文关键词（整词匹配，避免 capital/rapid 等误命中） */
const COMPLEX_KEYWORDS_EN = [
  'bug',
  'sql',
  'api',
  'regex',
  'typescript',
  'javascript',
  'python',
  'java',
  'react',
  'node',
  'json',
  'git',
  'docker',
  'performance',
  'debug',
];

/** 抽取 UIMessage 文本内容（text part 拼接） */
function getPartsText(message: UIMessage): string {
  if (!message.parts?.length) return '';
  return message.parts
    .filter((part) => part.type === 'text' && 'text' in part && typeof part.text === 'string')
    .map((part) => ('text' in part && typeof part.text === 'string' ? part.text : ''))
    .join('');
}

/** 取最后一条 user 消息的文本；无文本时返回空串 */
function getLastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === 'user') {
      const text = getPartsText(messages[i]).trim();
      if (text) return text;
    }
  }
  return '';
}

function hasComplexKeyword(text: string): boolean {
  if (COMPLEX_KEYWORDS_ZH.some((keyword) => text.includes(keyword))) return true;
  const lower = text.toLowerCase();
  return COMPLEX_KEYWORDS_EN.some((keyword) => new RegExp(`\\b${keyword}\\b`).test(lower));
}

/**
 * 纯函数复杂度分类：输入最后一条 user 文本，返回模型档次。
 * 规则（自上而下，首个命中即返回）：
 * 1. 命中复杂关键词 → pro（代码/推理/写作/数学）
 * 2. 长度 ≥ PRO_LENGTH_THRESHOLD → pro（长文）
 * 3. 长度 ≤ MINI_LENGTH_THRESHOLD → mini（短查询/问候）
 * 4. 其余 → lite（均衡兜底）
 */
export function classifyTier(text: string): ModelTier {
  const trimmed = text.trim();
  if (!trimmed) return 'lite';
  if (hasComplexKeyword(trimmed)) return 'pro';
  if (trimmed.length >= PRO_LENGTH_THRESHOLD) return 'pro';
  if (trimmed.length <= MINI_LENGTH_THRESHOLD) return 'mini';
  return 'lite';
}

/**
 * 按场景复杂度自动选择模型 ID（逐轮路由，基于最后一条 user 消息）。
 * - 按 classifyTier 分类，返回对应档位的环境变量值；未配置时用默认模型 ID。
 * - 长会话中的短追问不会降级到 mini，保证上下文不丢失。
 */
export function selectModel(messages: UIMessage[]): string {
  let tier = classifyTier(getLastUserText(messages));

  // 修复：多轮会话里"继续/嗯"这类短追问若掉到 mini，可能因上下文过长而丢前文
  const userTurnCount = messages.reduce((count, m) => (m.role === 'user' ? count + 1 : count), 0);
  if (userTurnCount >= KEEP_LITE_MIN_TURNS && tier === 'mini') {
    tier = 'lite';
  }

  return requireEnv(MODEL_TIER_ENV[tier]);
}
