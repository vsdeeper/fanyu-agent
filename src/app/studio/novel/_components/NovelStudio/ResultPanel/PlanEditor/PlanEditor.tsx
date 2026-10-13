import { useState } from 'react';
import {
  NOVEL_THREAD_COUNT_MAX,
  NOVEL_THREAD_COUNT_MIN,
} from '@/app/api/studio/novel/_shared/constants';
import { Button } from 'antd';
import {
  ADD_THREAD_BUTTON,
  ADD_VOLUME_BUTTON,
  THREADS_TITLE,
  VOLUMES_TITLE,
} from '../../constants';
import type { NovelPlan, NovelThread, NovelVolumeOutline } from '../../types';
import ThreadCard from './ThreadCard';
import VolumeCard from './VolumeCard';
import { DEFAULT_VOLUME_TARGET_CHARS } from './VolumeCard/utils';
import styles from './PlanEditor.module.css';

type PlanEditorProps = {
  plan: NovelPlan;
  onChange: (next: NovelPlan) => void;
};

/** 创作方案：主线与分卷默认只读，点编辑后取消或保存。 */
export default function PlanEditor({ plan, onChange }: PlanEditorProps) {
  const [pendingThread, setPendingThread] = useState<NovelThread>();
  const [pendingVolume, setPendingVolume] = useState<NovelVolumeOutline>();
  const threadCount = plan.threads.length + (pendingThread ? 1 : 0);

  function saveThread(next: NovelThread) {
    onChange({
      ...plan,
      threads: plan.threads.map((thread) => (thread.id === next.id ? next : thread)),
    });
  }

  function commitPendingThread(next: NovelThread) {
    if (plan.threads.length >= NOVEL_THREAD_COUNT_MAX) return;
    onChange({ ...plan, threads: [...plan.threads, next] });
    setPendingThread(undefined);
  }

  function removeThread(threadId: string) {
    if (plan.threads.length <= NOVEL_THREAD_COUNT_MIN) return;
    onChange({ ...plan, threads: plan.threads.filter((thread) => thread.id !== threadId) });
  }

  function addThread() {
    if (pendingThread || plan.threads.length >= NOVEL_THREAD_COUNT_MAX) return;
    const id = `thread-${crypto.randomUUID().slice(0, 8)}`;
    setPendingThread({
      id,
      name: '',
      core: '',
      advances: plan.volumes.map((volume) => ({ volumeId: volume.id, text: '' })),
    });
  }

  function saveVolume(next: NovelVolumeOutline) {
    onChange({
      ...plan,
      volumes: plan.volumes.map((volume) => (volume.id === next.id ? next : volume)),
    });
  }

  function commitPendingVolume(next: NovelVolumeOutline) {
    onChange({
      threads: plan.threads.map((thread) => ({
        ...thread,
        advances: [...thread.advances, { volumeId: next.id, text: '' }],
      })),
      volumes: [...plan.volumes, next],
    });
    setPendingVolume(undefined);
  }

  function removeVolume(volumeId: string) {
    if (plan.volumes.length <= 1) return;
    onChange({
      threads: plan.threads.map((thread) => ({
        ...thread,
        advances: thread.advances.filter((advance) => advance.volumeId !== volumeId),
      })),
      volumes: plan.volumes.filter((volume) => volume.id !== volumeId),
    });
  }

  function addVolume() {
    if (pendingVolume) return;
    const id = `vol-${crypto.randomUUID().slice(0, 8)}`;
    setPendingVolume({
      id,
      title: '',
      geography: '',
      conflict: '',
      outcome: '',
      targetChars: DEFAULT_VOLUME_TARGET_CHARS,
    });
  }

  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>{THREADS_TITLE}</p>
      <div className={styles.list}>
        {plan.threads.map((thread, index) => (
          <ThreadCard
            key={thread.id}
            thread={thread}
            index={index}
            volumes={plan.volumes}
            removable={plan.threads.length > NOVEL_THREAD_COUNT_MIN}
            onSave={saveThread}
            onDelete={() => removeThread(thread.id)}
          />
        ))}
        {pendingThread ? (
          <ThreadCard
            key={pendingThread.id}
            thread={pendingThread}
            index={plan.threads.length}
            volumes={plan.volumes}
            removable={false}
            pending
            onSave={commitPendingThread}
            onCancelPending={() => setPendingThread(undefined)}
          />
        ) : null}
      </div>
      <Button
        color="primary"
        variant="dashed"
        disabled={threadCount >= NOVEL_THREAD_COUNT_MAX}
        onClick={addThread}
      >
        {ADD_THREAD_BUTTON}
      </Button>

      <p className={styles.sectionTitle}>{VOLUMES_TITLE}</p>
      <div className={styles.list}>
        {plan.volumes.map((volume, index) => (
          <VolumeCard
            key={volume.id}
            volume={volume}
            index={index}
            removable={plan.volumes.length > 1}
            onSave={saveVolume}
            onDelete={() => removeVolume(volume.id)}
          />
        ))}
        {pendingVolume ? (
          <VolumeCard
            key={pendingVolume.id}
            volume={pendingVolume}
            index={plan.volumes.length}
            removable={false}
            pending
            onSave={commitPendingVolume}
            onCancelPending={() => setPendingVolume(undefined)}
          />
        ) : null}
      </div>
      <Button
        color="primary"
        variant="dashed"
        disabled={Boolean(pendingVolume)}
        onClick={addVolume}
      >
        {ADD_VOLUME_BUTTON}
      </Button>
    </div>
  );
}
