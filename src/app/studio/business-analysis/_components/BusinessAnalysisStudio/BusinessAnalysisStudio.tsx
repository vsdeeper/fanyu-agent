'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { App, Button, Layout, Steps, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import type { BusinessAnalysisTaskDetail } from '@/app/api/studio/business-analysis/_shared/task-types';
import { BUSINESS_ANALYSIS_PATH } from '@/components/AppLayout/constants';
import ModeSwitch from '@/components/ModeSwitch';
import CompletionPanel from './CompletionPanel';
import ControlPanel from './ControlPanel';
import ResultPanel from './ResultPanel';
import { ANALYZE_FAILED, NO_IMAGE_WARNING, STUDIO_STEP_INDEX, STUDIO_STEPS } from './constants';
import type { AnalysisStepSnapshot, ProductDocItem, ProductImageItem, StudioPhase } from './types';
import {
  appendProductDocs,
  appendProductImages,
  assertOkOrJsonFail,
  consumeAnalyzeSse,
  createAnalysisStepSnapshot,
  createRafTextBuffer,
  isAbortError,
  isSameStepSnapshot,
  readAnalysisStepSnapshot,
  removeProductDoc,
  removeProductImage,
  resolveInitialStudioPhase,
  revokeProductDocUrls,
  revokeProductImageUrls,
  saveStudioStep,
  toAnalyzePayload,
} from './utils';
import styles from './BusinessAnalysisStudio.module.css';

type BusinessAnalysisStudioProps = {
  task: BusinessAnalysisTaskDetail;
};

/** 商业分析工作台：左栏上传资料，右栏流式分析，完成后预览导出。 */
export default function BusinessAnalysisStudio({ task }: BusinessAnalysisStudioProps) {
  const { message } = App.useApp();
  const router = useRouter();
  const initialAnalysis = readAnalysisStepSnapshot(task.steps.analysis?.data);
  const [images, setImages] = useState<ProductImageItem[]>(initialAnalysis?.images ?? []);
  const [documents, setDocuments] = useState<ProductDocItem[]>(initialAnalysis?.documents ?? []);
  const [phase, setPhase] = useState<StudioPhase>(resolveInitialStudioPhase(initialAnalysis));
  const [analysisText, setAnalysisText] = useState(initialAnalysis?.analysisText ?? '');
  const [nextLoading, setNextLoading] = useState(false);
  const [analysisBuffer] = useState(() => createRafTextBuffer(setAnalysisText));
  const imagesRef = useRef(images);
  const documentsRef = useRef(documents);
  const abortRef = useRef<AbortController | null>(null);
  const lastSnapshotRef = useRef<AnalysisStepSnapshot | undefined>(initialAnalysis);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      analysisBuffer.dispose();
      revokeProductImageUrls(imagesRef.current);
      revokeProductDocUrls(documentsRef.current);
    };
  }, [analysisBuffer]);

  const persistAnalysisStep = useCallback(
    async (imgs: ProductImageItem[], docs: ProductDocItem[], text: string) => {
      const next = await createAnalysisStepSnapshot(imgs, docs, text);
      if (isSameStepSnapshot(next, lastSnapshotRef.current)) return;
      const saved = await saveStudioStep(task.id, 'analysis', next);
      lastSnapshotRef.current = saved;
      setImages(saved.images);
      setDocuments(saved.documents);
      setAnalysisText(saved.analysisText);
    },
    [task.id],
  );

  const handleAnalyze = useCallback(async () => {
    if (images.length === 0) {
      message.warning(NO_IMAGE_WARNING);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('analyzing');
    analysisBuffer.reset();
    try {
      const payload = await toAnalyzePayload(images, documents);
      const res = await fetch('/api/studio/business-analysis/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(res);
      let receivedDone = false;
      await consumeAnalyzeSse(res, {
        onText: (delta) => {
          analysisBuffer.append(delta);
        },
        onDone: () => {
          receivedDone = true;
        },
        onError: (text) => {
          message.error(text);
        },
      });
      analysisBuffer.flushNow();
      if (controller.signal.aborted) return;
      if (receivedDone) {
        setPhase('analyzed');
        try {
          await persistAnalysisStep(images, documents, analysisBuffer.getText());
        } catch (err) {
          console.error('[business-analysis-studio] persist analysis', err);
        }
        return;
      }
      setPhase('input');
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) return;
      console.error('[business-analysis-studio] analyze', err);
      message.error(err instanceof Error && err.message ? err.message : ANALYZE_FAILED);
      setPhase('input');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [analysisBuffer, documents, images, message, persistAnalysisStep]);

  const handleNext = useCallback(async () => {
    setNextLoading(true);
    try {
      await persistAnalysisStep(images, documents, analysisText);
      setPhase('complete');
    } catch (err) {
      console.error('[business-analysis-studio] persist step on next', err);
    } finally {
      setNextLoading(false);
    }
  }, [analysisText, documents, images, persistAnalysisStep]);

  return (
    <Layout className={styles.studio}>
      <Layout.Header className={styles.header}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          shape="circle"
          aria-label="返回商业分析任务列表"
          onClick={() => router.push(BUSINESS_ANALYSIS_PATH)}
        />
        <div className={styles.brand}>
          <Typography.Title level={5} className={styles.title} ellipsis>
            {task.name}
          </Typography.Title>
        </div>
        <div className={styles.headerSpacer} />
        <ModeSwitch />
      </Layout.Header>
      <div className={styles.stepsRow}>
        <Steps
          className={styles.steps}
          current={STUDIO_STEP_INDEX[phase]}
          size="small"
          items={STUDIO_STEPS}
        />
      </div>
      <Layout.Content className={styles.content}>
        <div className={styles.workspace}>
          {phase === 'complete' ? (
            <CompletionPanel analysisText={analysisText} onPrev={() => setPhase('analyzed')} />
          ) : (
            <>
              <ControlPanel
                images={images}
                documents={documents}
                analyzing={phase === 'analyzing'}
                formLocked={phase === 'analyzing'}
                onImagesAppend={(files) =>
                  setImages((current) => appendProductImages(current, files))
                }
                onImageRemove={(uid) => setImages((current) => removeProductImage(current, uid))}
                onDocsAppend={(files) =>
                  setDocuments((current) => appendProductDocs(current, files))
                }
                onDocRemove={(uid) => setDocuments((current) => removeProductDoc(current, uid))}
                onAnalyze={handleAnalyze}
              />
              <ResultPanel
                phase={phase}
                analysisText={analysisText}
                analysisStreaming={phase === 'analyzing'}
                nextLoading={nextLoading}
                onNext={handleNext}
                onAnalysisTextChange={setAnalysisText}
              />
            </>
          )}
        </div>
      </Layout.Content>
    </Layout>
  );
}
