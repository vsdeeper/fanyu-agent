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

/** 小说写作工作台：选题调研 → 设定 → 故事结构 → 写作 → 预览。 */
export default function NovelStudio({ task }: NovelStudioProps) {
  const router = useRouter();
  const studio = useNovelStudio(task);
  const previewDocument =
    studio.structure && studio.writing
      ? buildPreviewDocument(studio.structure, studio.writing)
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
                structure={studio.structure}
                onGenerateBible={studio.handleGenerateBible}
                selectedUnitIds={studio.selectedUnitIds}
                focusUnitId={studio.focusUnitId}
                styleSelections={studio.writing?.styleSelections ?? {}}
                bibleVoiceFocus={studio.bible?.voiceFocus ?? {}}
                bibleTense={studio.bible?.tense}
                writeBusy={studio.generatingUnitIds.length > 0 || Boolean(studio.polishingUnitId)}
                onResearch={studio.handleResearch}
                onBibleVoiceFocusChange={(voiceFocus) =>
                  studio.updateBibleNarration({ voiceFocus })
                }
                onBibleTenseChange={(tense) => studio.updateBibleNarration({ tense })}
                onGenerateStructure={studio.handleGenerateStructure}
                onToggleWritingUnit={studio.toggleWritingUnit}
                onStyleSelectionsChange={studio.updateStyleSelections}
              />
              <ResultPanel
                phase={studio.phase}
                topics={studio.topics}
                selectedTopicId={studio.selectedTopicId}
                bible={studio.bible}
                bibleStream={studio.bibleStream}
                structure={studio.structure}
                writing={studio.writing}
                selectedUnitIds={studio.selectedUnitIds}
                generatingChapterId={studio.generatingChapterId}
                generatingVolumeId={studio.generatingVolumeId}
                generatingUnitIds={studio.generatingUnitIds}
                polishingUnitId={studio.polishingUnitId}
                onSelectTopic={studio.handleSelectTopic}
                onChangeBible={studio.updateBible}
                onPrev={studio.handlePrev}
                onNext={studio.handleNext}
                onUpdateSynopsis={studio.updateSynopsis}
                onUpdateBeat={studio.updateBeat}
                onRemoveBeat={studio.removeBeat}
                onUpdateVolume={studio.updateVolume}
                onRemoveVolume={studio.removeVolume}
                onGenerateVolumeChapters={studio.handleGenerateVolumeChapters}
                onUpdateChapter={studio.updateChapter}
                onRemoveChapter={studio.removeChapter}
                onGenerateChapterBeats={studio.handleGenerateChapterBeats}
                onUpdateChapterBeat={studio.updateChapterBeat}
                onRemoveChapterBeat={studio.removeChapterBeat}
                onUpdateWritingBody={studio.updateWritingBody}
                onGenerateWriting={studio.handleGenerateWriting}
                onPolishWriting={studio.handlePolishWriting}
              />
            </>
          )}
        </div>
      </Layout.Content>
    </Layout>
  );
}
