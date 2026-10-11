import { App, Button, Upload } from 'antd';
import { useState } from 'react';
import {
  CONFIRM_CANCEL,
  CONFIRM_OK,
  NOVEL_IMPORT_ACCEPT,
  NOVEL_IMPORT_BUTTON,
  NOVEL_IMPORT_INVALID_PAYLOAD,
  NOVEL_IMPORT_MAX_BYTES,
  NOVEL_IMPORT_MISSING_PAYLOAD,
  NOVEL_IMPORT_SAVE_FAILED,
  NOVEL_IMPORT_SUCCESS,
  NOVEL_IMPORT_TOO_LARGE_WARNING,
  NOVEL_IMPORT_TYPE_WARNING,
  NOVEL_IMPORT_UNSUPPORTED_VERSION,
  NOVEL_IMPORT_WRONG_TYPE,
} from '../../constants';
import type { NovelMarkdownImportError, NovelMarkdownImportResult } from '../utils';

type MarkdownImportButtonProps<T> = {
  disabled?: boolean;
  confirmTitle: string;
  confirmContent: string;
  parse: (markdown: string) => NovelMarkdownImportResult<T>;
  onImport: (data: T) => Promise<boolean>;
};

const ERROR_MESSAGE: Record<NovelMarkdownImportError, string> = {
  'missing-payload': NOVEL_IMPORT_MISSING_PAYLOAD,
  'invalid-payload': NOVEL_IMPORT_INVALID_PAYLOAD,
  'wrong-type': NOVEL_IMPORT_WRONG_TYPE,
  'unsupported-version': NOVEL_IMPORT_UNSUPPORTED_VERSION,
};

/** 读取凡域 Markdown 的结构载荷，确认后覆盖当前步骤。 */
export default function MarkdownImportButton<T>({
  disabled = false,
  confirmTitle,
  confirmContent,
  parse,
  onImport,
}: MarkdownImportButtonProps<T>) {
  const { message, modal } = App.useApp();
  const [importing, setImporting] = useState(false);

  /** 校验文件后读取载荷；文件不上传到服务端。 */
  async function handleFile(file: File): Promise<void> {
    if (!file.name.toLowerCase().endsWith('.md')) {
      message.warning(NOVEL_IMPORT_TYPE_WARNING);
      return;
    }
    if (file.size > NOVEL_IMPORT_MAX_BYTES) {
      message.warning(NOVEL_IMPORT_TOO_LARGE_WARNING);
      return;
    }

    let markdown: string;
    try {
      markdown = await file.text();
    } catch {
      message.error(NOVEL_IMPORT_INVALID_PAYLOAD);
      return;
    }
    const result = parse(markdown);
    if (!result.ok) {
      message.error(ERROR_MESSAGE[result.error]);
      return;
    }

    modal.confirm({
      title: confirmTitle,
      content: confirmContent,
      okText: CONFIRM_OK,
      cancelText: CONFIRM_CANCEL,
      onOk: async () => {
        setImporting(true);
        try {
          const saved = await onImport(result.data);
          if (saved) message.success(NOVEL_IMPORT_SUCCESS);
          else message.error(NOVEL_IMPORT_SAVE_FAILED);
        } finally {
          setImporting(false);
        }
      },
    });
  }

  return (
    <Upload
      accept={NOVEL_IMPORT_ACCEPT}
      maxCount={1}
      showUploadList={false}
      disabled={disabled || importing}
      beforeUpload={(file) => {
        void handleFile(file);
        return Upload.LIST_IGNORE;
      }}
    >
      <Button type="link" size="small" loading={importing} disabled={disabled}>
        {NOVEL_IMPORT_BUTTON}
      </Button>
    </Upload>
  );
}
