import { Drawer } from 'antd';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
import '@/lib/theme/XMarkdownTheme.css';
import { useThemeMode } from '@/components/theme';
import {
  MARKDOWN_COMPONENTS,
  MARKDOWN_DISABLE_STYLES,
  MARKDOWN_STREAMING_OFF,
} from '../../ResultPanel/constants';
import { ANALYSIS_PREVIEW_WIDTH } from './constants';
import styles from './AnalysisPreview.module.css';

type AnalysisPreviewProps = {
  /** 是否打开抽屉 */
  open: boolean;
  /** 关闭抽屉回调 */
  onClose: () => void;
  /** 标题文件名，如 商业分析.md */
  fileName: string;
  /** 分析 Markdown 全文（静态、非流式） */
  analysisText: string;
};

/** 商业分析 Markdown 预览抽屉：点分析文件卡片主体在右侧打开，正文用 XMarkdown 渲染。 */
export default function AnalysisPreview({
  open,
  onClose,
  fileName,
  analysisText,
}: AnalysisPreviewProps) {
  const { mode, hydrated } = useThemeMode();

  return (
    <Drawer
      placement="right"
      open={open}
      onClose={onClose}
      title={fileName}
      size={ANALYSIS_PREVIEW_WIDTH}
      styles={{ body: { padding: '16px 20px 24px' } }}
    >
      {hydrated ? (
        <XMarkdown
          className={`${mode === 'dark' ? 'x-markdown-dark' : 'x-markdown-light'} ${styles.markdown}`}
          content={analysisText}
          components={MARKDOWN_COMPONENTS}
          paragraphTag="div"
          openLinksInNewTab
          escapeRawHtml
          streaming={MARKDOWN_STREAMING_OFF}
          disableDefaultStyles={MARKDOWN_DISABLE_STYLES}
        />
      ) : null}
    </Drawer>
  );
}
