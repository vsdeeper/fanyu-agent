import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

const NEAR_BOTTOM_PX = 48;

type FollowState = {
  pinned: boolean;
  programmatic: boolean;
  lastHeight: number;
};

function scrollToBottom(el: HTMLElement) {
  el.scrollTop = el.scrollHeight;
}

/**
 * 规划 Markdown 增高时贴底跟随。
 * XMarkdown 在 effect 里才把正文写进 DOM，高度晚于文本，不能把这次 scroll 当成用户上滑。
 */
export function usePlanStreamScroll(enabled: boolean, streaming: boolean, content: string) {
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
    scrollToBottom(el);
    state.lastHeight = el.scrollHeight;
    requestAnimationFrame(() => {
      const current = scrollRef.current;
      if (current && state.pinned) {
        scrollToBottom(current);
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
    const height = el.scrollHeight;
    if (state.programmatic) {
      state.lastHeight = height;
      return;
    }
    if (height > state.lastHeight) {
      state.lastHeight = height;
      if (state.pinned) followNow();
      return;
    }
    state.pinned = height - el.clientHeight - el.scrollTop <= NEAR_BOTTOM_PX;
    state.lastHeight = height;
  }, [followNow]);

  return { scrollRef, contentRef, onScroll };
}
