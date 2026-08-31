import { useEffect, useRef } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { Button, Layout, Typography } from 'antd';
import { useAuxiliaryPanelStore } from './store';
import { AUX_PANEL_CLOSE_MS, AUX_PANEL_WIDTH } from './constants';
import FilePreview from './FilePreview';
import styles from './AuxiliaryPanel.module.css';
import { getPanelTitle, isFormFieldTarget, prefersReducedMotion } from './utils';

type AuxiliaryPanelProps = {
  /** 当前路由会话 id；变化时关闭面板 */
  chatId?: string;
};

/**
 * 对话页右侧通用辅助栏：标题 + 关闭 + 可滚动正文；首期承载文件预览。
 */
export default function AuxiliaryPanel({ chatId }: AuxiliaryPanelProps) {
  const open = useAuxiliaryPanelStore((s) => s.open);
  const content = useAuxiliaryPanelStore((s) => s.content);
  const previewNonce = useAuxiliaryPanelStore((s) => s.previewNonce);
  const closePanel = useAuxiliaryPanelStore((s) => s.closePanel);
  const clearContent = useAuxiliaryPanelStore((s) => s.clearContent);
  const prevChatIdRef = useRef(chatId);

  useEffect(() => {
    if (prevChatIdRef.current === chatId) return;
    prevChatIdRef.current = chatId;
    closePanel();
    clearContent();
  }, [chatId, closePanel, clearContent]);

  useEffect(() => {
    if (open || !content) return;
    if (prefersReducedMotion()) {
      clearContent();
      return;
    }
    const timer = window.setTimeout(() => {
      if (!useAuxiliaryPanelStore.getState().open) clearContent();
    }, AUX_PANEL_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [open, content, clearContent]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (isFormFieldTarget(event.target)) return;
      closePanel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, closePanel]);

  const collapsed = !open;
  const title = getPanelTitle(content);

  return (
    <Layout.Sider
      width={AUX_PANEL_WIDTH}
      collapsedWidth={0}
      collapsed={collapsed}
      trigger={null}
      theme="light"
      className={styles.sider}
      aria-hidden={collapsed}
      inert={collapsed || undefined}
    >
      <div className={`${styles.panel} ${collapsed ? styles.panelCollapsed : ''}`}>
        <div className={styles.header}>
          <Typography.Title level={5} className={styles.title} title={title || undefined}>
            {title}
          </Typography.Title>
          <Button
            type="text"
            icon={<CloseOutlined />}
            aria-label="关闭预览"
            shape="circle"
            onClick={closePanel}
          />
        </div>
        <div className={styles.body}>
          {content?.type === 'file-preview' ? (
            <FilePreview
              key={previewNonce}
              fileName={content.fileName}
              mediaType={content.mediaType}
              source={content.source}
            />
          ) : null}
        </div>
      </div>
    </Layout.Sider>
  );
}
