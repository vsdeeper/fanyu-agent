import { type ComponentProps } from '@ant-design/x-markdown';
import { isAllowedPreviewImageSrc } from '../file-preview';
import MarkdownImage, { IncompleteImage } from '../../Chat/AiBubbleContent/MarkdownImage';

/**
 * 预览面板 Markdown 图：仅同源 /api/images/:id 才渲染。
 */
export default function PreviewImage(props: ComponentProps) {
  const src = typeof props.src === 'string' ? props.src : undefined;
  if (!src || !isAllowedPreviewImageSrc(src)) return null;
  return <MarkdownImage {...props} />;
}

export const previewMarkdownComponents = {
  img: PreviewImage,
  'incomplete-image': IncompleteImage,
};
