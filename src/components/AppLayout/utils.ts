import { HOME_PATH } from './constants';

/** 首页仅 redirect，不渲染工作区侧栏，避免跳转前闪一帧 */
export function isHomePath(pathname: string): boolean {
  return pathname === HOME_PATH;
}
