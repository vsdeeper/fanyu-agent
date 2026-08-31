/** 文件预览：相对视口，避免随 Sider 收缩重排；与内层 .panel 锁死宽度一致 */
export const AUX_PANEL_WIDTH = 'max(360px, min(42vw, 720px))';

/** 来源概要：固定窄栏 */
export const AUX_PANEL_SOURCE_LIST_WIDTH = '360px';

/** 详情图分组：与来源概要同宽，固定窄栏 */
export const AUX_PANEL_DETAIL_IMAGES_WIDTH = '360px';

/** 与 .panel transform 过渡 0.28s 对齐，关闭后再卸预览 DOM */
export const AUX_PANEL_CLOSE_MS = 280;
