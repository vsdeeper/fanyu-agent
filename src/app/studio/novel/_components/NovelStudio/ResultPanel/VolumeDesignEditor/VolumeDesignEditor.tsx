import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useState } from 'react';
import { ADD_VOLUME_BUTTON, VOLUMES_TITLE } from '../../constants';
import type { NovelCharacter, NovelVolumeDesign } from '../../types';
import VolumeCard from './VolumeCard';
import styles from './VolumeDesignEditor.module.css';
import { createPendingVolume, shortVolumeId } from './utils';

type VolumeDesignEditorProps = {
  volumes: NovelVolumeDesign[];
  characters: NovelCharacter[];
  selectedVolumeId?: string;
  onSelectVolume: (volumeId: string) => void;
  onChange: (next: NovelVolumeDesign[]) => void;
};

/** 卷纲设计：按叙事卷列出卷纲，点选一卷决定卷章与写作做哪一卷。 */
export default function VolumeDesignEditor({
  volumes,
  characters,
  selectedVolumeId,
  onSelectVolume,
  onChange,
}: VolumeDesignEditorProps) {
  const [pendingId, setPendingId] = useState<string>();

  function saveVolume(next: NovelVolumeDesign) {
    onChange(volumes.map((volume) => (volume.id === next.id ? next : volume)));
  }

  function removeVolume(volumeId: string) {
    onChange(volumes.filter((volume) => volume.id !== volumeId));
  }

  function addVolume() {
    if (pendingId) return;
    setPendingId(shortVolumeId('vol'));
  }

  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>{VOLUMES_TITLE}</p>
      <div className={styles.list}>
        {volumes.map((volume, index) => (
          <VolumeCard
            key={volume.id}
            volume={volume}
            index={index}
            characters={characters}
            selected={volume.id === selectedVolumeId}
            onSelect={() => onSelectVolume(volume.id)}
            onSave={saveVolume}
            onDelete={() => removeVolume(volume.id)}
          />
        ))}
        {pendingId ? (
          <VolumeCard
            key={pendingId}
            volume={createPendingVolume(pendingId)}
            index={volumes.length}
            characters={characters}
            selected={false}
            pending
            onSelect={() => undefined}
            onSave={(next) => {
              onChange([...volumes, next]);
              setPendingId(undefined);
            }}
            onCancelPending={() => setPendingId(undefined)}
          />
        ) : null}
      </div>
      <Button
        color="primary"
        variant="dashed"
        icon={<PlusOutlined />}
        disabled={Boolean(pendingId)}
        onClick={addVolume}
      >
        {ADD_VOLUME_BUTTON}
      </Button>
    </div>
  );
}
