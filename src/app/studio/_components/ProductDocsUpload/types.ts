import type { LocalUploadItem } from '@/lib/shared/client/upload-items';

/** 上传项与本地文件生命周期（追加/移除/释放 URL）共用同一份定义，见 lib/shared/client/upload-items。 */
export type ProductDocUploadItem = LocalUploadItem;
