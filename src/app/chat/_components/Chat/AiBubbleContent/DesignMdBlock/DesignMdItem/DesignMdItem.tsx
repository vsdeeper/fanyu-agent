import { DownloadOutlined, FileMarkdownOutlined } from '@ant-design/icons';
import { Skeleton } from 'antd';
import type { MessagePart } from '../../utils';
import { DESIGN_MD_DOWNLOAD_HINT, DESIGN_MD_FAILED_LABEL } from './constants';
import styles from './DesignMdItem.module.css';
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
      <div className={`${styles.card} ${styles.failed}`}>
        <FileMarkdownOutlined className={styles.icon} />
        <div className={styles.meta}>
          <div className={styles.name}>{DESIGN_MD_FAILED_LABEL}</div>
        </div>
      </div>
    );
  }

  if (output && isDesignMdReady(output)) {
    const href = getDesignMdHref(output, chatId);
    const fileName = getDesignMdFileName(output);
    if (!href) return null;
    return (
      <a className={styles.card} href={href} download={fileName}>
        <FileMarkdownOutlined className={styles.icon} />
        <div className={styles.meta}>
          <div className={styles.name}>{fileName}</div>
          <div className={styles.hint}>{DESIGN_MD_DOWNLOAD_HINT}</div>
        </div>
        <DownloadOutlined className={styles.download} />
      </a>
    );
  }

  if (isDesignMdPending(state)) {
    return (
      <Skeleton.Input active size="large" style={{ width: 240, height: 52, borderRadius: 8 }} />
    );
  }

  return null;
}
