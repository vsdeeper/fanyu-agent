import { Button } from 'antd';
import { toggleSourceListPanel } from '@/app/chat/_components/AuxiliaryPanel/open-source-list';
import { useAuxiliaryPanelStore } from '@/app/chat/_components/AuxiliaryPanel/store';
import type { SourceListItem } from '@/app/chat/_components/AuxiliaryPanel/types';
import {
  formatSourceListTitle,
  isSourceListOpenFor,
} from '@/app/chat/_components/AuxiliaryPanel/utils';
import SourceFavicon from '@/app/chat/_components/SourceFavicon';
import { SOURCE_BAR_ICON_SIZE } from './constants';
import { getPreviewSources } from './utils';
import styles from './SourceBar.module.css';

export type SourceBarProps = {
  messageId: string;
  items: ReadonlyArray<SourceListItem>;
};

/** 气泡底部紧凑来源条：前 3 个圆形 favicon +「N 个来源」，点击打开右侧概要 */
export default function SourceBar({ messageId, items }: SourceBarProps) {
  const open = useAuxiliaryPanelStore((s) => s.open);
  const content = useAuxiliaryPanelStore((s) => s.content);

  if (items.length === 0) return null;

  const preview = getPreviewSources(items);
  const countLabel = formatSourceListTitle(items.length);
  const expanded = isSourceListOpenFor(messageId, content, open);

  return (
    <Button
      className={styles.bar}
      shape="round"
      color="default"
      type="text"
      onClick={() => toggleSourceListPanel(messageId, items)}
      aria-label={`查看${countLabel}`}
      aria-expanded={expanded}
    >
      <span className={styles.icons}>
        {preview.map((item) => (
          <span key={item.key} className={styles.icon}>
            <SourceFavicon url={item.url} size={SOURCE_BAR_ICON_SIZE} circle />
          </span>
        ))}
      </span>
      <span className={styles.label}>{countLabel}</span>
    </Button>
  );
}
