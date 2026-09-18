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

/** 公众号写作工作台：选题调研 → 内容思路 → 成稿 → 预览复制。 */
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
              titles={studio.titles}
              markdown={studio.markdown}
              imageSlots={studio.imageSlots}
              onPrev={studio.handlePrev}
              onCopyArticle={studio.handleCopyArticle}
              onCopyImage={studio.handleCopyImage}
            />
          ) : (
            <>
              <ControlPanel
                phase={studio.phase}
                idea={studio.idea}
                viewpoint={studio.viewpoint}
                styleSelections={studio.styleSelections}
                lengthLimit={studio.lengthLimit}
                deAiFlavor={studio.deAiFlavor}
                onIdeaChange={studio.setIdea}
                onViewpointChange={studio.setViewpoint}
                onStyleSelectionsChange={studio.setStyleSelections}
                onLengthLimitChange={studio.setLengthLimit}
                onDeAiFlavorChange={studio.setDeAiFlavor}
                onResearch={studio.handleResearch}
                onPlan={studio.handlePlan}
                onDraft={studio.handleDraft}
                selectedAngle={studio.selectedAngle}
                plan={studio.plan}
              />
              <ResultPanel
                phase={studio.phase}
                researchStream={studio.researchStream}
                sources={studio.sources}
                angles={studio.angles}
                selectedAngleId={studio.selectedAngleId}
                onSelectAngle={studio.setSelectedAngleId}
                planStream={studio.planStream}
                plan={studio.plan}
                onPlanBeatsChange={(beats) => studio.updatePlanField('beats', beats)}
                onSelectTitleDirection={studio.selectTitleDirection}
                onChangeTitleDirection={studio.changeTitleDirection}
                draftStream={studio.draftStream}
                markdown={studio.markdown}
                onMarkdownChange={studio.setMarkdown}
                imageSlots={studio.imageSlots}
                imageModel={studio.imageModel}
                imageAspectRatio={studio.imageAspectRatio}
                imageClarity={studio.imageClarity}
                onImageModelChange={studio.setImageModel}
                onImageAspectRatioChange={studio.setImageAspectRatio}
                onImageClarityChange={studio.setImageClarity}
                onSlotPromptChange={studio.updateSlotPrompt}
                onGenerateSlot={studio.handleGenerateSlot}
                onCopyImage={studio.handleCopyImage}
                onAddSlot={studio.addEmptySlot}
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
