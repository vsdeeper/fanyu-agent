import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { PLAN_SCROLL_NEAR_BOTTOM_PX } from './constants';
import { reconcilePlanScrollPin, scrollPlanToBottom } from './utils';

type FollowState = {
  pinned: boolean;
  programmatic: boolean;
  lastHeight: number;
};

/**
 * 规划 Markdown 流式增高时贴底跟随。
 * XMarkdown 在自身 useEffect 里才把正文写进 DOM，高度晚于 analysisText；
 * 必须观察内容尺寸/子树，且不能把「正文变高触发的 scroll」当成用户上滑。
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
    scrollPlanToBottom(el);
    state.lastHeight = el.scrollHeight;
    requestAnimationFrame(() => {
      const current = scrollRef.current;
      if (current && state.pinned) {
        scrollPlanToBottom(current);
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
    const next = reconcilePlanScrollPin(
      el,
      state.programmatic,
      state.pinned,
      state.lastHeight,
      PLAN_SCROLL_NEAR_BOTTOM_PX,
    );
    state.pinned = next.pinned;
    state.lastHeight = next.lastHeight;
    if (next.follow) followNow();
  }, [followNow]);

  return { scrollRef, contentRef, onScroll };
}
