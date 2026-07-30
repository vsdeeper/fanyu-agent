'use client';

import { type ComponentProps } from '@ant-design/x-markdown';
import { Image, Skeleton } from 'antd';
import styles from './MarkdownImage.module.css';

export default function MarkdownImage(props: ComponentProps) {
  const src = typeof props.src === 'string' ? props.src : undefined;
  const alt = typeof props.alt === 'string' ? props.alt : '';

  if (!src) return null;

  return (
    <Image classNames={{ root: styles.image }} src={src} alt={alt} preview={{ mask: '预览' }} />
  );
}

export function IncompleteImage() {
  return <Skeleton.Image active classNames={{ root: styles.skeleton }} />;
}

export const markdownComponents = {
  img: MarkdownImage,
  'incomplete-image': IncompleteImage,
};
