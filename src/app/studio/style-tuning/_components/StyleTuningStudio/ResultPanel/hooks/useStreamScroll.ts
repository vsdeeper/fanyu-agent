import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { STREAM_SCROLL_NEAR_BOTTOM_PX } from '../constants';
import { reconcileStreamScrollPin, scrollStreamToBottom } from '../utils';

type FollowState = {
  pinned: boolean;
  programmatic: boolean;
  lastHeight: number;
};

/**
 * 流式 Markdown 增高时贴底跟随；用户上滑后暂停，再次贴底则恢复。
 */
export function useStreamScroll(enabled: boolean, streaming: boolean, content: string) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<FollowState>({
    pinned: true,
    programmatic: false,
    lastHeight: 0,
  });

  const followNow = useCallback(() => {
    const el = scrollRef.current;
    const state = stateRef.current;
    if (!el || !state.pinned) return;
    state.programmatic = true;
    scrollStreamToBottom(el);
    state.lastHeight = el.scrollHeight;
    requestAnimationFrame(() => {
      const current = scrollRef.current;
      if (current && state.pinned) {
        scrollStreamToBottom(current);
        state.lastHeight = current.scrollHeight;
      }
      requestAnimationFrame(() => {
        state.programmatic = false;
      });
    });
  }, []);

  useLayoutEffect(() => {
    if (streaming) stateRef.current.pinned = true;
  }, [streaming]);

  useLayoutEffect(() => {
    if (!enabled) return;
    followNow();
  }, [content, enabled, followNow, streaming]);

  useEffect(() => {
    if (!enabled) return;
    const root = scrollRef.current;
    const contentEl = contentRef.current;
    if (!root || !contentEl) return;

    const onGrow = () => followNow();
    const resizeObserver = new ResizeObserver(onGrow);
    resizeObserver.observe(contentEl);
    resizeObserver.observe(root);

    const mutationObserver = new MutationObserver(onGrow);
    mutationObserver.observe(contentEl, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [enabled, followNow]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const state = stateRef.current;
    const next = reconcileStreamScrollPin(
      el,
      state.programmatic,
      state.pinned,
      state.lastHeight,
      STREAM_SCROLL_NEAR_BOTTOM_PX,
    );
    state.pinned = next.pinned;
    state.lastHeight = next.lastHeight;
    if (next.follow) followNow();
  }, [followNow]);

  return { scrollRef, contentRef, onScroll };
}
