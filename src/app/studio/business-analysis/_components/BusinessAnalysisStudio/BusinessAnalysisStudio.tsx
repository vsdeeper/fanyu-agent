'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { App, Button, Form, Layout, Steps, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import type { BusinessAnalysisTaskDetail } from '@/app/api/studio/business-analysis/_shared/task-types';
import { BUSINESS_ANALYSIS_PATH } from '@/components/AppLayout/constants';
import ModeSwitch from '@/components/ModeSwitch';
import {
  revokeLocalUploadItemUrls,
  revokeReplacedLocalUploadItemUrls,
} from '@/lib/shared/client/upload-items';
import CompletionPanel from './CompletionPanel';
import ControlPanel from './ControlPanel';
import ResultPanel from './ResultPanel';
import { ANALYZE_FAILED, NO_MATERIAL_WARNING, STUDIO_STEP_INDEX, STUDIO_STEPS } from './constants';
import type { AnalysisPanelValues, AnalysisStepSnapshot, StudioPhase } from './types';
import {
  assertOkOrJsonFail,
  consumeAnalyzeSse,
  createAnalysisStepSnapshot,
  createRafTextBuffer,
  hasAnalyzeMaterials,
  isAbortError,
  isSameStepSnapshot,
  readAnalysisStepSnapshot,
  resolveInitialStudioPhase,
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
  const [panelForm] = Form.useForm<AnalysisPanelValues>();
  // 左栏初值只算一次：Form 二次挂载是 store 赢（只补缺失键），重算只会白白多渲染
  const [panelInitialValues] = useState<AnalysisPanelValues>(() => ({
    images: initialAnalysis?.images ?? [],
    brandLogo: initialAnalysis?.brandLogoImages ?? [],
    documents: initialAnalysis?.documents ?? [],
    productDescription: initialAnalysis?.productDescription ?? '',
  }));
  const [phase, setPhase] = useState<StudioPhase>(resolveInitialStudioPhase(initialAnalysis));
  const [analysisText, setAnalysisText] = useState(initialAnalysis?.analysisText ?? '');
  const [nextLoading, setNextLoading] = useState(false);
  const [analysisBuffer] = useState(() => createRafTextBuffer(setAnalysisText));
  const abortRef = useRef<AbortController | null>(null);
  const lastSnapshotRef = useRef<AnalysisStepSnapshot | undefined>(initialAnalysis);
  // 供请求与落盘取用；preserve 让完成步（左栏已卸载）也读得到，首帧 store 未播种时回落到初值
  const watched = Form.useWatch([], { form: panelForm, preserve: true });
  const panelValues: AnalysisPanelValues = watched ?? panelInitialValues;

  useEffect(
    () => () => {
      abortRef.current?.abort();
      analysisBuffer.dispose();
      // 完成步的 cleanup 也会走到这里：此时面板虽已卸载，store 仍保留本次会话的值，
      // 故用 getFieldsValue(true) 读整表；重复释放同一个 object URL 是幂等的
      const values = panelForm.getFieldsValue(true);
      revokeLocalUploadItemUrls(values.images ?? []);
      revokeLocalUploadItemUrls(values.brandLogo ?? []);
      revokeLocalUploadItemUrls(values.documents ?? []);
    },
    [analysisBuffer, panelForm],
  );

  const persistAnalysisStep = useCallback(
    async (text: string) => {
      const values = panelForm.getFieldsValue(true);
      const next = await createAnalysisStepSnapshot(
        values.images ?? [],
        values.documents ?? [],
        values.brandLogo ?? [],
        values.productDescription ?? '',
        text,
      );
      if (isSameStepSnapshot(next, lastSnapshotRef.current)) return;
      const saved = await saveStudioStep(task.id, 'analysis', next);
      lastSnapshotRef.current = saved;
      revokeReplacedLocalUploadItemUrls(values.images ?? [], saved.images);
      revokeReplacedLocalUploadItemUrls(values.documents ?? [], saved.documents);
      revokeReplacedLocalUploadItemUrls(values.brandLogo ?? [], saved.brandLogoImages ?? []);
      // 新字段必须一并写回：服务端已把 blob URL 换成资产 URL，漏写回会让基线永远对不上，
      // 每次「下一步」都重传一次 Logo 并多插一行资产
      // setFieldsValue 只更新 store 并通知 watch，不触发 onValuesChange，故不会与用户输入形成回环
      panelForm.setFieldsValue({
        images: saved.images,
        documents: saved.documents,
        brandLogo: saved.brandLogoImages ?? [],
        productDescription: saved.productDescription ?? '',
      });
      setAnalysisText(saved.analysisText);
    },
    [task.id, panelForm],
  );

  const handleAnalyze = useCallback(async () => {
    if (!hasAnalyzeMaterials(panelValues)) {
      message.warning(NO_MATERIAL_WARNING);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('analyzing');
    analysisBuffer.reset();
    try {
      const payload = await toAnalyzePayload(panelValues.images, panelValues.documents, {
        brandLogo: panelValues.brandLogo,
        productDescription: panelValues.productDescription,
      });
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
          await persistAnalysisStep(analysisBuffer.getText());
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
  }, [analysisBuffer, message, panelValues, persistAnalysisStep]);

  const handleNext = useCallback(async () => {
    setNextLoading(true);
    try {
      await persistAnalysisStep(analysisText);
      setPhase('complete');
    } catch (err) {
      console.error('[business-analysis-studio] persist step on next', err);
    } finally {
      setNextLoading(false);
    }
  }, [analysisText, persistAnalysisStep]);

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
                form={panelForm}
                initialValues={panelInitialValues}
                analyzing={phase === 'analyzing'}
                formLocked={phase === 'analyzing'}
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
