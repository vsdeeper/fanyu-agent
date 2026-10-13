import {
  NOVEL_THREAD_COUNT_MAX,
  NOVEL_THREAD_COUNT_MIN,
} from '@/app/api/studio/novel/_shared/constants';
import { Button, Card, Input, InputNumber, Popconfirm } from 'antd';
import {
  ADD_THREAD_BUTTON,
  ADD_VOLUME_BUTTON,
  CONFIRM_CANCEL,
  DELETE_BUTTON,
  THREAD_ADVANCE_LABEL,
  THREAD_CORE_LABEL,
  THREAD_DELETE_CONFIRM_TITLE,
  THREAD_NAME_LABEL,
  THREADS_TITLE,
  VOLUME_CONFLICT_LABEL,
  VOLUME_DELETE_CONFIRM_TITLE,
  VOLUME_GEOGRAPHY_LABEL,
  VOLUME_OUTCOME_LABEL,
  VOLUME_TARGET_CHARS_LABEL,
  VOLUME_TITLE_PLACEHOLDER,
  VOLUMES_TITLE,
} from '../../constants';
import type { NovelPlan, NovelThread, NovelVolumeOutline } from '../../types';
import styles from '../VolumeList/VolumeList.module.css';

type PlanEditorProps = {
  plan: NovelPlan;
  onChange: (next: NovelPlan) => void;
};

