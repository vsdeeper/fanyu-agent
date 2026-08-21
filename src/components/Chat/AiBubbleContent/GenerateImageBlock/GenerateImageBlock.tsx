'use client';

import { Image, Skeleton } from 'antd';
import AiImage, {
  AI_IMAGE_FAILED_CLASS_NAMES,
  AI_IMAGE_PREVIEW_GROUP_CLASS_NAMES,
  FALLBACK_ICON_SRC,
} from '../AiImage';
import type { MessagePart } from '../utils';
import styles from './GenerateImageBlock.module.css';
import {
  type GenerateImageOutput,
  getImageSrc,
  isGenerateImageFailed,
  isGenerateImagePending,
  isGenerateImageReady,
  isGenerateImageSourceMissing,
} from './utils';

function GenerateImageItem({ part }: { part: MessagePart }) {
  const state = typeof part.state === 'string' ? part.state : '';
  const output = part.output as GenerateImageOutput | undefined;

  if (isGenerateImageSourceMissing(output)) {
    return null;
  }

  if (isGenerateImageFailed(state, output)) {
    return (
      <AiImage
        src="error"
        size={120}
        fallback={FALLBACK_ICON_SRC}
        alt="图片生成失败"
        preview={false}
        classNames={AI_IMAGE_FAILED_CLASS_NAMES}
      />
    );
  }

  if (output && isGenerateImageReady(output)) {
    return <AiImage src={getImageSrc(output)} size={120} alt="生成的图片" />;
  }

  if (isGenerateImagePending(state)) {
    return <Skeleton.Image active style={{ width: 120, height: 120, borderRadius: 8 }} />;
  }

  return null;
}

export type GenerateImageBlockProps = {
  parts: ReadonlyArray<MessagePart>;
};

export default function GenerateImageBlock({ parts }: GenerateImageBlockProps) {
  const visibleParts = parts.filter((part) => {
    const output = part.output as GenerateImageOutput | undefined;
    return !isGenerateImageSourceMissing(output);
  });
  if (visibleParts.length === 0) return null;

  return (
    <div className={styles.list}>
      <Image.PreviewGroup classNames={AI_IMAGE_PREVIEW_GROUP_CLASS_NAMES}>
        {visibleParts.map((part, index) => (
          <GenerateImageItem key={`generate-image-${index}`} part={part} />
        ))}
      </Image.PreviewGroup>
    </div>
  );
}
