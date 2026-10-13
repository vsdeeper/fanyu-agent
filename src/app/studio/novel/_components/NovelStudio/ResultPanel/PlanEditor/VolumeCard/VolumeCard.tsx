import { Button, Input, InputNumber, Popconfirm, Space } from 'antd';
import { useState } from 'react';
import StudioCard from '@/app/studio/_components/StudioCard';
import {
  CANCEL_BUTTON,
  EDIT_BUTTON,
  SAVE_BUTTON,
} from '@/app/studio/_components/StudioCard/constants';
import {
  ADD_VOLUME_ASSET_BUTTON,
  CONFIRM_CANCEL,
  DELETE_BUTTON,
  EMPTY_FIELD_TEXT,
  VOLUME_ASSET_NAME_LABEL,
  VOLUME_ASSET_USE_LABEL,
  VOLUME_ASSETS_LABEL,
  VOLUME_CONFLICT_LABEL,
  VOLUME_DELETE_CONFIRM_TITLE,
  VOLUME_GEOGRAPHY_LABEL,
  VOLUME_HOOK_LABEL,
  VOLUME_RELATIONS_LABEL,
  VOLUME_TARGET_CHARS_LABEL,
  VOLUME_TARGET_CHARS_SUFFIX,
  VOLUME_TITLE_PLACEHOLDER,
} from '../../../constants';
import type { NovelVolumeOutline } from '../../../types';
import styles from '../card.module.css';
import {
  isSavableVolume,
  trimVolume,
  VOLUME_TARGET_CHARS_MIN,
  volumeToDraft,
  type VolumeAssetDraft,
} from './utils';

type VolumeCardProps = {
  volume: NovelVolumeOutline;
  index: number;
  removable: boolean;
  /** 尚未写入方案的新分卷；取消即丢弃。 */
  pending?: boolean;
  onSave: (next: NovelVolumeOutline) => void;
  onDelete?: () => void;
  onCancelPending?: () => void;
};

