import type { CustomIconStyleProps, SvgIconDefinition } from './types';

/**
 * 将一份 SVG 定义绑定成只收 style 的图标组件，便于直接作为 Button `icon` 或 MODE_ICON 条目。
 * 尺寸走 `style.fontSize`（svg 为 1em），颜色走 `currentColor`。
 */
export function createCustomIcon({ viewBox, paths }: SvgIconDefinition) {
  function BoundIcon({ style, className }: CustomIconStyleProps) {
    return (
      <span
        role="img"
        aria-hidden
        className={className}
        style={{ display: 'inline-flex', lineHeight: 0, ...style }}
      >
        <svg viewBox={viewBox} width="1em" height="1em" fill="currentColor" aria-hidden>
          {paths.map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
      </span>
    );
  }
  return BoundIcon;
}
