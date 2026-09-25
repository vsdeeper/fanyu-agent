import { UploadOutlined } from '@ant-design/icons';
import { Button, Drawer, Image, Input, Popconfirm, Select, Tag, Upload } from 'antd';
import {
  resolveClarityForModel,
  toClarityOptions,
  toModelOptions,
} from '@/app/studio/_utils/model-options';
import { interceptLocalFiles } from '@/lib/shared/client/upload-items';
import {
  APPLY_HISTORY_BUTTON,
  CANCEL_BUTTON,
  COPY_IMAGE_BUTTON,
  CURRENT_SLOTS_TITLE,
  DEFAULT_IMAGE_ASPECT,
  DEFAULT_IMAGE_CLARITY,
  DEFAULT_IMAGE_MODEL,
  DELETE_BUTTON,
  GENERATE_SLOT_BUTTON,
  HISTORY_DELETE_CONFIRM_TITLE,
  IMAGE_ASPECT_LABEL,
  IMAGE_ASPECT_RATIO_OPTIONS,
  IMAGE_CLARITY_LABEL,
  IMAGE_HISTORY_TITLE,
  IMAGE_MODEL_LABEL,
  IMAGE_VISUAL_STYLE_PLACEHOLDER,
  IMAGE_VISUAL_STYLE_TITLE,
  UPLOAD_SLOT_BUTTON,
} from '../constants';
import type { ImageHistoryItem, ImageSlot } from '../types';
import styles from './ImageSlotDrawer.module.css';

const DRAWER_WIDTH = 420;

type ImageSlotDrawerProps = {
  open: boolean;
  imageSlots: ImageSlot[];
  imageHistory: ImageHistoryItem[];
  imageVisualStyle: string;
  activeSlotId?: string;
  onClose: () => void;
  onSelectSlot: (slotId: string) => void;
  onVisualStyleChange: (value: string) => void;
  onSlotPromptChange: (slotId: string, prompt: string) => void;
  onSlotAspectRatioChange: (slotId: string, aspectRatio: string) => void;
  onSlotModelChange: (slotId: string, model: string) => void;
  onSlotClarityChange: (slotId: string, clarity: string) => void;
  onGenerateSlot: (slotId: string) => void;
  onUploadSlot: (slotId: string, file: File) => void;
  onApplyHistory: (historyId: string) => void;
  onRemoveHistory: (historyId: string) => void;
  onCopyImage: (url: string) => void;
};

