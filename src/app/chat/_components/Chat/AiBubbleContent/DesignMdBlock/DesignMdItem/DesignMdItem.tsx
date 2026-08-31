import { FileMarkdownOutlined } from '@ant-design/icons';
import FileCard from '@/components/FileCard';
import type { MessagePart } from '../../utils';
import { DESIGN_MD_FAILED_LABEL } from './constants';
import {
  getDesignMdFileName,
  getDesignMdHref,
  isDesignMdFailed,
  isDesignMdPending,
  isDesignMdReady,
  type SaveDesignMdOutput,
} from '../utils';

export type DesignMdItemProps = {
  part: MessagePart;
  chatId: string | undefined;
};

export default function DesignMdItem({ part, chatId }: DesignMdItemProps) {
  const state = typeof part.state === 'string' ? part.state : '';
  const output = part.output as SaveDesignMdOutput | undefined;

  if (isDesignMdFailed(state, output)) {
    return (
      <FileCard status="failed" fileName={DESIGN_MD_FAILED_LABEL} icon={<FileMarkdownOutlined />} />
    );
  }

  if (output && isDesignMdReady(output)) {
    const href = getDesignMdHref(output, chatId);
    const fileName = getDesignMdFileName(output);
    if (!href) return null;
    return (
      <FileCard
        fileName={fileName}
        href={href}
        byteSize={output.byteSize}
        icon={<FileMarkdownOutlined />}
      />
    );
  }

  if (isDesignMdPending(state)) {
    return <FileCard status="loading" />;
  }

  return null;
}
