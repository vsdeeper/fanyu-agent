import { useState } from 'react';
import type { ThemePlanCard } from '@/app/api/studio/ecommerce/_shared/theme-plan';
import SelectableCard from '@/app/studio/_components/SelectableCard';
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
  const canInteract = !streaming && !disabled;

  return (
    <div className={styles.list} data-selection-mode={selectionMode}>
      {cards.map((card) => {
        const selected = selectedThemeIds.includes(card.themeId);
        const editing = editingKey === card.themeId;
        const interactive = canInteract && !editingKey;
        const editable = canInteract && (!editingKey || editing);
        return (
          <SelectableCard
            key={card.themeId}
            title={card.title}
            selected={selected}
            interactive={interactive}
            onClick={interactive ? () => onToggleTheme(card.themeId) : undefined}
            editable={editable}
            editing={editing}
            value={card.requirement}
            editPlacement="extra"
            textareaAutoSize={{ minRows: 4, maxRows: 10 }}
            onEditingChange={(next) => {
              setEditingKey(next ? card.themeId : null);
              onEditingChange?.(next);
            }}
            onSave={(next) => onCardSave(card.themeId, next)}
            onAiAssist={onAiAssist ? (draft) => onAiAssist(card.themeId, draft) : undefined}
          />
        );
      })}
    </div>
  );
}