/** 成稿配图抽屉（整窗级）：上方整套视觉约束与当前槽，下方旧槽位。 */
export default function ImageSlotDrawer({
  open,
  imageSlots,
  imageHistory,
  imageVisualStyle,
  activeSlotId,
  onClose,
  onSelectSlot,
  onVisualStyleChange,
  onSlotPromptChange,
  onSlotAspectRatioChange,
  onSlotModelChange,
  onSlotClarityChange,
  onGenerateSlot,
  onUploadSlot,
  onApplyHistory,
  onRemoveHistory,
  onCopyImage,
}: ImageSlotDrawerProps) {
  return (
    <Drawer
      placement="right"
      open={open}
      onClose={onClose}
      title="配图槽位"
      size={DRAWER_WIDTH}
      destroyOnHidden
      styles={{ body: { padding: 16 } }}
    >
      <div className={styles.body}>
        <p className={styles.sectionTitle}>{IMAGE_VISUAL_STYLE_TITLE}</p>
        <Input.TextArea
          rows={3}
          value={imageVisualStyle}
          placeholder={IMAGE_VISUAL_STYLE_PLACEHOLDER}
          onChange={(event) => onVisualStyleChange(event.target.value)}
        />

        <p className={styles.sectionTitle}>{CURRENT_SLOTS_TITLE}</p>
        <div className={styles.slotList}>
          {imageSlots.length === 0 ? (
            <p className={styles.empty}>暂无槽位，请先规划配图</p>
          ) : (
            imageSlots.map((slot) => {
              const model = slot.model ?? DEFAULT_IMAGE_MODEL;
              const clarity = slot.clarity ?? DEFAULT_IMAGE_CLARITY;
              return (
                <div
                  key={slot.id}
                  id={`long-slot-${slot.id}`}
                  className={`${styles.slotCard} ${activeSlotId === slot.id ? styles.slotActive : ''}`}
                  onClick={() => onSelectSlot(slot.id)}
                >
                  <Tag color={slot.role === 'cover' ? 'blue' : 'default'}>{slot.label}</Tag>
                  <Input.TextArea
                    rows={3}
                    value={slot.promptDraft}
                    placeholder="配图提示词"
                    onChange={(event) => onSlotPromptChange(slot.id, event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <div className={styles.specGrid} onClick={(event) => event.stopPropagation()}>
                    <label className={styles.specField}>
                      <span className={styles.specLabel}>{IMAGE_MODEL_LABEL}</span>
                      <Select
                        size="small"
                        value={model}
                        options={toModelOptions()}
                        onChange={(value) => {
                          onSlotModelChange(slot.id, value);
                          onSlotClarityChange(slot.id, resolveClarityForModel(value, clarity));
                        }}
                      />
                    </label>
                    <label className={styles.specField}>
                      <span className={styles.specLabel}>{IMAGE_ASPECT_LABEL}</span>
                      <Select
                        size="small"
                        value={slot.aspectRatio ?? DEFAULT_IMAGE_ASPECT}
                        options={IMAGE_ASPECT_RATIO_OPTIONS}
                        onChange={(value) => onSlotAspectRatioChange(slot.id, value)}
                      />
                    </label>
                    <label className={styles.specField}>
                      <span className={styles.specLabel}>{IMAGE_CLARITY_LABEL}</span>
                      <Select
                        size="small"
                        value={clarity}
                        options={toClarityOptions(model)}
                        onChange={(value) => onSlotClarityChange(slot.id, value)}
                      />
                    </label>
                  </div>
                  {slot.assetUrl ? (
                    <Image src={slot.assetUrl} alt={slot.label} className={styles.preview} />
                  ) : null}
                  <div className={styles.actions}>
                    <Button
                      type="primary"
                      size="small"
                      loading={slot.generating}
                      onClick={(event) => {
                        event.stopPropagation();
                        onGenerateSlot(slot.id);
                      }}
                    >
                      {GENERATE_SLOT_BUTTON}
                    </Button>
                    <span
                      className={styles.uploadWrap}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectSlot(slot.id);
                      }}
                    >
                      <Upload
                        accept="image/*"
                        showUploadList={false}
                        maxCount={1}
                        pastable={activeSlotId === slot.id}
                        beforeUpload={(file, fileList) =>
                          interceptLocalFiles(file, fileList, (files) => {
                            const first = files[0];
                            if (first) onUploadSlot(slot.id, first);
                          })
                        }
                      >
                        <Button size="small" icon={<UploadOutlined />}>
                          {UPLOAD_SLOT_BUTTON}
                        </Button>
                      </Upload>
                    </span>
                    {slot.assetUrl ? (
                      <Button
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          onCopyImage(slot.assetUrl!);
                        }}
                      >
                        {COPY_IMAGE_BUTTON}
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {imageHistory.length > 0 ? (
          <>
            <div className={styles.divider} />
            <p className={styles.sectionTitle}>{IMAGE_HISTORY_TITLE}</p>
            <div className={styles.slotList}>
              {imageHistory.map((item) => (
                <div key={item.id} className={styles.historyCard}>
                  {item.label ? <Tag>{item.label}</Tag> : null}
                  <Image
                    src={item.assetUrl}
                    alt={item.label ?? item.id}
                    className={styles.preview}
                  />
                  <div className={styles.actions}>
                    <Button size="small" type="primary" onClick={() => onApplyHistory(item.id)}>
                      {APPLY_HISTORY_BUTTON}
                    </Button>
                    <Button size="small" onClick={() => onCopyImage(item.assetUrl)}>
                      {COPY_IMAGE_BUTTON}
                    </Button>
                    <Popconfirm
                      title={HISTORY_DELETE_CONFIRM_TITLE}
                      okText={DELETE_BUTTON}
                      cancelText={CANCEL_BUTTON}
                      okButtonProps={{ danger: true }}
                      onConfirm={() => onRemoveHistory(item.id)}
                    >
                      <Button size="small" danger>
                        {DELETE_BUTTON}
                      </Button>
                    </Popconfirm>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </Drawer>
  );
}
