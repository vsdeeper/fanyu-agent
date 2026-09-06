import { Drawer, Empty, Image, Spin } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
import '@/lib/theme/XMarkdownTheme.css';
import { useThemeMode } from '@/components/theme';
import { getProductDocDisplay } from '../utils';
import type { ProductDocUploadItem } from '../types';
import {
  MARKDOWN_COMPONENTS,
  MARKDOWN_DISABLE_STYLES,
  MARKDOWN_STREAMING_OFF,
  PREVIEW_LOAD_ERROR,
  PREVIEW_UNSUPPORTED,
  PRODUCT_DOC_PREVIEW_WIDTH,
} from './constants';
import { getDocPreviewKind, loadDocText } from './utils';
import styles from './ProductDocPreview.module.css';

type ProductDocPreviewProps = {
  open: boolean;
  onClose: () => void;
  item: ProductDocUploadItem | null;
};

/**
 * 产品资料预览抽屉：MD / TXT 读正文渲染，PDF 内嵌 iframe，图片放大，DOCX 等暂不支持时给下载提示。
 */
export default function ProductDocPreview({ open, onClose, item }: ProductDocPreviewProps) {
  const { mode, hydrated } = useThemeMode();
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const display = useMemo(() => (item ? getProductDocDisplay(item) : undefined), [item]);
  const kind = useMemo(() => (item ? getDocPreviewKind(item) : 'unsupported'), [item]);
  const isTextKind = kind === 'markdown' || kind === 'text';

  useEffect(() => {
    if (!item || !isTextKind) return;
    const controller = new AbortController();
    void loadDocText(item, controller.signal)
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
  }, [item, isTextKind]);

  const renderBody = () => {
    if (!item || !display) return null;
    if (kind === 'markdown') {
      if (status === 'loading') return <Spin className={styles.status} />;
      if (status === 'error') return <div className={styles.status}>{PREVIEW_LOAD_ERROR}</div>;
      return hydrated ? (
        <XMarkdown
          className={`${mode === 'dark' ? 'x-markdown-dark' : 'x-markdown-light'} ${styles.markdown}`}
          content={text}
          components={MARKDOWN_COMPONENTS}
          paragraphTag="div"
          openLinksInNewTab
          escapeRawHtml
          streaming={MARKDOWN_STREAMING_OFF}
          disableDefaultStyles={MARKDOWN_DISABLE_STYLES}
        />
      ) : null;
    }
    if (kind === 'text') {
      if (status === 'loading') return <Spin className={styles.status} />;
      if (status === 'error') return <div className={styles.status}>{PREVIEW_LOAD_ERROR}</div>;
      return <pre className={styles.code}>{text}</pre>;
    }
    if (kind === 'pdf') {
      return <iframe className={styles.pdf} src={item.previewUrl} title={display.name} />;
    }
    if (kind === 'image') {
      return <Image className={styles.image} src={item.previewUrl} alt={display.name} />;
    }
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={PREVIEW_UNSUPPORTED} />;
  };

  return (
    <Drawer
      placement="right"
      open={open}
      onClose={onClose}
      title={display?.name}
      size={PRODUCT_DOC_PREVIEW_WIDTH}
      styles={{ body: { padding: '16px 20px 24px' } }}
    >
      {renderBody()}
    </Drawer>
  );
}
