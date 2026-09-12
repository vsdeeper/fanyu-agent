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
import {
  ANALYZE_FAILED,
  MAX_BRAND_LOGOS,
  NO_MATERIAL_WARNING,
  STUDIO_STEP_INDEX,
  STUDIO_STEPS,
} from './constants';
import type { AnalysisStepSnapshot, ProductDocItem, ProductImageItem, StudioPhase } from './types';
import {
  appendProductDocs,
  appendProductImages,
  assertOkOrJsonFail,
  consumeAnalyzeSse,
  createAnalysisStepSnapshot,
  createRafTextBuffer,
  hasAnalyzeMaterials,
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
  const [brandLogo, setBrandLogo] = useState<ProductImageItem[]>(
    initialAnalysis?.brandLogoImages ?? [],
  );
  const [productDescription, setProductDescription] = useState(
    initialAnalysis?.productDescription ?? '',
  );
  const [phase, setPhase] = useState<StudioPhase>(resolveInitialStudioPhase(initialAnalysis));
  const [analysisText, setAnalysisText] = useState(initialAnalysis?.analysisText ?? '');
  const [nextLoading, setNextLoading] = useState(false);
  const [analysisBuffer] = useState(() => createRafTextBuffer(setAnalysisText));
  const imagesRef = useRef(images);
  const documentsRef = useRef(documents);
  const brandLogoRef = useRef(brandLogo);
  const abortRef = useRef<AbortController | null>(null);
  const lastSnapshotRef = useRef<AnalysisStepSnapshot | undefined>(initialAnalysis);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    brandLogoRef.current = brandLogo;
  }, [brandLogo]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      analysisBuffer.dispose();
      revokeProductImageUrls(imagesRef.current);
      revokeProductImageUrls(brandLogoRef.current);
      revokeProductDocUrls(documentsRef.current);
    };
  }, [analysisBuffer]);

  const persistAnalysisStep = useCallback(
    async (
      imgs: ProductImageItem[],
      docs: ProductDocItem[],
      logo: ProductImageItem[],
      description: string,
      text: string,
    ) => {
      const next = await createAnalysisStepSnapshot(imgs, docs, logo, description, text);
      if (isSameStepSnapshot(next, lastSnapshotRef.current)) return;
      const saved = await saveStudioStep(task.id, 'analysis', next);
      lastSnapshotRef.current = saved;
      // 新字段必须一并写回：服务端已把 blob URL 换成资产 URL，漏写回会让基线永远对不上，
      // 每次「下一步」都重传一次 Logo 并多插一行资产
      setImages(saved.images);
      setDocuments(saved.documents);
      setBrandLogo(saved.brandLogoImages ?? []);
      setProductDescription(saved.productDescription ?? '');
      setAnalysisText(saved.analysisText);
    },
    // useState 的 setter 恒定，列进来只为满足 react-hooks/preserve-manual-memoization 的依赖推断
    [task.id, setImages, setDocuments, setBrandLogo, setProductDescription, setAnalysisText],
  );

  const handleAnalyze = useCallback(async () => {
    const materials = {
      images,
      brandLogo,
      productDescription,
      documents,
    };
    if (!hasAnalyzeMaterials(materials)) {
      message.warning(NO_MATERIAL_WARNING);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('analyzing');
    analysisBuffer.reset();
    try {
      const payload = await toAnalyzePayload(images, documents, {
        brandLogo,
        productDescription,
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
          await persistAnalysisStep(
            images,
            documents,
            brandLogo,
            productDescription,
            analysisBuffer.getText(),
          );
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
  }, [
    analysisBuffer,
    brandLogo,
    documents,
    images,
    message,
    persistAnalysisStep,
    productDescription,
  ]);

  const handleNext = useCallback(async () => {
    setNextLoading(true);
    try {
      await persistAnalysisStep(images, documents, brandLogo, productDescription, analysisText);
      setPhase('complete');
    } catch (err) {
      console.error('[business-analysis-studio] persist step on next', err);
    } finally {
      setNextLoading(false);
    }
  }, [analysisText, brandLogo, documents, images, persistAnalysisStep, productDescription]);

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
                brandLogo={brandLogo}
                productDescription={productDescription}
                documents={documents}
                analyzing={phase === 'analyzing'}
                formLocked={phase === 'analyzing'}
                onImagesAppend={(files) =>
                  setImages((current) => appendProductImages(current, files))
                }
                onImageRemove={(uid) => setImages((current) => removeProductImage(current, uid))}
                onBrandLogoAppend={(files) =>
                  setBrandLogo((current) => appendProductImages(current, files, MAX_BRAND_LOGOS))
                }
                onBrandLogoRemove={(uid) =>
                  setBrandLogo((current) => removeProductImage(current, uid))
                }
                onProductDescriptionChange={setProductDescription}
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
