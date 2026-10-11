import type { TopicCard } from '../types';

/** 选题卡是否可保存：标题、类型体量、值得写、故事核有内容；风险可空。 */
export function isSavableTopic(topic: TopicCard): boolean {
  return Boolean(
    topic.title.trim() && topic.genreVolume.trim() && topic.why.trim() && topic.core.trim(),
  );
}

/** 保存前去掉选题字段首尾空白；空风险不写入。 */
export function trimTopic(topic: TopicCard): TopicCard {
  const risk = topic.risk?.trim();
  return {
    id: topic.id,
    title: topic.title.trim(),
    genreVolume: topic.genreVolume.trim(),
    why: topic.why.trim(),
    core: topic.core.trim(),
    ...(risk ? { risk } : {}),
  };
}
