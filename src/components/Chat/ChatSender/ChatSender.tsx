'use client';

import { useEffect, useRef, useState } from 'react';
import { Attachments, Sender } from '@ant-design/x';
import type { AttachmentsProps, AttachmentsRef } from '@ant-design/x/es/attachments';
import type { SenderRef } from '@ant-design/x/es/sender/interface';
import { GlobalOutlined, LinkOutlined } from '@ant-design/icons';
import type { GetProp } from 'antd';
import { Badge, Button, Flex, Upload, message } from 'antd';
import styles from './ChatSender.module.css';

const MAX_ATTACHMENT_COUNT = 5;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ATTACHMENT_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,.pdf,.txt,.md,.doc,.docx';

type AttachmentItem = NonNullable<GetProp<AttachmentsProps, 'items'>>[number];

function revokeBlobUrls(items: AttachmentItem[]) {
  for (const item of items) {
    if (item.url?.startsWith('blob:')) {
      URL.revokeObjectURL(item.url);
    }
  }
}

function withPreviewUrls(file: AttachmentItem, fileList: AttachmentItem[]): AttachmentItem[] {
  return fileList.map((item) => {
    if (item.uid === file.uid && file.status !== 'removed' && item.originFileObj) {
      if (item.url?.startsWith('blob:')) {
        URL.revokeObjectURL(item.url);
      }
      return {
        ...item,
        url: URL.createObjectURL(item.originFileObj),
      };
    }
    return item;
  });
}

function createFileListFromAttachments(items: AttachmentItem[]): FileList | undefined {
  const dataTransfer = new DataTransfer();
  for (const item of items) {
    if (item.originFileObj) {
      dataTransfer.items.add(item.originFileObj);
    }
  }
  return dataTransfer.files.length > 0 ? dataTransfer.files : undefined;
}

export type ChatSenderProps = {
  id: string;
  loading: boolean;
  isDraft?: boolean;
  /** default：composer 内；welcome：空态欢迎页 */
  variant?: 'default' | 'welcome';
  onCancel: () => void;
  onFirstMessageSent?: () => void;
  onSend: (payload: { text: string; files?: FileList; webSearch: boolean }) => void;
};

export default function ChatSender({
  id,
  loading,
  isDraft = false,
  variant = 'default',
  onCancel,
  onFirstMessageSent,
  onSend,
}: ChatSenderProps) {
  const [input, setInput] = useState('');
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [chatId, setChatId] = useState(id);
  const [attachmentScope, setAttachmentScope] = useState<{
    items: AttachmentItem[];
    open: boolean;
  }>(() => ({ items: [], open: false }));

  const senderRef = useRef<SenderRef>(null);
  const attachmentsRef = useRef<AttachmentsRef>(null);
  const latestAttachmentItemsRef = useRef<AttachmentItem[]>([]);
  const firstMessageSentRef = useRef(false);

  const attachmentItems = attachmentScope.items;
  const attachmentsOpen = attachmentScope.open;
  const hasAttachments = attachmentItems.length > 0;

  // 切换会话：清空附件，避免跨会话误发
  if (id !== chatId) {
    setChatId(id);
    revokeBlobUrls(attachmentScope.items);
    setAttachmentScope({ items: [], open: false });
  }

  // 同步附件列表供卸载清理；勿在 render 写 ref
  useEffect(() => {
    latestAttachmentItemsRef.current = attachmentItems;
  }, [attachmentItems]);

  // 卸载时释放 blob 预览 URL
  useEffect(() => {
    return () => {
      revokeBlobUrls(latestAttachmentItemsRef.current);
    };
  }, []);

  // 草稿态（/chat 欢迎页）挂载后聚焦 Sender，便于立即输入
  useEffect(() => {
    if (!isDraft) return;
    const frame = requestAnimationFrame(() => {
      senderRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isDraft, id]);

  const senderHeader = (
    <Sender.Header
      title={null}
      open={attachmentsOpen}
      // 修复：Header 收起时仍保留 Attachments DOM，否则 ref.select() 找不到 file input
      forceRender
      closable={false}
      onOpenChange={(open) => {
        setAttachmentScope((prev) => ({ ...prev, open }));
      }}
      styles={{
        content: {
          padding: 0,
        },
      }}
    >
      <Attachments
        ref={attachmentsRef}
        accept={ATTACHMENT_ACCEPT}
        maxCount={MAX_ATTACHMENT_COUNT}
        // 修复：仅本地持有文件，sendMessage 时转 FileUIPart；勿走独立上传接口
        beforeUpload={(file) => {
          if (file.size > MAX_ATTACHMENT_BYTES) {
            message.warning('单个文件不能超过 10MB');
            return Upload.LIST_IGNORE;
          }
          return false;
        }}
        items={attachmentItems}
        onChange={({ file, fileList }) => {
          const next = withPreviewUrls(file, fileList);
          setAttachmentScope((prev) => ({
            ...prev,
            items: next,
            open: next.length > 0,
          }));
        }}
        getDropContainer={() => senderRef.current?.nativeElement ?? null}
      />
    </Sender.Header>
  );

  return (
    <div className={[styles.root, variant === 'welcome' ? styles.welcome : ''].join(' ')}>
      <Sender
        ref={senderRef}
        value={input}
        onChange={setInput}
        loading={loading}
        onCancel={onCancel}
        placeholder="给 AI Agent 发送消息"
        suffix={false}
        autoSize={{ minRows: 2, maxRows: 8 }}
        header={senderHeader}
        onPasteFile={(files) => {
          for (const file of files) {
            attachmentsRef.current?.upload(file);
          }
        }}
        footer={(actionNode) => (
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={8}>
              <Badge dot={hasAttachments && !attachmentsOpen}>
                <Button
                  type="text"
                  aria-label="上传附件"
                  icon={<LinkOutlined />}
                  disabled={loading || attachmentItems.length >= MAX_ATTACHMENT_COUNT}
                  onClick={() => {
                    attachmentsRef.current?.select({
                      accept: ATTACHMENT_ACCEPT,
                      multiple: true,
                    });
                  }}
                />
              </Badge>
              <Sender.Switch
                value={webSearchEnabled}
                onChange={setWebSearchEnabled}
                icon={<GlobalOutlined />}
              >
                联网搜索
              </Sender.Switch>
            </Flex>
            {actionNode}
          </Flex>
        )}
        onSubmit={(value) => {
          const text = value.trim();
          const files = createFileListFromAttachments(attachmentItems);
          if (!text && !files?.length) return;

          onSend({ text, files, webSearch: webSearchEnabled });
          // 修复：草稿首条发送后立即 replace 到 /chat/[id]，须在本组件 remount 前触发
          if (isDraft && !firstMessageSentRef.current) {
            firstMessageSentRef.current = true;
            onFirstMessageSent?.();
          }
          revokeBlobUrls(attachmentItems);
          setAttachmentScope((prev) => ({ ...prev, items: [], open: false }));
          setInput('');
        }}
      />
    </div>
  );
}
