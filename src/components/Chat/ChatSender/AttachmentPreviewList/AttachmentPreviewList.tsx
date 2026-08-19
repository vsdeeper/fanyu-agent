'use client';

import FileCard from '@ant-design/x/es/file-card';
import { CloseCircleFilled, PlusOutlined } from '@ant-design/icons';
import { Button, Skeleton } from 'antd';
import type { AttachmentItem } from '../utils';
import { PREVIEW_CARD_SIZE } from './constants';
import styles from './AttachmentPreviewList.module.css';
import { toPreviewCardModel } from './utils';

export type AttachmentPreviewListProps = {
  items: AttachmentItem[];
  disabled?: boolean;
  canAdd?: boolean;
  onRemove: (uid: string) => void;
  onAdd: () => void;
};

export default function AttachmentPreviewList({
  items,
  disabled = false,
  canAdd = false,
  onRemove,
  onAdd,
}: AttachmentPreviewListProps) {
  if (items.length === 0) return null;

  return (
    <div className={styles.list}>
      {items.map((item) => {
        const card = toPreviewCardModel(item);
        const isImage = card.cardType === 'image';
        return (
          <div className={styles.item} key={card.uid}>
            <FileCard
              name={card.name}
              byte={card.byte}
              src={card.src}
              type={card.cardType}
              styles={
                isImage
                  ? {
                      file: {
                        width: PREVIEW_CARD_SIZE,
                        height: PREVIEW_CARD_SIZE,
                        overflow: 'hidden',
                        borderRadius: 6,
                      },
                    }
                  : undefined
              }
              imageProps={
                isImage
                  ? {
                      placeholder: (
                        <Skeleton.Image
                          active
                          style={{ width: PREVIEW_CARD_SIZE, height: PREVIEW_CARD_SIZE }}
                        />
                      ),
                    }
                  : undefined
              }
            />
            <button
              type="button"
              className={styles.remove}
              aria-label={`移除附件 ${card.name}`}
              disabled={disabled}
              onClick={() => onRemove(card.uid)}
            >
              <CloseCircleFilled />
            </button>
          </div>
        );
      })}
      {canAdd ? (
        <Button
          className={styles.addBtn}
          type="dashed"
          aria-label="添加附件"
          disabled={disabled}
          icon={<PlusOutlined />}
          style={{ width: PREVIEW_CARD_SIZE, height: PREVIEW_CARD_SIZE }}
          onClick={onAdd}
        />
      ) : null}
    </div>
  );
}
