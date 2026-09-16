/** 结果滚动区是否贴底。 */
export function isStreamNearBottom(el: HTMLElement, threshold: number): boolean {
  return el.scrollHeight - el.clientHeight - el.scrollTop <= threshold;
}

/** 将结果滚动区对齐到内容底部。 */
export function scrollStreamToBottom(el: HTMLElement): void {
  el.scrollTop = el.scrollHeight;
}

export type StreamScrollPinState = {
  pinned: boolean;
  lastHeight: number;
  follow: boolean;
};

/**
 * 根据一次 scroll 事件更新贴底状态。
 * 正文变高也会触发 scroll，不能当成用户上滑，否则会关掉跟随。
 */
export function reconcileStreamScrollPin(
  el: HTMLElement,
  programmatic: boolean,
  pinned: boolean,
  lastHeight: number,
  threshold: number,
): StreamScrollPinState {
  const height = el.scrollHeight;
  if (programmatic) {
    return { pinned, lastHeight: height, follow: false };
  }
  if (height > lastHeight) {
    return { pinned, lastHeight: height, follow: pinned };
  }
  return {
    pinned: isStreamNearBottom(el, threshold),
    lastHeight: height,
    follow: false,
  };
}
