import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Input, Popconfirm, Select } from 'antd';
import { useState } from 'react';
import { characterNameById } from '@/app/api/studio/novel/_shared/character-ids';
import {
  CANCEL_BUTTON,
  EDIT_BUTTON,
  SAVE_BUTTON,
} from '@/app/studio/_components/StudioCard/constants';
import {
  ADD_BEAT_BUTTON,
  BEAT_CHARACTERS_LABEL,
  BEAT_CHARACTERS_PLACEHOLDER,
  BEAT_DELETE_CONFIRM_TITLE,
  BEAT_EVENT_LABEL,
  BEAT_EVENT_PLACEHOLDER,
  BEAT_TITLE_PLACEHOLDER,
  CONFIRM_CANCEL,
  DELETE_BUTTON,
  EMPTY_FIELD_TEXT,
  VOLUME_BEATS_LABEL,
  VOLUME_CONFLICT_LABEL,
  VOLUME_DELETE_CONFIRM_TITLE,
  VOLUME_HOOK_LABEL,
  VOLUME_SELECTED_HINT,
  VOLUME_TITLE_LABEL,
  VOLUME_TITLE_PLACEHOLDER,
} from '../../../constants';
import type { NovelCharacter, NovelVolumeDesign } from '../../../types';
import styles from '../VolumeDesignEditor.module.css';
import { createBeatDraft, isSavableVolume, trimVolume, volumeToDraft } from '../utils';

type VolumeCardProps = {
  volume: NovelVolumeDesign;
  index: number;
  characters: NovelCharacter[];
  selected: boolean;
  /** 尚未写入的新一卷；取消即丢弃。 */
  pending?: boolean;
  onSelect: () => void;
  onSave: (next: NovelVolumeDesign) => void;
  onCancelPending?: () => void;
  onDelete?: () => void;
};

