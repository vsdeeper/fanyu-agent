import { useState } from 'react';
import {
  NOVEL_THREAD_COUNT_MAX,
  NOVEL_THREAD_COUNT_MIN,
} from '@/app/api/studio/novel/_shared/constants';
import { Button } from 'antd';
import {
  ADD_ASSET_GROUP_BUTTON,
  ADD_ORDER_BUTTON,
  ADD_THREAD_BUTTON,
  ADD_VOLUME_BUTTON,
  ASSETS_TITLE,
  ENDING_LABEL,
  HIDDEN_TRUTH_LABEL,
  ORDERS_TITLE,
  PLAN_VOLUMES_TITLE,
  THEME_LABEL,
  THREADS_TITLE,
  WORLDVIEW_TITLE,
} from '../../constants';
import type {
  NovelPlan,
  NovelThread,
  NovelVolumeOutline,
  NovelWorldAssetGroup,
  NovelWorldOrder,
} from '../../types';
import AssetGroupCard from './AssetGroupCard';
import OrderCard from './OrderCard';
import PlanTextCard from './PlanTextCard';
import ThreadCard from './ThreadCard';
import VolumeCard from './VolumeCard';
import { DEFAULT_VOLUME_TARGET_CHARS } from './VolumeCard/utils';
import { shortPlanId } from './utils';
import styles from './PlanEditor.module.css';

type PlanEditorProps = {
  plan: NovelPlan;
  onChange: (next: NovelPlan) => void;
};

/** 创作方案：世界观、主线与分卷默认只读，点编辑后取消或保存。 */
export default function PlanEditor({ plan, onChange }: PlanEditorProps) {
  const [pendingOrder, setPendingOrder] = useState<NovelWorldOrder>();
  const [pendingAsset, setPendingAsset] = useState<NovelWorldAssetGroup>();
  const [pendingThread, setPendingThread] = useState<NovelThread>();
  const [pendingVolume, setPendingVolume] = useState<NovelVolumeOutline>();
  const threadCount = plan.threads.length + (pendingThread ? 1 : 0);

  function patchWorldview(patch: Partial<NovelPlan['worldview']>) {
    onChange({ ...plan, worldview: { ...plan.worldview, ...patch } });
  }

  function saveOrder(next: NovelWorldOrder) {
    patchWorldview({
      orders: plan.worldview.orders.map((order) => (order.id === next.id ? next : order)),
    });
  }

  function commitPendingOrder(next: NovelWorldOrder) {
    patchWorldview({ orders: [...plan.worldview.orders, next] });
    setPendingOrder(undefined);
  }

  function removeOrder(orderId: string) {
    patchWorldview({ orders: plan.worldview.orders.filter((order) => order.id !== orderId) });
  }

  function addOrder() {
    if (pendingOrder) return;
    setPendingOrder({
      id: shortPlanId('order'),
      name: '',
      question: '',
      entries: [{ id: shortPlanId('entry'), name: '', rule: '' }],
    });
  }

  function saveAsset(next: NovelWorldAssetGroup) {
    patchWorldview({
      assets: plan.worldview.assets.map((group) => (group.id === next.id ? next : group)),
    });
  }

  function commitPendingAsset(next: NovelWorldAssetGroup) {
    patchWorldview({ assets: [...plan.worldview.assets, next] });
    setPendingAsset(undefined);
  }

  function removeAsset(assetId: string) {
    patchWorldview({ assets: plan.worldview.assets.filter((group) => group.id !== assetId) });
  }

  function addAsset() {
    if (pendingAsset) return;
    setPendingAsset({ id: shortPlanId('asset'), category: '', items: [] });
  }

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
    setPendingThread({ id: shortPlanId('thread'), name: '', core: '' });
  }

  function saveVolume(next: NovelVolumeOutline) {
    onChange({
      ...plan,
      volumes: plan.volumes.map((volume) => (volume.id === next.id ? next : volume)),
    });
  }

  function commitPendingVolume(next: NovelVolumeOutline) {
    onChange({ ...plan, volumes: [...plan.volumes, next] });
    setPendingVolume(undefined);
  }

  function removeVolume(volumeId: string) {
    if (plan.volumes.length <= 1) return;
    onChange({ ...plan, volumes: plan.volumes.filter((volume) => volume.id !== volumeId) });
  }

  function addVolume() {
    if (pendingVolume) return;
    setPendingVolume({
      id: shortPlanId('vol'),
      title: '',
      geography: '',
      conflict: '',
      relations: '',
      assets: [],
      hook: '',
      targetChars: DEFAULT_VOLUME_TARGET_CHARS,
    });
  }

  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>{WORLDVIEW_TITLE}</p>
      <p className={styles.subsectionTitle}>{ORDERS_TITLE}</p>
      <div className={styles.list}>
        {plan.worldview.orders.map((order, index) => (
          <OrderCard
            key={order.id}
            order={order}
            index={index}
            removable
            onSave={saveOrder}
            onDelete={() => removeOrder(order.id)}
          />
        ))}
        {pendingOrder ? (
          <OrderCard
            key={pendingOrder.id}
            order={pendingOrder}
            index={plan.worldview.orders.length}
            removable={false}
            pending
            onSave={commitPendingOrder}
            onCancelPending={() => setPendingOrder(undefined)}
          />
        ) : null}
      </div>
      <Button color="primary" variant="dashed" disabled={Boolean(pendingOrder)} onClick={addOrder}>
        {ADD_ORDER_BUTTON}
      </Button>

      <PlanTextCard
        title={HIDDEN_TRUTH_LABEL}
        value={plan.worldview.hiddenTruth}
        onSave={(hiddenTruth) => patchWorldview({ hiddenTruth })}
      />

      <p className={styles.subsectionTitle}>{ASSETS_TITLE}</p>
      <div className={styles.list}>
        {plan.worldview.assets.map((group, index) => (
          <AssetGroupCard
            key={group.id}
            group={group}
            index={index}
            onSave={saveAsset}
            onDelete={() => removeAsset(group.id)}
          />
        ))}
        {pendingAsset ? (
          <AssetGroupCard
            key={pendingAsset.id}
            group={pendingAsset}
            index={plan.worldview.assets.length}
            pending
            onSave={commitPendingAsset}
            onCancelPending={() => setPendingAsset(undefined)}
          />
        ) : null}
      </div>
      <Button color="primary" variant="dashed" disabled={Boolean(pendingAsset)} onClick={addAsset}>
        {ADD_ASSET_GROUP_BUTTON}
      </Button>

      <p className={styles.sectionTitle}>{THREADS_TITLE}</p>
      <div className={styles.list}>
        {plan.threads.map((thread, index) => (
          <ThreadCard
            key={thread.id}
            thread={thread}
            index={index}
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
      <PlanTextCard
        title={ENDING_LABEL}
        value={plan.ending}
        onSave={(ending) => onChange({ ...plan, ending })}
      />
      <PlanTextCard
        title={THEME_LABEL}
        value={plan.theme}
        onSave={(theme) => onChange({ ...plan, theme })}
      />

      <p className={styles.sectionTitle}>{PLAN_VOLUMES_TITLE}</p>
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
