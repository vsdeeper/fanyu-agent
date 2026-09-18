import { Button, Card, Empty, Modal, Tag, Typography } from 'antd';
import type { StyleDimension } from '../types';
import { CANCEL_BUTTON, CONFIRM_BUTTON, MODAL_WIDTH, NO_CARDS_HINT } from './constants';
import styles from './StyleDimensionModal.module.css';

export type StyleDimensionModalProps = {
  dimension: StyleDimension;
  selectedIds: readonly string[];
  disabled?: boolean;
  onToggle: (cardId: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

/** 单个文风维度的卡片弹框：按大分类分组，卡片多选，确定才提交。 */
export default function StyleDimensionModal({
  dimension,
  selectedIds,
  disabled,
  onToggle,
  onCancel,
  onConfirm,
}: StyleDimensionModalProps) {
  const visibleGroups = dimension.groups.filter((group) => group.cards.length > 0);

  return (
    <Modal
      title={dimension.label}
      open
      onCancel={onCancel}
      width={MODAL_WIDTH}
      destroyOnHidden
      mask={{ closable: !disabled }}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {CANCEL_BUTTON}
        </Button>,
        <Button key="confirm" type="primary" disabled={disabled} onClick={onConfirm}>
          {CONFIRM_BUTTON}
        </Button>,
      ]}
    >
      <div className={styles.body}>
        {visibleGroups.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={NO_CARDS_HINT} />
        ) : null}
        {visibleGroups.map((group, index) => (
          <section key={`${dimension.key}-${index}`} className={styles.group}>
            <Typography.Title level={5} className={styles.groupTitle}>
              {group.title}
            </Typography.Title>
            <div className={styles.grid}>
              {group.cards.map((card) => {
                const selected = selectedIds.includes(card.id);
                return (
                  <Card
                    key={card.id}
                    size="small"
                    hoverable={!disabled}
                    className={`${styles.card} ${selected ? styles.selected : ''}`}
                    onClick={() => {
                      if (disabled) return;
                      onToggle(card.id);
                    }}
                  >
                    {card.tag ? (
                      <Tag color={selected ? 'processing' : undefined}>{card.tag}</Tag>
                    ) : null}
                    {card.description ? <p className={styles.desc}>{card.description}</p> : null}
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
}
