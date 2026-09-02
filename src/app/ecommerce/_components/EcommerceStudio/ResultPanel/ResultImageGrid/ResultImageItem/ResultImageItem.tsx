import { Image, Skeleton } from 'antd';
import type { StudioResultImage } from '../../../types';
import { getImageSrc } from '../../utils';
import {
  FALLBACK_ICON_SRC,
  RESULT_IMAGE_CLASS_NAMES,
  RESULT_IMAGE_FAILED_CLASS_NAMES,
  RESULT_IMAGE_SIZE,
} from '../constants';

type ResultImageItemProps = {
  image: StudioResultImage;
};

/**
 * 单张出图：pending Skeleton、就绪预览、失败 fallback。
 */
export default function ResultImageItem({ image }: ResultImageItemProps) {
  if (image.status === 'failed') {
    return (
      <Image
        src={FALLBACK_ICON_SRC}
        width={RESULT_IMAGE_SIZE}
        height={RESULT_IMAGE_SIZE}
        alt="图片生成失败"
        preview={false}
        classNames={RESULT_IMAGE_FAILED_CLASS_NAMES}
        fallback={FALLBACK_ICON_SRC}
      />
    );
  }

  if (image.status === 'ready') {
    return (
      <Image
        src={getImageSrc(image)}
        width={RESULT_IMAGE_SIZE}
        height={RESULT_IMAGE_SIZE}
        alt="生成的图片"
        preview={{ mask: '预览' }}
        classNames={RESULT_IMAGE_CLASS_NAMES}
        placeholder={
          <Skeleton.Image active style={{ width: RESULT_IMAGE_SIZE, height: RESULT_IMAGE_SIZE }} />
        }
        fallback={FALLBACK_ICON_SRC}
      />
    );
  }

  return (
    <Skeleton.Image
      active
      style={{ width: RESULT_IMAGE_SIZE, height: RESULT_IMAGE_SIZE, borderRadius: 8 }}
    />
  );
}
