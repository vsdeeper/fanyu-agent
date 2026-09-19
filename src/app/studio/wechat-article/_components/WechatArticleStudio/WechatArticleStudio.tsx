'use client';

import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Layout, Steps, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import type { WechatArticleTaskDetail } from '@/app/api/studio/wechat-article/_shared/task-types';
import { WECHAT_ARTICLE_PATH } from '@/components/AppLayout/constants';
import ModeSwitch from '@/components/ModeSwitch';
import CompletionPanel from './CompletionPanel';
import ControlPanel from './ControlPanel';
import ResultPanel from './ResultPanel';
import { STUDIO_STEP_INDEX, STUDIO_STEPS } from './constants';
import { useWechatArticleStudio } from './hooks/useWechatArticleStudio';
import styles from './WechatArticleStudio.module.css';

type WechatArticleStudioProps = {
  task: WechatArticleTaskDetail;
};

/** 公众号写作工作台：选题调研 → 内容思路 → 成稿 → 成稿配图 → 预览。 */
export default function WechatArticleStudio({ task }: WechatArticleStudioProps) {
  const router = useRouter();
  const studio = useWechatArticleStudio(task);

  return (
    <Layout className={styles.studio}>
      <Layout.Header className={styles.header}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          shape="circle"
          aria-label="返回公众号任务列表"
          onClick={() => router.push(WECHAT_ARTICLE_PATH)}
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
          {studio.phase === 'complete' ? (
            <CompletionPanel
              markdown={studio.markdown}
              imageSlots={studio.imageSlots}
              onPrev={studio.handlePrev}
              onCopyArticle={studio.handleCopyArticle}
            />
          ) : (
            <>
              <ControlPanel
                phase={studio.phase}
                idea={studio.idea}
                viewpoint={studio.viewpoint}
                styleSelections={studio.styleSelections}
                lengthLimit={studio.lengthLimit}
                styleReferenceImages={studio.styleReferenceImages}
                watermarkImages={studio.watermarkImages}
                onIdeaChange={studio.setIdea}
                onViewpointChange={studio.setViewpoint}
                onStyleSelectionsChange={studio.setStyleSelections}
                onLengthLimitChange={studio.setLengthLimit}
                onStyleReferenceAppend={studio.handleStyleReferenceAppend}
                onStyleReferenceRemove={studio.handleStyleReferenceRemove}
                onWatermarkAppend={studio.handleWatermarkAppend}
                onWatermarkRemove={studio.handleWatermarkRemove}
                onResearch={studio.handleResearch}
                onPlan={studio.handlePlan}
                onDraft={studio.handleDraft}
                onPlanImages={studio.handlePlanImages}
                selectedAngle={studio.selectedAngle}
                plan={studio.plan}
                hasMarkdown={Boolean(studio.markdown.trim())}
              />
              <ResultPanel
                phase={studio.phase}
                researchStream={studio.researchStream}
                sources={studio.sources}
                angles={studio.angles}
                selectedAngleId={studio.selectedAngleId}
                onSelectAngle={studio.setSelectedAngleId}
                plan={studio.plan}
                onPlanBeatsChange={(beats) => studio.updatePlanField('beats', beats)}
                onSelectTitleDirection={studio.selectTitleDirection}
                onChangeTitleDirection={studio.changeTitleDirection}
                draftStream={studio.draftStream}
                markdown={studio.markdown}
                onMarkdownChange={studio.setMarkdown}
                imagesStream={studio.imagesStream}
                imageSlots={studio.imageSlots}
                imageHistory={studio.imageHistory}
                imageVisualStyle={studio.imageVisualStyle}
                slotDrawerOpen={studio.slotDrawerOpen}
                activeSlotId={studio.activeSlotId}
                onOpenSlotDrawer={studio.openSlotDrawer}
                onCloseSlotDrawer={studio.closeSlotDrawer}
                onSelectSlot={studio.selectSlot}
                onVisualStyleChange={studio.updateImageVisualStyle}
                onSlotPromptChange={studio.updateSlotPrompt}
                onSlotAspectRatioChange={studio.updateSlotAspectRatio}
                onSlotModelChange={studio.updateSlotModel}
                onSlotClarityChange={studio.updateSlotClarity}
                onGenerateSlot={studio.handleGenerateSlot}
                onUploadSlot={studio.handleUploadSlot}
                onApplyHistory={studio.handleApplyHistory}
                onRemoveHistory={studio.handleRemoveHistory}
                onCopyImage={studio.handleCopyImage}
                navLoading={studio.navLoading}
                onPrev={studio.handlePrev}
                onNext={studio.handleNext}
              />
            </>
          )}
        </div>
      </Layout.Content>
    </Layout>
  );
}
