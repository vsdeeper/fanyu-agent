import { useEffect, useRef, useState } from 'react';
import { App } from 'antd';
import type { StyleTuningPublishScene } from '@/app/api/studio/style-tuning/_shared/types';
import type { StyleTuningTaskDetail } from '@/app/api/studio/style-tuning/_shared/task-types';
import {
  MISSING_SCENE_WARNING,
  MISSING_SOFT_PARAMS_WARNING,
  MISSING_STYLE_PROMPT_WARNING,
  MISSING_TOPIC_CONTENT_WARNING,
  SOFT_PARAMS_PARSE_FAILED,
  SOFT_TUNE_FAILED,
  TRIAL_WRITE_FAILED,
} from '../constants';
import type {
  SoftParamFieldKey,
  SoftTuneStepSnapshot,
  StudioPhase,
  TrialWriteStepSnapshot,
} from '../types';
import {
  assertOkOrJsonFail,
  consumeAnalyzeSse,
  createEmptySoftParams,
  createRafTextBuffer,
  extractTrailingJsonBlock,
  formatSoftParamsAsMarkdown,
  hasCompleteSoftParams,
  isAbortError,
  isSameSoftTuneSnapshot,
  isSameTrialWriteSnapshot,
  parseSoftParams,
  readSoftTuneStepSnapshot,
  readTrialWriteStepSnapshot,
  resolveInitialPhase,
  saveStyleTuningStep,
  stripTrailingJsonFenceForDisplay,
} from '../utils';

