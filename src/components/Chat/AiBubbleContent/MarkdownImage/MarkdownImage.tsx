'use client';

import { type ComponentProps } from '@ant-design/x-markdown';
import { Image, Skeleton } from 'antd';
import styles from '../AiBubbleContent.module.css';

export default function MarkdownImage(props: ComponentProps) {
  const src = typeof props.src === 'string' ? props.src : undefined;
  const alt = typeof props.alt === 'string' ? props.alt : '';

  if (!src) return null;

  return (
    <Image
      classNames={{ root: styles.markdownImage }}
      src={src}
      alt={alt}
      preview={{ mask: '预览' }}
    />
  );
}

export function IncompleteImage() {
  return <Skeleton.Image active classNames={{ root: styles.markdownImageSkeleton }} />;
}

export const markdownComponents = {
  img: MarkdownImage,
  'incomplete-image': IncompleteImage,
};
