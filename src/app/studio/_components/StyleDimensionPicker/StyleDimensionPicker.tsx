import { useState } from 'react';
import { Button, Flex, Tag } from 'antd';
import { STYLE_DIMENSIONS } from './style-dimensions';
import type { StyleDimension, StyleDimensionKey, StyleDimensionSelections } from './types';
import { applyDimensionSelection, selectCardsByIds, toggleStyleCardId } from './utils';
import { LIBRARY_EMPTY_HINT, PICK_BUTTON, UNSELECTED_HINT } from './constants';
import StyleDimensionModal from './StyleDimensionModal';
import styles from './StyleDimensionPicker.module.css';

export type StyleDimensionPickerProps = {
  /** 受控值；未传按空选择处理（Form.Item 首帧可能注入 undefined） */
  value?: StyleDimensionSelections;
  disabled?: boolean;
  /** 与 value 一样由 Form.Item 注入，故可选；独立使用时必须传 */
  onChange?: (next: StyleDimensionSelections) => void;
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
};

/**
 * 文风维度卡片选择：每个维度一个入口，弹框内按轴选卡（互斥轴单选、可叠加轴多选），
 * 确定后以 Tag 回显。弹框内改动只落在草稿，取消即丢弃。
 */
export default function StyleDimensionPicker({
  value,
  disabled,
  onChange,
  id,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: StyleDimensionPickerProps) {
  const selections: StyleDimensionSelections = value ?? {};
  const [openKey, setOpenKey] = useState<StyleDimensionKey | null>(null);
  const [draftIds, setDraftIds] = useState<readonly string[]>([]);

  const activeDimension = STYLE_DIMENSIONS.find((dimension) => dimension.key === openKey);
  const libraryEmpty = STYLE_DIMENSIONS.every((dimension) =>
    dimension.groups.every((group) => group.cards.length === 0),
  );

  function openDimension(key: StyleDimensionKey) {
    setDraftIds(selections[key] ?? []);
    setOpenKey(key);
  }

  function closeDimension() {
    setOpenKey(null);
    setDraftIds([]);
  }

  function handleRemoveCard(dimension: StyleDimension, cardId: string) {
    onChange?.(
      applyDimensionSelection(
        selections,
        dimension.key,
        toggleStyleCardId(dimension, selections[dimension.key] ?? [], cardId),
      ),
    );
  }

  return (
    <div
      className={styles.picker}
      id={id}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
    >
      {STYLE_DIMENSIONS.map((dimension) => {
        const cards = selectCardsByIds(dimension, selections[dimension.key] ?? []);
        return (
          <div key={dimension.key} className={styles.dimension}>
            <div className={styles.head}>
              <span className={styles.label}>{dimension.label}</span>
              <Button
                color="default"
                variant="text"
                size="small"
                className={styles.pick}
                disabled={disabled}
                onClick={() => openDimension(dimension.key)}
              >
                {PICK_BUTTON}
              </Button>
            </div>
            {cards.length === 0 ? (
              <span className={styles.unselected}>{UNSELECTED_HINT}</span>
            ) : (
              <Flex wrap gap={4}>
                {cards.map((card) => (
                  <Tag
                    key={card.id}
                    closable={!disabled}
                    onClose={() => handleRemoveCard(dimension, card.id)}
                  >
                    {card.tag}
                  </Tag>
                ))}
              </Flex>
            )}
          </div>
        );
      })}

      {libraryEmpty ? <p className={styles.emptyHint}>{LIBRARY_EMPTY_HINT}</p> : null}

      {activeDimension && openKey ? (
        <StyleDimensionModal
          dimension={activeDimension}
          selectedIds={draftIds}
          disabled={disabled}
          onToggle={(cardId) => setDraftIds(toggleStyleCardId(activeDimension, draftIds, cardId))}
          onCancel={closeDimension}
          onConfirm={() => {
            onChange?.(applyDimensionSelection(selections, openKey, draftIds));
            closeDimension();
          }}
        />
      ) : null}
    </div>
  );
}
