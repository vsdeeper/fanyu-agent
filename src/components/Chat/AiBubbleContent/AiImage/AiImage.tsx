'use client';

import { Image, Skeleton } from 'antd';
import type { ImageProps } from 'antd';
import { AI_IMAGE_CLASS_NAMES, FALLBACK_ICON_SRC } from './constants';

export type AiImageProps = ImageProps & {
  size?: number;
};

export default function AiImage({
  preview,
  placeholder,
  size = 120,
  alt = '',
  classNames,
  styles: imageStyles,
  ...rest
}: AiImageProps) {
  return (
    <Image
      classNames={{ ...AI_IMAGE_CLASS_NAMES, ...classNames }}
      width={size}
      height={size}
      alt={alt}
      preview={preview ?? { mask: '预览' }}
      placeholder={placeholder ?? <Skeleton.Image active style={{ width: size, height: size }} />}
      fallback={FALLBACK_ICON_SRC}
      styles={imageStyles}
      {...rest}
    />
  );
}
