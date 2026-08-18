'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Attachments, Sender } from '@ant-design/x';
import type { AttachmentsProps, AttachmentsRef } from '@ant-design/x/es/attachments';
import Suggestion from '@ant-design/x/es/suggestion';
import type { SuggestionItem } from '@ant-design/x/es/suggestion';
import type { SenderRef } from '@ant-design/x/es/sender/interface';
import { LinkOutlined } from '@ant-design/icons';
import type { GetProp } from 'antd';
import { Badge, Button, Flex, Tag, Upload, message } from 'antd';
import { listSkillSummaries } from '@/lib/skills/registry';
import styles from './ChatSender.module.css';
import {
  completeSkillToken,
  getSenderHeaderReady,
  getSenderHeaderReadyServer,
  hasSkillToken,
  stopCascaderSwallowingInputKeys,
  subscribeSenderHeaderReady,
  toSkillSuggestionItems,
} from './utils';

const MAX_ATTACHMENT_COUNT = 5;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
// 修复：收窄到后端可解析的类型。.doc（OLE 二进制）无可靠解析库、方舟仅接受 application/pdf
// 内联文件，若放行只会「入库但模型读不到」，故从选择器入口拦截，避免异常数据落库
const ATTACHMENT_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,.pdf,.txt,.md,.docx';

type AttachmentItem = NonNullable<GetProp<AttachmentsProps, 'items'>>[number];

function isImageAttachment(item: AttachmentItem) {
  const type = item.type ?? item.originFileObj?.type;
  return type?.startsWith('image/') ?? false;
}

function revokeBlobUrls(items: AttachmentItem[]) {
  for (const item of items) {
    const blobUrls = new Set<string>();
    if (item.url?.startsWith('blob:')) blobUrls.add(item.url);
    if (item.thumbUrl?.startsWith('blob:')) blobUrls.add(item.thumbUrl);
    for (const url of blobUrls) {
      URL.revokeObjectURL(url);
    }
  }
}

// 修复：previewImage 会压到约 200px；图片用原图 blob 作预览，状态仍保留 originFileObj 供发送。
function withPreviewUrls(
  fileList: AttachmentItem[],
  prevItems: AttachmentItem[],
): AttachmentItem[] {
  const nextUids = new Set(fileList.map((item) => item.uid));
  for (const prev of prevItems) {
    if (!nextUids.has(prev.uid)) {
      revokeBlobUrls([prev]);
    }
  }

  return fileList.map((item) => {
    if (!isImageAttachment(item) || !item.originFileObj) {
      return item;
    }

    const hasBlobPreview = item.thumbUrl?.startsWith('blob:') || item.url?.startsWith('blob:');
    if (hasBlobPreview) {
      const blobUrl = item.thumbUrl?.startsWith('blob:') ? item.thumbUrl : item.url;
      return { ...item, thumbUrl: blobUrl, url: blobUrl };
    }

    const blobUrl = URL.createObjectURL(item.originFileObj);
    return { ...item, thumbUrl: blobUrl, url: blobUrl };
  });
}

