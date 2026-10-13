'use client';

import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Layout, Steps, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import type { NovelTaskDetail } from '@/app/api/studio/novel/_shared/task-types';
import { NOVEL_PATH } from '@/components/AppLayout/constants';
import ModeSwitch from '@/components/ModeSwitch';
import ControlPanel from './ControlPanel';
import PreviewPanel from './PreviewPanel';
import ResultPanel from './ResultPanel';
import { STUDIO_STEP_INDEX, STUDIO_STEPS } from './constants';
import { useNovelStudio } from './hooks/useNovelStudio';
import { buildPreviewDocument } from './utils';
import styles from './NovelStudio.module.css';

type NovelStudioProps = {
  task: NovelTaskDetail;
};

/** 小说写作工作台：选题调研 → 创作方案 → 角色设定 → 卷章设计 → 写作 → 预览。 */
export default function NovelStudio({ task }: NovelStudioProps) {
  const router = useRouter();
  const studio = useNovelStudio(task);
  const previewDocument =
    studio.plan && studio.writing
      ? buildPreviewDocument(studio.plan, studio.chapters, studio.writing)
      : { sections: [], plainText: '' };

  return (
    <Layout className={styles.studio}>
      <Layout.Header className={styles.header}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          shape="circle"
          aria-label="返回小说任务列表"
          onClick={() => router.push(NOVEL_PATH)}
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
          current={STUDIO_STEP_INDEX[studio.phase]}
          size="small"
          items={STUDIO_STEPS}
        />
      </div>
      <Layout.Content className={styles.content}>
        <div className={styles.workspace}>
          {studio.phase === 'preview' ? (
            <PreviewPanel
              document={previewDocument}
              onPrev={studio.handlePrev}
              onCopy={studio.handleCopyPreview}
            />
          ) : (
            <>
              <ControlPanel
                form={studio.panelForm}
                initialValues={studio.panelInitialValues}
                reasoningEffort={studio.reasoningEffort}
                onReasoningEffortChange={studio.handleReasoningEffortChange}
                phase={studio.phase}
                selectedTopic={studio.selectedTopic}
                plan={studio.plan}
                chapters={studio.chapters}
                selectedUnitIds={studio.selectedUnitIds}
                focusUnitId={studio.focusUnitId}
                styleSelections={studio.writing?.styleSelections ?? {}}
                tense={studio.writing?.tense}
                writeBusy={studio.generatingUnitIds.length > 0 || Boolean(studio.polishingUnitId)}
                onResearch={studio.handleResearch}
                onGeneratePlan={studio.handleGeneratePlan}
                onGenerateCast={studio.handleGenerateCast}
                onGenerateChapters={studio.handleGenerateChapters}
                onToggleWritingUnit={studio.toggleWritingUnit}
                onStyleSelectionsChange={studio.updateStyleSelections}
                onTenseChange={studio.updateTense}
              />
              <ResultPanel
                phase={studio.phase}
                topics={studio.topics}
                selectedTopicId={studio.selectedTopicId}
                plan={studio.plan}
                cast={studio.cast}
                chapters={studio.chapters}
                writing={studio.writing}
                selectedUnitIds={studio.selectedUnitIds}
                generatingVolumeId={studio.generatingVolumeId}
                generatingUnitIds={studio.generatingUnitIds}
                polishingUnitId={studio.polishingUnitId}
                onSelectTopic={studio.handleSelectTopic}
                onUpdateTopic={studio.updateTopic}
                onChangePlan={studio.updatePlan}
                onImportPlan={studio.importPlan}
                onChangeCast={studio.updateCast}
                onImportCast={studio.importCast}
                onImportChapters={studio.importChapters}
                onPrev={studio.handlePrev}
                onNext={studio.handleNext}
                onGenerateVolumeChapters={studio.handleGenerateVolumeChapters}
                onUpdateChapter={studio.updateChapter}
                onRemoveChapter={studio.removeChapter}
                onUpdateWritingBody={studio.updateWritingBody}
                onGenerateWriting={studio.handleGenerateWriting}
                onPolishWriting={studio.handlePolishWriting}
                onCopyWritingBody={studio.handleCopyWritingBody}
              />
            </>
          )}
        </div>
      </Layout.Content>
    </Layout>
  );
}
