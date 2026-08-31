import { DEFAULT_DESIGN_MD_FILENAME } from '@/app/api/docs/_shared/constants';
import { buildDocAssetUrl, isDocAssetHref } from '@/app/api/docs/_shared/url';

export type SaveDesignMdOutput = {
  ok?: boolean;
  assetId?: string;
  url?: string;
  fileName?: string;
  byteSize?: number;
  error?: string;
};

/** 下载地址：优先 chatId + assetId 拼相对路径；否则仅放行同源文档 url */
export function getDesignMdHref(
  output: SaveDesignMdOutput,
  chatId: string | undefined,
): string | undefined {
  if (chatId && output.assetId) return buildDocAssetUrl(chatId, output.assetId);
  if (output.url && isDocAssetHref(output.url)) return output.url;
  return undefined;
}

export function getDesignMdFileName(output: SaveDesignMdOutput): string {
  return output.fileName?.trim() || DEFAULT_DESIGN_MD_FILENAME;
}

export function isDesignMdPending(state: string): boolean {
  return (
    state === 'input-streaming' || state === 'input-available' || state === 'approval-requested'
  );
}

export function isDesignMdFailed(state: string, output: SaveDesignMdOutput | undefined): boolean {
  return state === 'output-error' || output?.ok === false;
}

export function isDesignMdReady(output: SaveDesignMdOutput | undefined): boolean {
  return output?.ok === true && Boolean(output.assetId || output.url);
}
