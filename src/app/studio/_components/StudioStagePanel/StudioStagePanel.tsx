import type { ReactNode, Ref, UIEventHandler } from 'react';
import styles from './StudioStagePanel.module.css';

export type StudioStageVariant = 'scroll' | 'stream' | 'preview' | 'fill';

/** preview 内边距：手机框四边 24px，文章预览上下 24px、左右 16px。 */
export type StudioStagePreviewPadding = 'phone' | 'article';

type StudioStagePanelProps = {
  head: ReactNode;
  children: ReactNode;
  /** 底栏操作；不传则不渲染底栏 */
  footer?: ReactNode;
  /**
   * 内容区布局。scroll 内边距 20px；stream 为流式正文；
   * preview 居中并换底；fill 只撑满，由子节点自己布局。
   */
  variant?: StudioStageVariant;
  previewPadding?: StudioStagePreviewPadding;
  /** 流式贴底跟随时挂在内容区上 */
  scrollRef?: Ref<HTMLDivElement>;
  onScroll?: UIEventHandler<HTMLDivElement>;
};

/** 按变体取内容区 class。 */
function bodyClassName(
  variant: StudioStageVariant,
  previewPadding: StudioStagePreviewPadding,
): string {
  if (variant === 'stream') return styles.stream;
  if (variant === 'fill') return styles.fill;
  if (variant === 'preview') {
    const padding = previewPadding === 'article' ? styles.previewArticle : styles.previewPhone;
    return `${styles.preview} ${padding}`;
  }
  return styles.scroll;
}

/** 工作室右栏骨架：顶栏、内容区与可选底栏。 */
export default function StudioStagePanel({
  head,
  children,
  footer,
  variant = 'scroll',
  previewPadding = 'phone',
  scrollRef,
  onScroll,
}: StudioStagePanelProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.head}>{head}</div>
      <div ref={scrollRef} className={bodyClassName(variant, previewPadding)} onScroll={onScroll}>
        {children}
      </div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </section>
  );
}

/** 顶栏右侧操作区：靠右排列。 */
export const studioStageHeadActionsClassName = styles.headActions;