/** 一卷卷纲：标题、冲突、钩子与节拍。默认只读，点编辑后取消或保存；点卡片本身点选这一卷。 */
export default function VolumeCard({
  volume,
  index,
  characters,
  selected,
  pending = false,
  onSelect,
  onSave,
  onCancelPending,
  onDelete,
}: VolumeCardProps) {
  const [editing, setEditing] = useState(pending);
  const [draft, setDraft] = useState(() => volumeToDraft(volume, characters));
  const canSave = isSavableVolume(draft);
  const characterOptions = characters.map((character) => ({
    label: character.name,
    value: character.id,
  }));

  function startEdit() {
    setDraft(volumeToDraft(volume, characters));
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
    const next = trimVolume(volume.id, draft, volume);
    if (!next) return;
    onSave(next);
    setEditing(false);
  }

  function updateBeat(beatIndex: number, patch: Partial<{ title: string; event: string }>) {
    setDraft((current) => ({
      ...current,
      beats: current.beats.map((beat, i) => (i === beatIndex ? { ...beat, ...patch } : beat)),
    }));
  }

  function updateBeatCharacters(beatIndex: number, characterIds: string[]) {
    setDraft((current) => ({
      ...current,
      beats: current.beats.map((beat, i) => (i === beatIndex ? { ...beat, characterIds } : beat)),
    }));
  }

  function addBeat() {
    setDraft((current) => ({ ...current, beats: [...current.beats, createBeatDraft()] }));
  }

  function removeBeat(beatIndex: number) {
    setDraft((current) => ({
      ...current,
      beats: current.beats.filter((_, i) => i !== beatIndex),
    }));
  }

  if (editing) {
    return (
      <Card size="small" className={styles.volumeCard}>
        <div className={styles.editStack}>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{VOLUME_TITLE_LABEL}</p>
            <Input
              value={draft.title}
              placeholder={VOLUME_TITLE_PLACEHOLDER}
              autoFocus
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{VOLUME_CONFLICT_LABEL}</p>
            <Input.TextArea
              value={draft.conflict}
              autoSize={{ minRows: 2, maxRows: 6 }}
              onChange={(event) => setDraft({ ...draft, conflict: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{VOLUME_HOOK_LABEL}</p>
            <Input.TextArea
              value={draft.hook}
              autoSize={{ minRows: 2, maxRows: 6 }}
              onChange={(event) => setDraft({ ...draft, hook: event.target.value })}
            />
          </div>
          <p className={styles.fieldLabel}>{VOLUME_BEATS_LABEL}</p>
          {draft.beats.map((beat, beatIndex) => (
            <div key={beatIndex} className={styles.beatBox}>
              <div className={styles.beatHead}>
                <span className={styles.beatIndex}>{beatIndex + 1}</span>
                <Popconfirm
                  title={BEAT_DELETE_CONFIRM_TITLE}
                  okText={DELETE_BUTTON}
                  cancelText={CONFIRM_CANCEL}
                  okButtonProps={{ danger: true }}
                  onConfirm={() => removeBeat(beatIndex)}
                >
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
              <Input
                value={beat.title}
                placeholder={BEAT_TITLE_PLACEHOLDER}
                onChange={(event) => updateBeat(beatIndex, { title: event.target.value })}
              />
              <p className={styles.fieldLabel}>{BEAT_EVENT_LABEL}</p>
              <Input.TextArea
                value={beat.event}
                placeholder={BEAT_EVENT_PLACEHOLDER}
                autoSize={{ minRows: 2, maxRows: 10 }}
                onChange={(event) => updateBeat(beatIndex, { event: event.target.value })}
              />
              <p className={styles.fieldLabel}>{BEAT_CHARACTERS_LABEL}</p>
              <Select
                mode="multiple"
                allowClear
                value={beat.characterIds}
                options={characterOptions}
                placeholder={BEAT_CHARACTERS_PLACEHOLDER}
                showSearch={{ optionFilterProp: 'label' }}
                onChange={(value: string[]) => updateBeatCharacters(beatIndex, value)}
              />
            </div>
          ))}
          <Button block variant="dashed" color="primary" icon={<PlusOutlined />} onClick={addBeat}>
            {ADD_BEAT_BUTTON}
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
      </Card>
    );
  }

  return (
    <Card
      size="small"
      className={selected ? `${styles.volumeCard} ${styles.selected}` : styles.volumeCard}
    >
      <div className={styles.header}>
        <button
          type="button"
          className={styles.selectButton}
          aria-pressed={selected}
          onClick={onSelect}
        >
          <span className={styles.index}>{index + 1}</span>
          <span className={styles.bodyStack}>
            <span className={styles.titleText}>{volume.title || EMPTY_FIELD_TEXT}</span>
            <span className={styles.fieldLabel}>{VOLUME_CONFLICT_LABEL}</span>
            <span className={styles.readText}>{volume.conflict || EMPTY_FIELD_TEXT}</span>
            <span className={styles.fieldLabel}>{VOLUME_HOOK_LABEL}</span>
            <span className={styles.readText}>{volume.hook || EMPTY_FIELD_TEXT}</span>
            <span className={styles.fieldLabel}>{VOLUME_BEATS_LABEL}</span>
            {volume.beats.length > 0 ? (
              volume.beats.map((beat, beatIndex) => {
                const who = beat.characterIds
                  .map((id) => characterNameById(id, characters))
                  .filter(Boolean)
                  .join('、');
                return (
                  <span key={beat.id} className={styles.beatRead}>
                    <span className={styles.beatTitle}>
                      {beatIndex + 1}. {beat.title || EMPTY_FIELD_TEXT}
                      {who ? `（${who}）` : ''}
                    </span>
                    <span className={styles.readText}>{beat.event}</span>
                  </span>
                );
              })
            ) : (
              <span className={styles.readText}>{EMPTY_FIELD_TEXT}</span>
            )}
            {selected ? <span className={styles.selectedHint}>{VOLUME_SELECTED_HINT}</span> : null}
          </span>
        </button>
        <span className={styles.extra}>
          {onDelete ? (
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
      </div>
    </Card>
  );
}
