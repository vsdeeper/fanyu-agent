import 'client-only';

import { create } from 'zustand';
import type { AuxiliaryPanelContent } from './types';

export type AuxiliaryPanelStore = {
  /** 是否展开；关闭时仍保留 content 供滑出动画使用 */
  open: boolean;
  content: AuxiliaryPanelContent | null;
  /** 每次 openPanel 递增，作 FilePreview remount key，避免用 data URL */
  previewNonce: number;
  openPanel: (content: AuxiliaryPanelContent) => void;
  closePanel: () => void;
  clearContent: () => void;
};

export const useAuxiliaryPanelStore = create<AuxiliaryPanelStore>((set) => ({
  open: false,
  content: null,
  previewNonce: 0,
  openPanel: (content) =>
    set((state) => ({ open: true, content, previewNonce: state.previewNonce + 1 })),
  closePanel: () => set({ open: false }),
  clearContent: () => set({ content: null }),
}));
