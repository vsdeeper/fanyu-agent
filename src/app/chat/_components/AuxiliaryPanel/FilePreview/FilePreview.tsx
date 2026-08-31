import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
import '../../Chat/AiBubbleContent/XMarkdownTheme.css';
import { useThemeMode } from '@/components/theme';
import type { AuxiliaryPanelFileSource } from '../types';
import { FILE_PREVIEW_LOAD_ERROR } from './constants';
import { previewMarkdownComponents } from './PreviewImage';
import styles from './FilePreview.module.css';
import { isMarkdownPreview, loadPreviewText } from './utils';

export type FilePreviewProps = {
  fileName: string;
  mediaType: string;
  source: AuxiliaryPanelFileSource;
};

/**
 * 在辅助面板中渲染文件正文：Markdown 走 XMarkdown，其余文本走 pre。
 */
export default function FilePreview({ fileName, mediaType, source }: FilePreviewProps) {
  const { mode } = useThemeMode();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [text, setText] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    void loadPreviewText(source, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        setText(value);
        setStatus('ready');
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setStatus('error');
      });
    return () => {
      controller.abort();
    };
  }, [source]);

  if (status === 'loading') {
    return (
      <div className={styles.status}>
        <Spin />
      </div>
    );
  }

  if (status === 'error') {
    return <div className={styles.status}>{FILE_PREVIEW_LOAD_ERROR}</div>;
  }

  if (isMarkdownPreview(fileName, mediaType)) {
    return (
      <XMarkdown
        className={`${mode === 'dark' ? 'x-markdown-dark' : 'x-markdown-light'} ${styles.markdown}`}
        content={text}
        components={previewMarkdownComponents}
        paragraphTag="div"
        openLinksInNewTab
        escapeRawHtml
        disableDefaultStyles={['code', 'img']}
      />
    );
  }

  return <pre className={styles.code}>{text}</pre>;
}
