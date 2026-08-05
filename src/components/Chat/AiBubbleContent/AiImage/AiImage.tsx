'use client';

import { Image, Skeleton } from 'antd';
import type { ImageProps } from 'antd';
import styles from './AiImage.module.css';

interface AiImageProps extends ImageProps {
  size?: number;
}

export default function AiImage({
  preview,
  placeholder,
  size = 120,
  alt = '',
  ...rest
}: AiImageProps) {
  return (
    <Image
      classNames={{ root: styles.image }}
      width={size}
      height={size}
      alt={alt}
      preview={preview ?? { mask: '预览' }}
      placeholder={placeholder ?? <Skeleton.Image active style={{ width: size, height: size }} />}
      {...rest}
    />
  );
}
