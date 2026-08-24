import type { ImageProvider } from '../../types';

/** Flux Art 聚合 Provider 占位；二期实现异步 task 轮询 */
export const fluxArtProvider: ImageProvider = {
  id: 'flux-art',
  async generate() {
    throw new Error('Flux Art 生图暂未开通，请使用默认 Seedream 模型');
  },
};
