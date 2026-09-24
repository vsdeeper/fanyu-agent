'use client';

import { Form, message } from 'antd';
import { useRef, useState } from 'react';
import {
  DEFAULT_PANEL_VALUES,
  MOCK_RESEARCH_DELAY_MS,
  MOCK_STRUCTURE_DELAY_MS,
  MISSING_IDEA_WARNING,
  MISSING_STRUCTURE_WARNING,
  MISSING_TOPIC_WARNING,
  WRITING_STEP_COMING,
} from '../constants';
import { getMockStructure } from '../mock-structure';
import { MOCK_TOPICS } from '../mock-topics';
import type {
  NovelPanelValues,
  NovelVolume,
  StructureSnapshot,
  StudioPhase,
  TopicCard,
} from '../types';

function isNovelVolume(value: unknown): value is NovelVolume {
  return value === 'short' || value === 'medium' || value === 'long';
}

/** 小说工作室纯客户端状态：选题调研 + 故事结构 mock，无落盘、无请求。 */
export function useNovelStudio() {
  const [panelForm] = Form.useForm<NovelPanelValues>();
  const [phase, setPhase] = useState<StudioPhase>('research');
  const [topics, setTopics] = useState<TopicCard[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | undefined>();
  const [structure, setStructure] = useState<StructureSnapshot | undefined>();
  const researchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const structureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId);

  function clearResearchTimer() {
    if (researchTimerRef.current) {
      clearTimeout(researchTimerRef.current);
      researchTimerRef.current = null;
    }
  }

  function clearStructureTimer() {
    if (structureTimerRef.current) {
      clearTimeout(structureTimerRef.current);
      structureTimerRef.current = null;
    }
  }

  /** 开始调研：校验想法后短延迟写入 mock 选题卡。 */
  async function handleResearch() {
    try {
      await panelForm.validateFields(['idea']);
    } catch {
      return;
    }

    const idea = String(panelForm.getFieldValue('idea') ?? '').trim();
    if (!idea) {
      message.warning(MISSING_IDEA_WARNING);
      return;
    }

    clearResearchTimer();
    setPhase('researching');
    setSelectedTopicId(undefined);
    setTopics([]);
    setStructure(undefined);

    researchTimerRef.current = setTimeout(() => {
      researchTimerRef.current = null;
      setTopics(MOCK_TOPICS);
      setPhase('researched');
    }, MOCK_RESEARCH_DELAY_MS);
  }

  /** 点选选题卡。 */
  function handleSelectTopic(id: string) {
    setSelectedTopicId(id);
  }

  /** 生成故事结构：按左栏体量倾向返回短篇节拍或中长篇章纲。 */
  function handleGenerateStructure() {
    if (!selectedTopicId) {
      message.warning(MISSING_TOPIC_WARNING);
      return;
    }

    const volumeRaw = panelForm.getFieldValue('volume');
    const volume: NovelVolume = isNovelVolume(volumeRaw) ? volumeRaw : 'short';

    clearStructureTimer();
    setPhase('structuring');
    setStructure(undefined);

    structureTimerRef.current = setTimeout(() => {
      structureTimerRef.current = null;
      setStructure(getMockStructure(volume));
      setPhase('structured');
    }, MOCK_STRUCTURE_DELAY_MS);
  }

  /** 上一步：结构 → 调研（保留选题与已生成结构）。 */
  function handlePrev() {
    if (phase === 'structure' || phase === 'structuring' || phase === 'structured') {
      clearStructureTimer();
      setPhase('researched');
    }
  }

  /** 下一步：调研须已选选题进结构；结构须已生成，否则提示写作未开放。 */
  function handleNext() {
    if (phase === 'researched') {
      if (!selectedTopicId) {
        message.warning(MISSING_TOPIC_WARNING);
        return;
      }
      setPhase(structure ? 'structured' : 'structure');
      return;
    }

    if (phase === 'structure' || phase === 'structuring') {
      message.warning(MISSING_STRUCTURE_WARNING);
      return;
    }

    if (phase === 'structured') {
      if (!structure) {
        message.warning(MISSING_STRUCTURE_WARNING);
        return;
      }
      message.info(WRITING_STEP_COMING);
    }
  }

  /** 更新短篇梗概。 */
  function updateSynopsis(synopsis: string) {
    setStructure((prev) => {
      if (!prev || prev.kind !== 'short') return prev;
      return { ...prev, synopsis };
    });
  }

  /** 更新短篇某条节拍文案。 */
  function updateBeat(beatId: string, text: string) {
    setStructure((prev) => {
      if (!prev || prev.kind !== 'short') return prev;
      return {
        ...prev,
        beats: prev.beats.map((beat) => (beat.id === beatId ? { ...beat, text } : beat)),
      };
    });
  }

  /** 删除短篇节拍；至少保留一条。 */
  function removeBeat(beatId: string) {
    setStructure((prev) => {
      if (!prev || prev.kind !== 'short' || prev.beats.length <= 1) return prev;
      return { ...prev, beats: prev.beats.filter((beat) => beat.id !== beatId) };
    });
  }

  /** 更新章纲标题或目的。 */
  function updateChapter(chapterId: string, patch: { title?: string; purpose?: string }) {
    setStructure((prev) => {
      if (!prev || prev.kind !== 'chapters') return prev;
      return {
        ...prev,
        chapters: prev.chapters.map((chapter) =>
          chapter.id === chapterId ? { ...chapter, ...patch } : chapter,
        ),
      };
    });
  }

  /** 删除章纲条目；至少保留一章。 */
  function removeChapter(chapterId: string) {
    setStructure((prev) => {
      if (!prev || prev.kind !== 'chapters' || prev.chapters.length <= 1) return prev;
      return {
        ...prev,
        chapters: prev.chapters.filter((chapter) => chapter.id !== chapterId),
      };
    });
  }

  return {
    panelForm,
    panelInitialValues: DEFAULT_PANEL_VALUES,
    phase,
    topics,
    selectedTopicId,
    selectedTopic,
    structure,
    handleResearch,
    handleSelectTopic,
    handleGenerateStructure,
    handlePrev,
    handleNext,
    updateSynopsis,
    updateBeat,
    removeBeat,
    updateChapter,
    removeChapter,
  };
}
