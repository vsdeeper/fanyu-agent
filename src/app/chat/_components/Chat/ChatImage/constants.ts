import fallbackIcon from '@/assets/images/fallback-icon.png';
import styles from './ChatImage.module.css';

/** 加载/展示失败时居中显示的占位图标 URL */
export const FALLBACK_ICON_SRC = fallbackIcon.src;

export const CHAT_IMAGE_CLASS_NAMES = {
  root: styles.image,
  popup: { body: styles.previewBody },
};

export const CHAT_IMAGE_FAILED_CLASS_NAMES = {
  root: `${styles.image} ${styles.failed}`,
};

export const CHAT_IMAGE_PREVIEW_GROUP_CLASS_NAMES = {
  popup: { body: styles.previewBody },
};
