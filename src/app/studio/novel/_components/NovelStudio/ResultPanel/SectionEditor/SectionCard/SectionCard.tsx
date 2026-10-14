import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Input, Popconfirm } from 'antd';
import { useState } from 'react';
import StudioCard from '@/app/studio/_components/StudioCard';
import {
  CANCEL_BUTTON,
  EDIT_BUTTON,
  SAVE_BUTTON,
} from '@/app/studio/_components/StudioCard/constants';
import {
  ADD_BLOCK_BUTTON,
  BLOCK_BODY_LABEL,
  BLOCK_BODY_PLACEHOLDER,
  BLOCK_DELETE_CONFIRM_TITLE,
  BLOCK_TITLE_LABEL,
  BLOCK_TITLE_PLACEHOLDER,
  CONFIRM_CANCEL,
  DELETE_BUTTON,
  EMPTY_FIELD_TEXT,
  SECTION_DELETE_CONFIRM_TITLE,
  SECTION_TITLE_LABEL,
  SECTION_TITLE_PLACEHOLDER,
} from '../../../constants';
import type { NovelSection } from '../../../types';
import styles from '../SectionEditor.module.css';
import { createBlockDraft, isSavableSection, sectionToDraft, trimSection } from '../utils';

type SectionCardProps = {
  section: NovelSection;
  index: number;
  /** 尚未写入的新一节；取消即丢弃。 */
  pending?: boolean;
  onSave: (next: NovelSection) => void;
  onCancelPending?: () => void;
  onDelete?: () => void;
};

/** 一节：一级标题加若干二级内容块，默认只读，点编辑后取消或保存。 */
export default function SectionCard({
  section,
  index,
  pending = false,
  onSave,
  onCancelPending,
  onDelete,
}: SectionCardProps) {
  const [editing, setEditing] = useState(pending);
  const [draft, setDraft] = useState(() => sectionToDraft(section));
  const canSave = isSavableSection(draft);

  function startEdit() {
    setDraft(sectionToDraft(section));
    setEditing(true);
  }

  function cancelEdit() {
    if (pending) {
      onCancelPending?.();
      return;
    }
    setEditing(false);
  }

  function saveEdit() {
    const next = trimSection(section.id, draft);
    if (!next) return;
    onSave(next);
    setEditing(false);
  }

  function updateBlock(blockIndex: number, patch: Partial<{ title: string; body: string }>) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block, i) => (i === blockIndex ? { ...block, ...patch } : block)),
    }));
  }

  function addBlock() {
    setDraft((current) => ({ ...current, blocks: [...current.blocks, createBlockDraft()] }));
  }

  function removeBlock(blockIndex: number) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.filter((_, i) => i !== blockIndex),
    }));
  }

  if (editing) {
    return (
      <StudioCard>
        <div className={styles.editStack}>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{SECTION_TITLE_LABEL}</p>
            <Input
              value={draft.title}
              placeholder={SECTION_TITLE_PLACEHOLDER}
              autoFocus
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </div>
          {draft.blocks.map((block, blockIndex) => (
            <div key={blockIndex} className={styles.block}>
              <div className={styles.blockHead}>
                <p className={styles.fieldLabel}>{BLOCK_TITLE_LABEL}</p>
                <Popconfirm
                  title={BLOCK_DELETE_CONFIRM_TITLE}
                  okText={DELETE_BUTTON}
                  cancelText={CONFIRM_CANCEL}
                  okButtonProps={{ danger: true }}
                  onConfirm={() => removeBlock(blockIndex)}
                >
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
              <Input
                value={block.title}
                placeholder={BLOCK_TITLE_PLACEHOLDER}
                onChange={(event) => updateBlock(blockIndex, { title: event.target.value })}
              />
              <p className={styles.fieldLabel}>{BLOCK_BODY_LABEL}</p>
              <Input.TextArea
                value={block.body}
                placeholder={BLOCK_BODY_PLACEHOLDER}
                autoSize={{ minRows: 2, maxRows: 12 }}
                onChange={(event) => updateBlock(blockIndex, { body: event.target.value })}
              />
            </div>
          ))}
          <Button block variant="dashed" color="primary" icon={<PlusOutlined />} onClick={addBlock}>
            {ADD_BLOCK_BUTTON}
          </Button>
          <div className={styles.actions}>
            <Button size="small" onClick={cancelEdit}>
              {CANCEL_BUTTON}
            </Button>
            <Button size="small" type="primary" disabled={!canSave} onClick={saveEdit}>
              {SAVE_BUTTON}
            </Button>
          </div>
        </div>
      </StudioCard>
    );
  }

  return (
    <StudioCard
      title={
        <span className={styles.title}>
          <span className={styles.index}>{index + 1}</span>
          <span title={section.title}>{section.title || EMPTY_FIELD_TEXT}</span>
        </span>
      }
      extra={
        <span className={styles.extra}>
          {onDelete ? (
            <Popconfirm
              title={SECTION_DELETE_CONFIRM_TITLE}
              okText={DELETE_BUTTON}
              cancelText={CONFIRM_CANCEL}
              okButtonProps={{ danger: true }}
              onConfirm={onDelete}
            >
              <Button type="text" danger size="small">
                {DELETE_BUTTON}
              </Button>
            </Popconfirm>
          ) : null}
          <Button type="link" size="small" onClick={startEdit}>
            {EDIT_BUTTON}
          </Button>
        </span>
      }
    >
      <div className={styles.readStack}>
        {section.blocks.length > 0 ? (
          section.blocks.map((block, blockIndex) => (
            <div key={blockIndex} className={styles.readBlock}>
              {block.title ? <p className={styles.readLabel}>{block.title}</p> : null}
              <p className={styles.readText}>{block.body}</p>
            </div>
          ))
        ) : (
          <p className={styles.readText}>{EMPTY_FIELD_TEXT}</p>
        )}
      </div>
    </StudioCard>
  );
}
