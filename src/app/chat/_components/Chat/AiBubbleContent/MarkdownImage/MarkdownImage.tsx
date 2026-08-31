import { type ComponentProps } from '@ant-design/x-markdown';
import Skeleton from 'antd/es/skeleton';
import ChatImage from '../../ChatImage';
import styles from './MarkdownImage.module.css';

export default function MarkdownImage(props: ComponentProps) {
  const src = typeof props.src === 'string' ? props.src : undefined;
  const alt = typeof props.alt === 'string' ? props.alt : '';

  if (!src) return null;

  return (
    <ChatImage
      size={80}
      src={src}
      alt={alt}
      styles={{ root: { margin: '4px 0', verticalAlign: 'middle' } }}
    />
  );
}

export function IncompleteImage() {
  return <Skeleton.Image active classNames={{ root: styles.skeleton }} />;
}

export const markdownComponents = {
  img: MarkdownImage,
  'incomplete-image': IncompleteImage,
};
