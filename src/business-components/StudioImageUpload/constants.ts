import styles from './StudioImageUpload.module.css';

export const MAX_STUDIO_IMAGES = 6;

export const STUDIO_IMAGE_ACCEPT = 'image/*';

export const STUDIO_IMAGE_SUBTITLE = '上传清晰的产品图片';

export const STUDIO_IMAGE_HINT = '多图上传时建议仅上传必要的视角或 sku 图，\n干净的白底产品图最佳';

/** Image.PreviewGroup 预览弹层：透明棋盘格底，便于看清白底产品图。 */
export const STUDIO_IMAGE_PREVIEW_GROUP_CLASS_NAMES = {
  popup: { body: styles.previewBody },
};
