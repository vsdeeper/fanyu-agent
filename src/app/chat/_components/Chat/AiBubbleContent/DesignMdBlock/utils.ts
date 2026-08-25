import { DEFAULT_DESIGN_MD_FILENAME } from '@/features/docs/constants';
import { buildDocAssetUrl } from '@/features/docs/url';

export type SaveDesignMdOutput = {
  ok?: boolean;
  assetId?: string;
  url?: string;
  fileName?: string;
  error?: string;
};

/** 下载地址：优先 tool 返回的 url，否则按 chatId + assetId 拼 */
export function getDesignMdHref(
  output: SaveDesignMdOutput,
  chatId: string | undefined,
): string | undefined {
  if (output.url) return output.url;
  if (chatId && output.assetId) return buildDocAssetUrl(chatId, output.assetId);
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
