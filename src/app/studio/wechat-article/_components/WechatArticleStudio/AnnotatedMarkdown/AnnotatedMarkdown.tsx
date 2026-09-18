import { Button, Image } from 'antd';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
// XMarkdown 主题变量覆写层（全局共用）；必须紧跟主题 CSS 之后引入保证覆盖，勿移入 global.css
import '@/lib/theme/XMarkdownTheme.css';
import { IMAGE_MARKER_LINE_RE } from '../constants';
import type { ImageSlot } from '../types';
import styles from './AnnotatedMarkdown.module.css';

type AnnotatedMarkdownProps = {
  markdown: string;
  markdownClassName: string;
  imageSlots?: ImageSlot[];
  activeLabel?: string;
  onMarkerClick?: (label: string) => void;
  /** 预览态：不显示【配图：xx】标注，无图槽位直接跳过。 */
  hideMarkerLabels?: boolean;
};

type Segment =
  | { type: 'md'; content: string }
  | { type: 'marker'; label: string };

/** 将正文按配图标注切开，标注渲染为可点击按钮或已出图预览。 */
export function splitAnnotatedMarkdown(markdown: string): Segment[] {
  const lines = markdown.split(/\r?\n/);
  const segments: Segment[] = [];
  let buffer: string[] = [];

  function flushMd() {
    if (buffer.length === 0) return;
    segments.push({ type: 'md', content: buffer.join('\n') });
    buffer = [];
  }

  for (const line of lines) {
    const match = IMAGE_MARKER_LINE_RE.exec(line.trim());
    if (match) {
      flushMd();
      segments.push({ type: 'marker', label: match[1]! });
    } else {
      buffer.push(line);
    }
  }
  flushMd();
  return segments;
}

/** 配图步 / 预览：Markdown 段 + 标注位（无图为按钮，有图为内联图，均可点击）。 */
export default function AnnotatedMarkdown({
  markdown,
  markdownClassName,
  imageSlots = [],
  activeLabel,
  onMarkerClick,
  hideMarkerLabels = false,
}: AnnotatedMarkdownProps) {
  const segments = splitAnnotatedMarkdown(markdown);
  const urlByLabel = new Map(
    imageSlots
      .filter((slot) => slot.assetUrl)
      .map((slot) => [slot.label, slot.assetUrl!] as const),
  );

  return (
    <div className={styles.root}>
      {segments.map((segment, index) => {
        if (segment.type === 'marker') {
          const active = activeLabel === segment.label;
          const assetUrl = urlByLabel.get(segment.label);
          const clickable = Boolean(onMarkerClick);

          if (assetUrl) {
            return (
              <div
                key={`marker-${segment.label}-${index}`}
                className={`${styles.figure} ${hideMarkerLabels ? styles.figurePlain : ''} ${active ? styles.figureActive : ''} ${clickable ? styles.figureClickable : ''}`}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => onMarkerClick?.(segment.label) : undefined}
                onKeyDown={
                  clickable
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onMarkerClick?.(segment.label);
                        }
                      }
                    : undefined
                }
              >
                {hideMarkerLabels ? null : (
                  <span className={styles.figureLabel}>【配图：{segment.label}】</span>
                )}
                <Image
                  src={assetUrl}
                  alt={segment.label}
                  className={styles.figureImage}
                  preview={clickable ? false : { mask: '预览' }}
                />
              </div>
            );
          }

          if (hideMarkerLabels) return null;

          return (
            <Button
              key={`marker-${segment.label}-${index}`}
              type={active ? 'primary' : 'default'}
              className={styles.marker}
              disabled={!clickable}
              onClick={clickable ? () => onMarkerClick?.(segment.label) : undefined}
            >
              【配图：{segment.label}】
            </Button>
          );
        }
        if (!segment.content.trim()) return null;
        return (
          <XMarkdown
            key={`md-${index}`}
            className={markdownClassName}
            content={segment.content}
            paragraphTag="div"
            openLinksInNewTab
            escapeRawHtml
          />
        );
      })}
    </div>
  );
}