/** 管理文风调两步：软调 → 试写。 */
export function useStyleTuningStudio(task: StyleTuningTaskDetail) {
  const { message } = App.useApp();
  const initialSoft = readSoftTuneStepSnapshot(task.steps.softtune?.data);
  const initialTrial = readTrialWriteStepSnapshot(task.steps.trialwrite?.data);

  const [phase, setPhase] = useState<StudioPhase>(resolveInitialPhase(initialSoft));
  const [publishScene, setPublishScene] = useState<StyleTuningPublishScene | undefined>(
    initialSoft?.publishScene,
  );
  const [topicContent, setTopicContent] = useState(initialSoft?.topicContent ?? '');
  const [stylePrompt, setStylePrompt] = useState(initialSoft?.stylePrompt ?? '');
  const [softTuneStream, setSoftTuneStream] = useState(initialSoft?.streamText ?? '');
  const [softParams, setSoftParams] = useState(initialSoft?.softParams ?? createEmptySoftParams());

  const [contentOutline, setContentOutline] = useState(initialTrial?.contentOutline ?? '');
  const [trialStream, setTrialStream] = useState(initialTrial?.streamText ?? '');
  const [markdown, setMarkdown] = useState(initialTrial?.markdown ?? '');

  const [navLoading, setNavLoading] = useState(false);
  const [softTuneBuffer] = useState(() =>
    createRafTextBuffer((text) => {
      setSoftTuneStream(text);
      const { json } = extractTrailingJsonBlock(text);
      if (!json) return;
      const parsed = parseSoftParams(json);
      if (parsed) setSoftParams(parsed);
    }),
  );
  const [trialBuffer] = useState(() => createRafTextBuffer(setTrialStream));
  const abortRef = useRef<AbortController | null>(null);
  const lastSoftRef = useRef(initialSoft);
  const lastTrialRef = useRef(initialTrial);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      softTuneBuffer.dispose();
      trialBuffer.dispose();
    },
    [softTuneBuffer, trialBuffer],
  );

  async function persistSoftTune(override?: Partial<SoftTuneStepSnapshot>) {
    if (!publishScene) return undefined;
    const next: SoftTuneStepSnapshot = {
      publishScene,
      topicContent: topicContent.trim(),
      stylePrompt: stylePrompt.trim(),
      ...(hasCompleteSoftParams(softParams) ? { softParams } : {}),
      ...(softTuneStream.trim()
        ? { streamText: stripTrailingJsonFenceForDisplay(softTuneStream) }
        : {}),
      ...override,
    };
    if (isSameSoftTuneSnapshot(next, lastSoftRef.current)) return next;
    const saved = await saveStyleTuningStep(task.id, 'softtune', next);
    lastSoftRef.current = saved;
    return saved;
  }

  async function persistTrialWrite(override?: Partial<TrialWriteStepSnapshot>) {
    const outline = contentOutline.trim();
    const next: TrialWriteStepSnapshot = {
      ...(outline ? { contentOutline: outline } : {}),
      markdown,
      ...(trialStream.trim() ? { streamText: trialStream.trim() } : {}),
      ...override,
    };
    if (isSameTrialWriteSnapshot(next, lastTrialRef.current)) return next;
    const saved = await saveStyleTuningStep(task.id, 'trialwrite', next);
    lastTrialRef.current = saved;
    return saved;
  }

  async function runSse(
    url: string,
    body: unknown,
    buffer: ReturnType<typeof createRafTextBuffer>,
    failedMessage: string,
    onDone: (fullText: string) => Promise<void> | void,
    busyPhase: StudioPhase,
    idlePhase: StudioPhase,
  ) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase(busyPhase);
    buffer.reset();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(res);
      let receivedDone = false;
      await consumeAnalyzeSse(res, {
        onText: (delta) => buffer.append(delta),
        onDone: () => {
          receivedDone = true;
        },
        onError: (text) => message.error(text),
      });
      buffer.flushNow();
      if (controller.signal.aborted) return;
      if (receivedDone) {
        await onDone(buffer.getText());
        return;
      }
      message.error(failedMessage);
      setPhase(idlePhase);
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) return;
      console.error('[style-tuning-studio]', url, err);
      message.error(err instanceof Error && err.message ? err.message : failedMessage);
      setPhase(idlePhase);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  async function handleSoftTune() {
    if (!publishScene) {
      message.warning(MISSING_SCENE_WARNING);
      return;
    }
    if (!topicContent.trim()) {
      message.warning(MISSING_TOPIC_CONTENT_WARNING);
      return;
    }
    if (!stylePrompt.trim()) {
      message.warning(MISSING_STYLE_PROMPT_WARNING);
      return;
    }
    setSoftParams(createEmptySoftParams());
    await runSse(
      '/api/studio/style-tuning/softtune',
      {
        publishScene,
        topicContent: topicContent.trim(),
        stylePrompt: stylePrompt.trim(),
      },
      softTuneBuffer,
      SOFT_TUNE_FAILED,
      async (fullText) => {
        const { prose, json } = extractTrailingJsonBlock(fullText);
        const parsed = parseSoftParams(json);
        const display = stripTrailingJsonFenceForDisplay(prose || fullText);
        setSoftTuneStream(display);
        if (!parsed) {
          message.error(SOFT_PARAMS_PARSE_FAILED);
          setPhase('softtune');
          return;
        }
        setSoftParams(parsed);
        setPhase('softtuned');
        try {
          const next: SoftTuneStepSnapshot = {
            publishScene,
            topicContent: topicContent.trim(),
            stylePrompt: stylePrompt.trim(),
            softParams: parsed,
            streamText: display,
          };
          const saved = await saveStyleTuningStep(task.id, 'softtune', next);
          lastSoftRef.current = saved;
        } catch (err) {
          console.error('[style-tuning-studio] persist softtune', err);
        }
      },
      'softtuning',
      'softtune',
    );
  }

  async function handleTrialWrite() {
    if (!publishScene) {
      message.warning(MISSING_SCENE_WARNING);
      return;
    }
    if (!hasCompleteSoftParams(softParams)) {
      message.warning(MISSING_SOFT_PARAMS_WARNING);
      return;
    }
    if (!topicContent.trim()) {
      message.warning(MISSING_TOPIC_CONTENT_WARNING);
      return;
    }
    setMarkdown('');
    const outline = contentOutline.trim();
    await runSse(
      '/api/studio/style-tuning/trialwrite',
      {
        publishScene,
        softParams,
        topicContent: topicContent.trim(),
        ...(outline ? { contentOutline: outline } : {}),
      },
      trialBuffer,
      TRIAL_WRITE_FAILED,
      async (fullText) => {
        const body = fullText.trim();
        setTrialStream(body);
        setMarkdown(body);
        setPhase('trialwritten');
        try {
          const next: TrialWriteStepSnapshot = {
            ...(outline ? { contentOutline: outline } : {}),
            markdown: body,
            streamText: body,
          };
          const saved = await saveStyleTuningStep(task.id, 'trialwrite', next);
          lastTrialRef.current = saved;
        } catch (err) {
          console.error('[style-tuning-studio] persist trialwrite', err);
        }
      },
      'trialwriting',
      'trialwrite',
    );
  }

  async function handleNext() {
    setNavLoading(true);
    try {
      if (phase === 'softtuned') {
        if (!hasCompleteSoftParams(softParams)) {
          message.warning(MISSING_SOFT_PARAMS_WARNING);
          return;
        }
        await persistSoftTune({ softParams });
        setPhase(markdown.trim() ? 'trialwritten' : 'trialwrite');
      }
    } catch (err) {
      console.error('[style-tuning-studio] next', err);
    } finally {
      setNavLoading(false);
    }
  }

  async function handlePrev() {
    if (phase === 'trialwrite' || phase === 'trialwritten') {
      try {
        await persistTrialWrite();
      } catch (err) {
        console.error('[style-tuning-studio] prev persist', err);
      }
      setPhase('softtuned');
    }
  }

  function updateSoftParam(key: SoftParamFieldKey, value: string) {
    setSoftParams((current) => ({ ...current, [key]: value }));
  }

  /** 结束编辑：用当前六维回写流式 Markdown 展示文，并落盘。 */
  async function finishEditSoftParams() {
    const display = formatSoftParamsAsMarkdown(softParams);
    setSoftTuneStream(display);
    try {
      await persistSoftTune({ softParams, streamText: display });
    } catch (err) {
      console.error('[style-tuning-studio] finish edit soft params', err);
    }
  }

  return {
    phase,
    publishScene,
    setPublishScene,
    topicContent,
    setTopicContent,
    stylePrompt,
    setStylePrompt,
    softTuneStream,
    softParams,
    updateSoftParam,
    finishEditSoftParams,
    contentOutline,
    setContentOutline,
    trialStream,
    markdown,
    navLoading,
    handleSoftTune,
    handleTrialWrite,
    handleNext,
    handlePrev,
  };
}
