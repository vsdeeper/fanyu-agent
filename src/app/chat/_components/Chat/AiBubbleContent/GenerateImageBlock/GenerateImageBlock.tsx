import { Image, Skeleton } from 'antd';
import ChatImage, {
  CHAT_IMAGE_FAILED_CLASS_NAMES,
  CHAT_IMAGE_PREVIEW_GROUP_CLASS_NAMES,
  FALLBACK_ICON_SRC,
} from '../../ChatImage';
import type { MessagePart } from '../utils';
import styles from './GenerateImageBlock.module.css';
import {
  type GenerateImageOutput,
  getImageAssets,
  getPreviewableImages,
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
      <ChatImage
        src={FALLBACK_ICON_SRC}
        size={60}
        alt="图片生成失败"
        preview={false}
        classNames={CHAT_IMAGE_FAILED_CLASS_NAMES}
      />
    );
  }

  if (output && isGenerateImageReady(output)) {
    const assets = getImageAssets(output);
    return (
      <>
        {assets.map((asset) => (
          <ChatImage
            key={asset.assetId || asset.url}
            src={asset.url || `/api/images/${asset.assetId}`}
            size={60}
            alt="生成的图片"
          />
        ))}
      </>
    );
  }

  if (isGenerateImagePending(state)) {
    return <Skeleton.Image active style={{ width: 60, height: 60, borderRadius: 8 }} />;
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

  // 预览图册顺序与缩略图行同源：避免 antd PreviewGroup 按图片注册（挂载）顺序生成预览序列，导致「N/M」序号错位
  const previewItems = getPreviewableImages(visibleParts);

  return (
    <div className={styles.list}>
      <Image.PreviewGroup items={previewItems} classNames={CHAT_IMAGE_PREVIEW_GROUP_CLASS_NAMES}>
        {visibleParts.map((part, index) => (
          <GenerateImageItem key={`generate-image-${index}`} part={part} />
        ))}
      </Image.PreviewGroup>
    </div>
  );
}
