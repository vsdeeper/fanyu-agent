/** 会话内文档资产（DESIGN.md 等），供下载接口与 tool 输出共用 */
export type DocAssetRecord = {
  id: string;
  chatId: string;
  fileName: string;
  mimeType: string;
  /** 落盘字节数，供卡片副标题展示 */
  byteSize: number;
};