// 修复：传给 Attachments 的 items 去掉 originFileObj，跳过 FileList 内 previewImage 压缩与真空期。
function toDisplayItems(items: AttachmentItem[]): AttachmentItem[] {
  return items.map(({ originFileObj, ...rest }) => {
    void originFileObj;
    return rest;
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
  activeSkillIds: string[];
  onSkillChange: (skillIds: string[]) => void;
  onCancel: () => void;
  onSend: (payload: { text: string; files?: FileList }) => void;
};

export default function ChatSender({
  id,
  loading,
  isDraft = false,
  activeSkillIds,
  onSkillChange,
  onCancel,
  onSend,
}: ChatSenderProps) {
  const [input, setInput] = useState('');
  const [chatId, setChatId] = useState(id);
  // 修复：Sender.Header + forceRender 让 CSSMotion 在 SSR 输出 display:none 的 header，
  // 客户端首帧不输出，草稿 /chat 刷新 Hydration failed（header 对上 textarea）。
  // 用 useSyncExternalStore 在 hydrate 后再挂 Header，避免 effect 内同步 setState。
  const headerReady = useSyncExternalStore(
    subscribeSenderHeaderReady,
    getSenderHeaderReady,
    getSenderHeaderReadyServer,
  );
  const [attachmentScope, setAttachmentScope] = useState<{
    items: AttachmentItem[];
    open: boolean;
  }>(() => ({ items: [], open: false }));

  const senderRef = useRef<SenderRef>(null);
  const attachmentsRef = useRef<AttachmentsRef>(null);
  const latestAttachmentItemsRef = useRef<AttachmentItem[]>([]);

  const attachmentItems = attachmentScope.items;
  const attachmentsOpen = attachmentScope.open;
  const hasAttachments = attachmentItems.length > 0;

  const skillSummaries = listSkillSummaries();
  const skillItems: SuggestionItem[] = toSkillSuggestionItems(skillSummaries);
  const skillSummaryById = new Map(skillSummaries.map((summary) => [summary.id, summary]));

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
        items={toDisplayItems(attachmentItems)}
        onChange={({ fileList }) => {
          const next = withPreviewUrls(fileList, attachmentItems);
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
    <>
      {activeSkillIds.length > 0 ? (
        <div className={styles.skillBar}>
          {activeSkillIds.map((skillId) => {
            const summary = skillSummaryById.get(skillId);
            return (
              <Tag
                key={skillId}
                className={styles.skillTag}
                closable
                onClose={(event) => {
                  event.preventDefault();
                  onSkillChange(activeSkillIds.filter((item) => item !== skillId));
                }}
              >
                {summary?.icon ? `${summary.icon} ${summary.name}` : (summary?.name ?? skillId)}
              </Tag>
            );
          })}
          <span className={styles.skillHint}>本次按这些 skill 约束输出</span>
        </div>
      ) : null}
      <Suggestion
        items={skillItems}
        onSelect={(value) => {
          // 修复：选中 skill 只补全输入里的 /令牌（保留正文其余文字），并把 skill 追加进激活集合；
          // 令牌保留在文本里，位置语义由服务端原位展开实现
          setInput((prev) => completeSkillToken(prev, value));
          onSkillChange(
            activeSkillIds.includes(value) ? activeSkillIds : [...activeSkillIds, value],
          );
        }}
        classNames={{ root: styles.suggestion, content: styles.suggestionContent }}
      >
        {({ onTrigger, onKeyDown, open }) => (
          <Sender
            ref={senderRef}
            classNames={{
              root: styles.root,
            }}
            value={input}
            onChange={(value) => {
              setInput(value);
              // 修复：Suggestion 不自识别前缀，须自行在行首/空格后的 / 时唤起；无 skill 注册时不弹空菜单
              onTrigger(skillItems.length > 0 && hasSkillToken(value));
            }}
            onKeyDown={(event) => stopCascaderSwallowingInputKeys(event, open, onKeyDown)}
            loading={loading}
            onCancel={onCancel}
            placeholder="给 OneAgent 发送消息"
            suffix={false}
            autoSize={{ minRows: 2, maxRows: 8 }}
            header={headerReady ? senderHeader : undefined}
            onPasteFile={(files) => {
              for (const file of files) {
                attachmentsRef.current?.upload(file);
              }
            }}
            footer={(actionNode) => (
              <Flex justify="space-between" align="center">
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
                {actionNode}
              </Flex>
            )}
            onSubmit={(value) => {
              // 修复：菜单打开时 Enter 用于选择 skill，勿触发发送（Suggestion 的 onKeyDown 已
              // preventDefault 并返回 false，此处再拦一道双保险）
              if (open) return;
              const text = value.trim();
              const files = createFileListFromAttachments(attachmentItems);
              if (!text && !files?.length) return;

              onSend({ text, files });
              // 修复：草稿首条发送后的导航改由 Chat 在流式开始后触发（避免与落库竞态 404），
              // 此处不再同步 replace
              revokeBlobUrls(attachmentItems);
              setAttachmentScope((prev) => ({ ...prev, items: [], open: false }));
              setInput('');
            }}
          />
        )}
      </Suggestion>
    </>
  );
}