/** 创作方案：主线与分卷都可直接改。 */
export default function PlanEditor({ plan, onChange }: PlanEditorProps) {
  function updateThread(threadId: string, patch: Partial<NovelThread>) {
    onChange({
      ...plan,
      threads: plan.threads.map((thread) =>
        thread.id === threadId ? { ...thread, ...patch } : thread,
      ),
    });
  }

  function updateAdvance(threadId: string, volumeId: string, text: string) {
    onChange({
      ...plan,
      threads: plan.threads.map((thread) => {
        if (thread.id !== threadId) return thread;
        const exists = thread.advances.some((advance) => advance.volumeId === volumeId);
        const advances = exists
          ? thread.advances.map((advance) =>
              advance.volumeId === volumeId ? { ...advance, text } : advance,
            )
          : [...thread.advances, { volumeId, text }];
        return { ...thread, advances };
      }),
    });
  }

  function removeThread(threadId: string) {
    if (plan.threads.length <= NOVEL_THREAD_COUNT_MIN) return;
    onChange({ ...plan, threads: plan.threads.filter((thread) => thread.id !== threadId) });
  }

  function addThread() {
    if (plan.threads.length >= NOVEL_THREAD_COUNT_MAX) return;
    const id = `thread-${crypto.randomUUID().slice(0, 8)}`;
    onChange({
      ...plan,
      threads: [
        ...plan.threads,
        {
          id,
          name: '',
          core: '',
          advances: plan.volumes.map((volume) => ({ volumeId: volume.id, text: '' })),
        },
      ],
    });
  }

  function updateVolume(volumeId: string, patch: Partial<NovelVolumeOutline>) {
    onChange({
      ...plan,
      volumes: plan.volumes.map((volume) =>
        volume.id === volumeId ? { ...volume, ...patch } : volume,
      ),
    });
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
    const id = `vol-${crypto.randomUUID().slice(0, 8)}`;
    onChange({
      threads: plan.threads.map((thread) => ({
        ...thread,
        advances: [...thread.advances, { volumeId: id, text: '' }],
      })),
      volumes: [
        ...plan.volumes,
        { id, title: '', geography: '', conflict: '', outcome: '', targetChars: 200000 },
      ],
    });
  }

  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>{THREADS_TITLE}</p>
      <div className={styles.list}>
        {plan.threads.map((thread, index) => (
          <Card key={thread.id} size="small" className={styles.volumeCard}>
            <div className={styles.editStack}>
              <div className={styles.titleEditRow}>
                <span className={styles.index}>{index + 1}</span>
                <Input
                  value={thread.name}
                  placeholder={THREAD_NAME_LABEL}
                  onChange={(event) => updateThread(thread.id, { name: event.target.value })}
                />
                {plan.threads.length > NOVEL_THREAD_COUNT_MIN ? (
                  <Popconfirm
                    title={THREAD_DELETE_CONFIRM_TITLE}
                    okText={DELETE_BUTTON}
                    cancelText={CONFIRM_CANCEL}
                    okButtonProps={{ danger: true }}
                    onConfirm={() => removeThread(thread.id)}
                  >
                    <Button type="text" danger size="small">
                      {DELETE_BUTTON}
                    </Button>
                  </Popconfirm>
                ) : null}
              </div>
              <Input.TextArea
                value={thread.core}
                placeholder={THREAD_CORE_LABEL}
                autoSize={{ minRows: 2, maxRows: 8 }}
                onChange={(event) => updateThread(thread.id, { core: event.target.value })}
              />
              {plan.volumes.map((volume) => {
                const advance = thread.advances.find((item) => item.volumeId === volume.id);
                return (
                  <Input.TextArea
                    key={volume.id}
                    value={advance?.text ?? ''}
                    placeholder={`${THREAD_ADVANCE_LABEL} · ${volume.title || volume.id}`}
                    autoSize={{ minRows: 2, maxRows: 6 }}
                    onChange={(event) => updateAdvance(thread.id, volume.id, event.target.value)}
                  />
                );
              })}
            </div>
          </Card>
        ))}
      </div>
      <Button
        color="primary"
        variant="dashed"
        disabled={plan.threads.length >= NOVEL_THREAD_COUNT_MAX}
        onClick={addThread}
      >
        {ADD_THREAD_BUTTON}
      </Button>

      <p className={styles.sectionTitle}>{VOLUMES_TITLE}</p>
      <div className={styles.list}>
        {plan.volumes.map((volume, index) => (
          <Card key={volume.id} size="small" className={styles.volumeCard}>
            <div className={styles.editStack}>
              <div className={styles.titleEditRow}>
                <span className={styles.index}>{index + 1}</span>
                <Input
                  value={volume.title}
                  placeholder={VOLUME_TITLE_PLACEHOLDER}
                  onChange={(event) => updateVolume(volume.id, { title: event.target.value })}
                />
                {plan.volumes.length > 1 ? (
                  <Popconfirm
                    title={VOLUME_DELETE_CONFIRM_TITLE}
                    okText={DELETE_BUTTON}
                    cancelText={CONFIRM_CANCEL}
                    okButtonProps={{ danger: true }}
                    onConfirm={() => removeVolume(volume.id)}
                  >
                    <Button type="text" danger size="small">
                      {DELETE_BUTTON}
                    </Button>
                  </Popconfirm>
                ) : null}
              </div>
              <Input
                value={volume.geography}
                placeholder={VOLUME_GEOGRAPHY_LABEL}
                onChange={(event) => updateVolume(volume.id, { geography: event.target.value })}
              />
              <Input.TextArea
                value={volume.conflict}
                placeholder={VOLUME_CONFLICT_LABEL}
                autoSize={{ minRows: 2, maxRows: 6 }}
                onChange={(event) => updateVolume(volume.id, { conflict: event.target.value })}
              />
              <Input.TextArea
                value={volume.outcome ?? ''}
                placeholder={VOLUME_OUTCOME_LABEL}
                autoSize={{ minRows: 2, maxRows: 6 }}
                onChange={(event) => updateVolume(volume.id, { outcome: event.target.value })}
              />
              <InputNumber
                min={2000}
                step={10000}
                value={volume.targetChars}
                placeholder={VOLUME_TARGET_CHARS_LABEL}
                addonAfter="字"
                onChange={(value) => {
                  if (typeof value === 'number' && value > 0)
                    updateVolume(volume.id, { targetChars: value });
                }}
              />
            </div>
          </Card>
        ))}
      </div>
      <Button color="primary" variant="dashed" onClick={addVolume}>
        {ADD_VOLUME_BUTTON}
      </Button>
    </div>
  );
}
