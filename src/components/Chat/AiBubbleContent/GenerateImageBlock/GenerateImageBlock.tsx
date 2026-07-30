'use client';

import { Image, Skeleton } from 'antd';
import type { MessagePart } from '../utils';
import styles from './GenerateImageBlock.module.css';
import {
  type GenerateImageOutput,
  getImageSrc,
  isGenerateImageFailed,
  isGenerateImagePending,
  isGenerateImageReady,
} from './utils';

function GenerateImageItem({ part }: { part: MessagePart }) {
  const state = typeof part.state === 'string' ? part.state : '';
  const output = part.output as GenerateImageOutput | undefined;

  if (isGenerateImageFailed(state, output)) {
    return <Image classNames={{ root: styles.image }} src="" alt="图片生成失败" preview={false} />;
  }

  if (output && isGenerateImageReady(output)) {
    return (
      <Image
        classNames={{ root: styles.image }}
        src={getImageSrc(output)}
        alt="生成的图片"
        preview={{ mask: '预览' }}
      />
    );
  }

  if (isGenerateImagePending(state)) {
    return <Skeleton.Image active classNames={{ root: styles.image }} />;
  }

  return null;
}

export type GenerateImageBlockProps = {
  parts: ReadonlyArray<MessagePart>;
};

export default function GenerateImageBlock({ parts }: GenerateImageBlockProps) {
  return (
    <div className={styles.list}>
      <Image.PreviewGroup>
        {parts.map((part, index) => (
          <GenerateImageItem key={`generate-image-${index}`} part={part} />
        ))}
      </Image.PreviewGroup>
    </div>
  );
}
