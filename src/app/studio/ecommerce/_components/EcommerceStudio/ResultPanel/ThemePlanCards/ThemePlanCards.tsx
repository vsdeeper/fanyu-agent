import { Button, Card, Input } from 'antd';
import { useState } from 'react';
import type { ThemePlanCard } from '@/app/api/studio/ecommerce/_shared/theme-plan';
import { AI_ASSIST_BUTTON, CANCEL_BUTTON, EDIT_BUTTON, SAVE_BUTTON } from './constants';
import { useThemePlanAiAssist } from './hooks/useThemePlanAiAssist';
import styles from './ThemePlanCards.module.css';

export type ThemePlanSelectionMode = 'single' | 'multiple';

type ThemePlanCardsProps = {
  cards: ThemePlanCard[];
  selectedThemeIds: string[];
  selectionMode?: ThemePlanSelectionMode;
  streaming?: boolean;
  disabled?: boolean;
  onToggleTheme: (themeId: string) => void;
  onCardSave: (themeId: string, requirement: string) => void;
  onEditingChange?: (editing: boolean) => void;
  onAiAssist?: (themeId: string, draft: string) => Promise<string>;
};

/**
 * 主题规划右栏：可点选、可逐卡编辑的主题 Card；主图多选，详情图单选。
 */
export default function ThemePlanCards({
  cards,
  selectedThemeIds,
  selectionMode = 'multiple',
  streaming = false,
  disabled = false,
  onToggleTheme,
  onCardSave,
  onEditingChange,
  onAiAssist,
}: ThemePlanCardsProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const { assistLoading, runAssist, invalidateAssist } = useThemePlanAiAssist(onAiAssist, setDraft);
  const canInteract = !streaming && !disabled;

  const startEdit = (key: string, value: string) => {
    invalidateAssist();
    setEditingKey(key);
    setDraft(value);
    onEditingChange?.(true);
  };

  const cancelEdit = () => {
    invalidateAssist();
    setEditingKey(null);
    setDraft('');
    onEditingChange?.(false);
  };

  const saveEdit = (key: string) => {
    const next = draft.trim();
    if (!next) return;
    onCardSave(key, next);
    cancelEdit();
  };

  const renderExtra = (key: string, value: string) => {
    if (!canInteract) return null;
    if (editingKey === key) {
      return (
        <span onClick={(event) => event.stopPropagation()}>
          <Button type="link" size="small" disabled={assistLoading} onClick={cancelEdit}>
            {CANCEL_BUTTON}
          </Button>
          <Button
            type="link"
            size="small"
            disabled={!draft.trim() || assistLoading}
            onClick={() => saveEdit(key)}
          >
            {SAVE_BUTTON}
          </Button>
        </span>
      );
    }
    if (editingKey) return null;
    return (
      <Button
        type="link"
        size="small"
        onClick={(event) => {
          event.stopPropagation();
          startEdit(key, value);
        }}
      >
        {EDIT_BUTTON}
      </Button>
    );
  };

  return (
    <div className={styles.list} data-selection-mode={selectionMode}>
      {cards.map((card) => {
        const selected = selectedThemeIds.includes(card.themeId);
        const editing = editingKey === card.themeId;
        return (
          <Card
            key={card.themeId}
            size="small"
            hoverable={canInteract && !editingKey}
            title={card.title}
            extra={renderExtra(card.themeId, card.requirement)}
            className={`${styles.card} ${selected ? styles.selected : ''}`}
            onClick={() => {
              if (!canInteract || editingKey) return;
              onToggleTheme(card.themeId);
            }}
          >
            {editing ? (
              <div className={styles.editorWrap} onClick={(event) => event.stopPropagation()}>
                <Input.TextArea
                  className={styles.editor}
                  value={draft}
                  autoSize={{ minRows: 4, maxRows: 10 }}
                  disabled={assistLoading}
                  onChange={(event) => setDraft(event.target.value)}
                />
                {onAiAssist ? (
                  <span className={styles.aiAssist}>
                    <Button
                      type="link"
                      size="small"
                      loading={assistLoading}
                      disabled={assistLoading}
                      onClick={() => void runAssist(card.themeId, draft)}
                    >
                      {AI_ASSIST_BUTTON}
                    </Button>
                  </span>
                ) : null}
              </div>
            ) : (
              <p className={styles.body}>{card.requirement}</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