/** 一卷：默认只读，编辑后在卡片右下角取消或保存。 */
export default function VolumeCard({
  volume,
  index,
  removable,
  pending = false,
  onSave,
  onDelete,
  onCancelPending,
}: VolumeCardProps) {
  const [editing, setEditing] = useState(pending);
  const [draft, setDraft] = useState(() => volumeToDraft(volume));
  const canSave = isSavableVolume(draft);

  function startEdit() {
    setDraft(volumeToDraft(volume));
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
    const next = trimVolume(volume.id, draft);
    if (!next) return;
    onSave(next);
    setEditing(false);
  }

  function setAsset(index: number, patch: Partial<VolumeAssetDraft>) {
    setDraft({
      ...draft,
      assets: draft.assets.map((asset, assetIndex) =>
        assetIndex === index ? { ...asset, ...patch } : asset,
      ),
    });
  }

  function removeAsset(index: number) {
    setDraft({ ...draft, assets: draft.assets.filter((_, assetIndex) => assetIndex !== index) });
  }

  if (editing) {
    return (
      <StudioCard>
        <div className={styles.editStack}>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{VOLUME_TITLE_PLACEHOLDER}</p>
            <Input
              value={draft.title}
              placeholder={VOLUME_TITLE_PLACEHOLDER}
              autoFocus
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{VOLUME_GEOGRAPHY_LABEL}</p>
            <Input
              value={draft.geography}
              placeholder={VOLUME_GEOGRAPHY_LABEL}
              onChange={(event) => setDraft({ ...draft, geography: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{VOLUME_CONFLICT_LABEL}</p>
            <Input.TextArea
              value={draft.conflict}
              placeholder={VOLUME_CONFLICT_LABEL}
              autoSize={{ minRows: 2, maxRows: 6 }}
              onChange={(event) => setDraft({ ...draft, conflict: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{VOLUME_RELATIONS_LABEL}</p>
            <Input.TextArea
              value={draft.relations}
              placeholder={VOLUME_RELATIONS_LABEL}
              autoSize={{ minRows: 2, maxRows: 6 }}
              onChange={(event) => setDraft({ ...draft, relations: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{VOLUME_ASSETS_LABEL}</p>
            {draft.assets.map((asset, assetIndex) => (
              <div key={assetIndex} className={styles.pair}>
                <Input
                  className={styles.pairName}
                  value={asset.name}
                  placeholder={VOLUME_ASSET_NAME_LABEL}
                  onChange={(event) => setAsset(assetIndex, { name: event.target.value })}
                />
                <Input
                  className={styles.pairText}
                  value={asset.use}
                  placeholder={VOLUME_ASSET_USE_LABEL}
                  onChange={(event) => setAsset(assetIndex, { use: event.target.value })}
                />
                <Button type="text" danger size="small" onClick={() => removeAsset(assetIndex)}>
                  {DELETE_BUTTON}
                </Button>
              </div>
            ))}
            <Button
              size="small"
              color="primary"
              variant="dashed"
              onClick={() =>
                setDraft({ ...draft, assets: [...draft.assets, { name: '', use: '' }] })
              }
            >
              {ADD_VOLUME_ASSET_BUTTON}
            </Button>
          </div>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{VOLUME_HOOK_LABEL}</p>
            <Input.TextArea
              value={draft.hook}
              placeholder={VOLUME_HOOK_LABEL}
              autoSize={{ minRows: 2, maxRows: 6 }}
              onChange={(event) => setDraft({ ...draft, hook: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{VOLUME_TARGET_CHARS_LABEL}</p>
            <Space.Compact className={styles.targetChars} block>
              <InputNumber
                min={VOLUME_TARGET_CHARS_MIN}
                step={10000}
                value={draft.targetChars}
                placeholder={VOLUME_TARGET_CHARS_LABEL}
                onChange={(value) =>
                  setDraft({ ...draft, targetChars: typeof value === 'number' ? value : null })
                }
              />
              <Space.Addon>{VOLUME_TARGET_CHARS_SUFFIX}</Space.Addon>
            </Space.Compact>
          </div>
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
          <span title={volume.title}>{volume.title}</span>
        </span>
      }
      extra={
        <span className={styles.extra}>
          {removable && onDelete ? (
            <Popconfirm
              title={VOLUME_DELETE_CONFIRM_TITLE}
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
        <div>
          <p className={styles.readLabel}>{VOLUME_GEOGRAPHY_LABEL}</p>
          <p className={styles.readText}>{volume.geography}</p>
        </div>
        <div>
          <p className={styles.readLabel}>{VOLUME_CONFLICT_LABEL}</p>
          <p className={styles.readText}>{volume.conflict}</p>
        </div>
        <div>
          <p className={styles.readLabel}>{VOLUME_RELATIONS_LABEL}</p>
          <p className={styles.readText}>{volume.relations || EMPTY_FIELD_TEXT}</p>
        </div>
        <div>
          <p className={styles.readLabel}>{VOLUME_ASSETS_LABEL}</p>
          {volume.assets.length > 0 ? (
            volume.assets.map((asset) => (
              <p key={`${asset.name}-${asset.use}`} className={styles.readText}>
                {asset.name}：{asset.use}
              </p>
            ))
          ) : (
            <p className={styles.readText}>{EMPTY_FIELD_TEXT}</p>
          )}
        </div>
        <div>
          <p className={styles.readLabel}>{VOLUME_HOOK_LABEL}</p>
          <p className={styles.readText}>{volume.hook || EMPTY_FIELD_TEXT}</p>
        </div>
        <div>
          <p className={styles.readLabel}>{VOLUME_TARGET_CHARS_LABEL}</p>
          <p className={styles.readText}>
            {volume.targetChars} {VOLUME_TARGET_CHARS_SUFFIX}
          </p>
        </div>
      </div>
    </StudioCard>
  );
}
