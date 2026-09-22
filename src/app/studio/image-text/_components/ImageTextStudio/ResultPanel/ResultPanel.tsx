'use client';

import { useState } from 'react';
import { StarOutlined } from '@ant-design/icons';
import { Button, Empty, Input, Popconfirm, Spin } from 'antd';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
import '@/lib/theme/XMarkdownTheme.css';
import type { GenerateSpecFormFields } from '@/app/studio/_components/GenerateSpecForm';
import { useThemeMode } from '@/components/theme';
import {
  CANCEL_BUTTON,
  CANCEL_GENERATE_BUTTON,
  CANCEL_GENERATE_CONFIRM_BACK,
  CANCEL_GENERATE_CONFIRM_DESCRIPTION,
  CANCEL_GENERATE_CONFIRM_OK,
  CANCEL_GENERATE_CONFIRM_TITLE,
  EDIT_BUTTON,
  EMPTY_GALLERY_HINT,
  EMPTY_PLAN_HINT,
  MARKDOWN_COMPONENTS,
  MARKDOWN_DISABLE_STYLES,
  MARKDOWN_STREAMING_OFF,
  MARKDOWN_STREAMING_ON,
  NEXT_BUTTON,
  PREV_BUTTON,
  RESULT_GENERATE_TITLE,
  RESULT_PLAN_TITLE,
  SAVE_BUTTON,
} from '../constants';
import type { ImageTextGeneratedImage, ImageTextPhase } from '../types';
import { groupImagesByAspectRatio } from '../utils';
import GeneratedGallery from './GeneratedGallery/GeneratedGallery';
import { usePlanStreamScroll } from './hooks/usePlanStreamScroll';
import styles from './ResultPanel.module.css';

type ResultPanelProps = {
  phase: ImageTextPhase;
  streamText: string;
  body: string;
  images: ImageTextGeneratedImage[];
  /** 当前出图规格；生成中骨架按比例占位。 */
  spec: GenerateSpecFormFields;
  generating: boolean;
  navLoading: boolean;
  onSaveBody: (body: string) => void;
  onToggleImage: (imageId: string) => void;
  onCancelGenerate: () => void;
  onPrev: () => void;
  onNext: () => void;
};

/** 图文右栏：图文卡片正文，或按比例展示已出图。 */
export default function ResultPanel({
  phase,
  streamText,
  body,
  images,
  spec,
  generating,
  navLoading,
  onSaveBody,
  onToggleImage,
  onCancelGenerate,
  onPrev,
  onNext,
}: ResultPanelProps) {
  const { mode, hydrated } = useThemeMode();
  const planning = phase === 'planning';
  const showPlan = phase === 'plan' || planning || phase === 'planned';
  const liveBody = planning || phase === 'plan' ? streamText : body;
  const displayBody = liveBody.trim();
  const showLiveBody = Boolean(displayBody);
  const groups = groupImagesByAspectRatio(images);
  const canNext = phase === 'planned' && Boolean(body.trim());
  const canPreview = phase === 'generate' && images.some((item) => item.selected);
  const { scrollRef, contentRef, onScroll } = usePlanStreamScroll(
    showLiveBody && planning,
    planning,
    displayBody,
  );

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);

  function startEdit() {
    setDraft(body);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(body);
  }

  function saveEdit() {
    if (!draft.trim()) return;
    onSaveBody(draft);
    setEditing(false);
  }

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined />
        <span className={styles.headTitle}>
          {showPlan ? RESULT_PLAN_TITLE : RESULT_GENERATE_TITLE}
        </span>
        {showPlan && phase === 'planned' && !planning && displayBody && !editing ? (
          <Button size="small" type="link" className={styles.headAction} onClick={startEdit}>
            {EDIT_BUTTON}
          </Button>
        ) : null}
        {editing ? (
          <div className={styles.headActions}>
            <Button size="small" onClick={cancelEdit}>
              {CANCEL_BUTTON}
            </Button>
            <Button size="small" type="primary" disabled={!draft.trim()} onClick={saveEdit}>
              {SAVE_BUTTON}
            </Button>
          </div>
        ) : null}
      </div>
      {planning && !showLiveBody ? (
        <div className={styles.body}>
          <Spin />
        </div>
      ) : showPlan && (showLiveBody || editing) ? (
        <div ref={scrollRef} className={styles.scroll} onScroll={onScroll}>
          <div ref={contentRef} className={styles.planStack}>
            {editing ? (
              <Input.TextArea
                className={styles.editor}
                value={draft}
                autoSize={{ minRows: 16 }}
                onChange={(event) => setDraft(event.target.value)}
              />
            ) : hydrated ? (
              <XMarkdown
                className={`${mode === 'dark' ? 'x-markdown-dark' : 'x-markdown-light'} ${styles.markdown}`}
                content={displayBody}
                components={MARKDOWN_COMPONENTS}
                paragraphTag="div"
                openLinksInNewTab
                escapeRawHtml
                streaming={planning ? MARKDOWN_STREAMING_ON : MARKDOWN_STREAMING_OFF}
                disableDefaultStyles={MARKDOWN_DISABLE_STYLES}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div className={styles.scroll}>
          {showPlan ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={EMPTY_PLAN_HINT} />
          ) : groups.length > 0 || generating ? (
            <GeneratedGallery
              groups={groups}
              aspectRatio={spec.aspectRatio}
              generating={generating}
              onToggle={onToggleImage}
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={EMPTY_GALLERY_HINT} />
          )}
        </div>
      )}
      <div className={styles.footer}>
        {phase === 'generate' && generating ? (
          <Popconfirm
            title={CANCEL_GENERATE_CONFIRM_TITLE}
            description={CANCEL_GENERATE_CONFIRM_DESCRIPTION}
            okText={CANCEL_GENERATE_CONFIRM_OK}
            cancelText={CANCEL_GENERATE_CONFIRM_BACK}
            okButtonProps={{ danger: true }}
            onConfirm={onCancelGenerate}
          >
            <Button size="large" danger>
              {CANCEL_GENERATE_BUTTON}
            </Button>
          </Popconfirm>
        ) : null}
        {phase === 'generate' ? (
          <Button size="large" loading={navLoading} disabled={generating} onClick={onPrev}>
            {PREV_BUTTON}
          </Button>
        ) : null}
        <Button
          size="large"
          type="primary"
          loading={navLoading}
          disabled={showPlan ? !canNext || editing : !canPreview || generating}
          onClick={onNext}
        >
          {NEXT_BUTTON}
        </Button>
      </div>
    </section>
  );
}
