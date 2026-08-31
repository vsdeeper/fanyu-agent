import 'client-only';

import { useAuxiliaryPanelStore } from './store';
import type { SourceListItem } from './types';
import { isSourceListOpenFor } from './utils';

/**
 * 打开右侧来源概要；若已展开同一条消息的来源则关闭。
 */
export function toggleSourceListPanel(
  messageId: string,
  items: ReadonlyArray<SourceListItem>,
): void {
  const { open, content, openPanel, closePanel } = useAuxiliaryPanelStore.getState();
  if (isSourceListOpenFor(messageId, content, open)) {
    closePanel();
    return;
  }
  openPanel({ type: 'source-list', messageId, items: [...items] });
}
