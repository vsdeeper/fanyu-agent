'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Attachments, Sender, Welcome } from '@ant-design/x';
import type { AttachmentsProps, AttachmentsRef } from '@ant-design/x/es/attachments';
import BubbleList from '@ant-design/x/es/bubble/BubbleList';
import type { BubbleListRef } from '@ant-design/x/es/bubble/interface';
import type { SenderRef } from '@ant-design/x/es/sender/interface';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import {
  CloudUploadOutlined,
  CommentOutlined,
  DownOutlined,
  GlobalOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import type { GetProp } from 'antd';
import { Badge, Button, Flex, Typography, Upload, message } from 'antd';
import { useRouter } from 'next/navigation';
import { getCachedUserLocation, getUserLocation } from '@/lib/user-location';
import AiBubbleContent from './AiBubbleContent';
import UserBubbleContent from './UserBubbleContent';
import styles from './Chat.module.css';

const MAX_ATTACHMENT_COUNT = 5;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ATTACHMENT_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,.pdf,.txt,.md,.doc,.docx';

type AttachmentItem = NonNullable<GetProp<AttachmentsProps, 'items'>>[number];

function getPartsText(
  message: { parts?: ReadonlyArray<{ type: string; [key: string]: unknown }> },
  type: 'text' | 'reasoning',
): string {
  if (!message.parts?.length) return '';
  return message.parts
    .filter((part) => part.type === type && typeof part.text === 'string')
    .map((part) => (part.text as string) ?? '')
    .join('');
}

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

const bubbleRole = {
  user: {
    placement: 'end' as const,
    shape: 'corner' as const,
    // variant 默认即为 filled，与文档「filled - corner right」一致
  },
  ai: {
    placement: 'start' as const,
    variant: 'borderless' as const,
  },
};

/** autoScroll 下贴底时 scrollTop≈0；不做正/倒序双分支 */
function isNearBottom(el: HTMLElement, threshold = 40) {
  return Math.abs(el.scrollTop) <= threshold;
}

type ChatProps = {
  id: string;
  initialMessages: UIMessage[];
  isDraft?: boolean;
  onFirstMessageSent?: () => void;
};

export default function Chat({
  id,
  initialMessages,
  isDraft = false,
  onFirstMessageSent,
}: ChatProps) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [chatId, setChatId] = useState(id);
  const [attachmentScope, setAttachmentScope] = useState<{
    items: AttachmentItem[];
    open: boolean;
  }>(() => ({ items: [], open: false }));
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<BubbleListRef>(null);
  const senderRef = useRef<SenderRef>(null);
  const attachmentsRef = useRef<AttachmentsRef>(null);
  const latestAttachmentItemsRef = useRef<AttachmentItem[]>([]);
  const firstMessageSentRef = useRef(false);

  const attachmentItems = attachmentScope.items;
  const attachmentsOpen = attachmentScope.open;

  // 切换会话：贴底隐藏「滚动到底部」并清空附件，避免跨会话误发
  if (id !== chatId) {
    setChatId(id);
    setShowScrollBottom(false);
    revokeBlobUrls(attachmentScope.items);
    setAttachmentScope({ items: [], open: false });
  }

  // 修复：transport 只建一次；联网开关经 sendMessage body 传入 prepareSendMessagesRequest
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest({ messages, id: chatId, body }) {
          return {
            body: {
              id: chatId,
              message: messages[messages.length - 1],
              ...body,
            },
          };
        },
      }),
  );

  const { messages, sendMessage, status, stop } = useChat({
    id,
    messages: initialMessages,
    transport,
    throttle: 100,
    onFinish: () => {
      // 落盘后刷新 layout，侧栏标题/分组才会更新
      router.refresh();
    },
  });

  // 进页后台预取定位（浏览器原生授权）；提交只读缓存，避免 await 阻塞发送
  useEffect(() => {
    void getUserLocation();
  }, []);

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

  const bubbleItems = useMemo(() => {
    // 修复：loading 延续到有可见 text/reasoning，避免 submitted→streaming 首包空 parts 时的真空期
    const isAwaitingAi = status === 'submitted' || status === 'streaming';
    const lastMessage = messages[messages.length - 1];
    const lastIsUser = lastMessage?.role === 'user';

    const items = messages.map((message, index) => {
      const isLast = index === messages.length - 1;
      const isAi = message.role !== 'user';
      const streaming = isAi && isLast && status === 'streaming';
      const text = getPartsText(message, 'text');
      const reasoning = isAi ? getPartsText(message, 'reasoning') : '';
      const hasVisibleAiContent = Boolean(text || reasoning);
      const thinking = streaming && !text;

      return {
        key: message.id,
        role: isAi ? ('ai' as const) : ('user' as const),
        content: isAi ? (
          <AiBubbleContent
            text={text}
            reasoning={reasoning}
            streaming={streaming}
            thinking={thinking}
            messageParts={message.parts}
          />
        ) : (
          <UserBubbleContent text={text} parts={message.parts} />
        ),
        streaming,
        loading: isAwaitingAi && isAi && isLast && !hasVisibleAiContent,
      };
    });

    // 首包写入前末条仍是 user，须单独补占位；勿与上条 loading 合并为 submitted&&lastIsUser
    if (isAwaitingAi && lastIsUser) {
      items.push({
        key: 'ai-pending',
        role: 'ai' as const,
        content: <span aria-hidden />,
        streaming: false,
        loading: true,
      });
    }

    return items;
  }, [messages, status]);

  const loading = status === 'submitted' || status === 'streaming';
  const hasMessages = messages.length > 0;
  const hasAttachments = attachmentItems.length > 0;

  // 修复：composer 绝对定位浮在消息区上，须动态测高写入 --composer-height；勿再写死 148px
  useLayoutEffect(() => {
    if (!hasMessages) return;

    const chatEl = chatRef.current;
    const composerEl = composerRef.current;
    if (!chatEl || !composerEl) return;

    const syncComposerHeight = () => {
      chatEl.style.setProperty('--composer-height', `${composerEl.offsetHeight}px`);
    };

    syncComposerHeight();
    const observer = new ResizeObserver(syncComposerHeight);
    observer.observe(composerEl);
    return () => observer.disconnect();
  }, [hasMessages, attachmentItems.length, attachmentsOpen]);

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
        placeholder={(type) =>
          type === 'drop'
            ? { title: '将文件拖放到此处' }
            : {
                icon: <CloudUploadOutlined />,
                title: '上传文件',
                description: '点击或拖拽文档、图片到此处',
              }
        }
        getDropContainer={() => senderRef.current?.nativeElement ?? null}
      />
    </Sender.Header>
  );

  const senderNode = (
    <div className={styles.sender}>
      <Sender
        ref={senderRef}
        value={input}
        onChange={setInput}
        loading={loading}
        onCancel={stop}
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

          // 仅同步读预取缓存；未就绪则本轮不带位置，不在此 await 定位
          const userLocation = webSearchEnabled ? getCachedUserLocation() : null;
          // 修复：附件经 SDK 转 data URL 写入 UIMessage 落盘；勿像 reasoning 一样 prune 历史 file parts
          sendMessage(files?.length ? { text, files } : { text }, {
            body: {
              webSearch: webSearchEnabled,
              ...(userLocation ? { userLocation } : {}),
            },
          });
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

  return (
    <div ref={chatRef} className={styles.chat}>
      {hasMessages ? (
        <>
          <div className={styles.messages}>
            <BubbleList
              ref={listRef}
              className={styles.bubbleList}
              items={bubbleItems}
              role={bubbleRole}
              autoScroll
              onScroll={(event) => {
                setShowScrollBottom(!isNearBottom(event.currentTarget));
              }}
            />
            {showScrollBottom ? (
              <Button
                className={styles.scrollBottom}
                shape="circle"
                icon={<DownOutlined />}
                aria-label="滚动到底部"
                onClick={() => {
                  listRef.current?.scrollTo({ top: 'bottom', behavior: 'smooth' });
                  setShowScrollBottom(false);
                }}
              />
            ) : null}
          </div>

          <div ref={composerRef} className={styles.composer}>
            {senderNode}

            <Typography.Text type="secondary" className={styles.disclaimer}>
              内容由 AI 生成，请仔细甄别
            </Typography.Text>
          </div>
        </>
      ) : (
        <div className={styles.emptyStage}>
          <Welcome
            variant="borderless"
            icon={<CommentOutlined style={{ fontSize: 32 }} />}
            title="开始对话"
            description="基于 Vercel AI SDK 与 @ant-design/x 的聊天脚手架"
          />
          {senderNode}
        </div>
      )}
    </div>
  );
}
