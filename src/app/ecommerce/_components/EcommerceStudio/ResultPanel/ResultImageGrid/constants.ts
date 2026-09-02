import fallbackIcon from '@/assets/images/fallback-icon.png';
import styles from './ResultImageGrid.module.css';

export const RESULT_IMAGE_SIZE = 160;

export const FALLBACK_ICON_SRC = fallbackIcon.src;

export const RESULT_IMAGE_CLASS_NAMES = {
  root: styles.image,
  popup: { body: styles.previewBody },
};

export const RESULT_IMAGE_FAILED_CLASS_NAMES = {
  root: `${styles.image} ${styles.failed}`,
};

export const RESULT_PREVIEW_GROUP_CLASS_NAMES = {
  popup: { body: styles.previewBody },
};
