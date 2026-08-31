import 'server-only';

import { readFileSync } from 'fs';

import { DESIGN_MD_MIME_TYPE } from '../_shared/constants';
import { getDesignDoc, getDesignDocFilePath } from './assets';

/**
 * 生成 Content-Disposition: attachment，ASCII fallback + RFC 5987 文件名。
 */
function attachmentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '');
  const encoded = encodeURIComponent(fileName);
  return `attachment; filename="${ascii || 'DESIGN.md'}"; filename*=UTF-8''${encoded}`;
}

/** 按 chatId + assetId 读取落盘文档并作为附件下载；不存在或无效时返回 404 */
export function serveDesignDoc(chatId: string, assetId: string): Response {
  const asset = getDesignDoc(chatId?.trim() ?? '', assetId?.trim() ?? '');
  if (!asset) {
    return new Response('Not Found', { status: 404 });
  }

  const bytes = readFileSync(getDesignDocFilePath(asset));

  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': DESIGN_MD_MIME_TYPE,
      'Content-Disposition': attachmentDisposition(asset.fileName),
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
}
