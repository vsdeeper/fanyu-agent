import { Image, Skeleton } from 'antd';
import type { StudioResultImage } from '../../../types';
import { getImageSrc } from '../../utils';
import {
  FALLBACK_ICON_SRC,
  RESULT_IMAGE_CLASS_NAMES,
  RESULT_IMAGE_FAILED_CLASS_NAMES,
} from '../constants';

type ResultImageItemProps = {
  image: StudioResultImage;
  /** 预览单元格宽高（随表单尺寸比例换算） */
  width: number;
  height: number;
};

/**
 * 单张出图：pending Skeleton、就绪预览、失败 fallback。
 * 显示比例与网格一致（随尺寸比例）。
 */
export default function ResultImageItem({ image, width, height }: ResultImageItemProps) {
  if (image.status === 'failed') {
    return (
      <Image
        src={FALLBACK_ICON_SRC}
        width={width}
        height={height}
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
        width={width}
        height={height}
        alt="生成的图片"
        preview={{ mask: '预览' }}
        classNames={RESULT_IMAGE_CLASS_NAMES}
        placeholder={<Skeleton.Image active style={{ width, height }} />}
        fallback={FALLBACK_ICON_SRC}
      />
    );
  }

  return <Skeleton.Image active style={{ width, height, borderRadius: 8 }} />;
}
