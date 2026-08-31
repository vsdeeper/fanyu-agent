import type { SourceListItem } from '@/app/chat/_components/AuxiliaryPanel/types';
import { SOURCE_BAR_PREVIEW_COUNT } from './constants';

/** 来源条上叠放的前若干条 */
export function getPreviewSources(items: ReadonlyArray<SourceListItem>): SourceListItem[] {
  return items.slice(0, SOURCE_BAR_PREVIEW_COUNT);
}
