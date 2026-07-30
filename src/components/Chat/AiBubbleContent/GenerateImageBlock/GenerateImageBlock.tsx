'use client';

import { Image, Skeleton } from 'antd';
import styles from '../AiBubbleContent.module.css';
import type { GenerateImageOutput, MessagePart } from '../utils';

function GenerateImageItem({ part }: { part: MessagePart }) {
  const state = typeof part.state === 'string' ? part.state : '';
  const output = part.output as GenerateImageOutput | undefined;

  if (state === 'output-error' || output?.ok === false) {
    return (
      <Image
        classNames={{ root: styles.generateImage }}
        src=""
        alt="图片生成失败"
        preview={false}
      />
    );
  }

  if (output?.ok === true && output.assetId) {
    const src = output.url || `/api/images/${output.assetId}`;
    return (
      <Image
        classNames={{ root: styles.generateImage }}
        src={src}
        alt="生成的图片"
        preview={{ mask: '预览' }}
      />
    );
  }

  if (
    state === 'input-streaming' ||
    state === 'input-available' ||
    state === 'approval-requested'
  ) {
    return <Skeleton.Image active classNames={{ root: styles.generateImage }} />;
  }

  return null;
}

export type GenerateImageBlockProps = {
  parts: ReadonlyArray<MessagePart>;
};

export default function GenerateImageBlock({ parts }: GenerateImageBlockProps) {
  return (
    <div className={styles.generateImageList}>
      <Image.PreviewGroup>
        {parts.map((part, index) => (
          <GenerateImageItem key={`generate-image-${index}`} part={part} />
        ))}
      </Image.PreviewGroup>
    </div>
  );
}
