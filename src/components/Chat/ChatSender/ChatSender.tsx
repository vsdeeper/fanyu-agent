'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Attachments, Sender } from '@ant-design/x';
import type { AttachmentsRef } from '@ant-design/x/es/attachments';
import Suggestion from '@ant-design/x/es/suggestion';
import type { SuggestionItem } from '@ant-design/x/es/suggestion';
import type { SenderRef } from '@ant-design/x/es/sender/interface';
import { LinkOutlined } from '@ant-design/icons';
import { Badge, Button, Flex, Upload, message } from 'antd';
import { listSkillSummaries } from '@/lib/skills/registry';
import AttachmentPreviewList from './AttachmentPreviewList';
import {
  ATTACHMENT_ACCEPT,
  EMPTY_SLOT_CONFIG,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_COUNT,
} from './constants';
import styles from './ChatSender.module.css';
import {
  type AttachmentScope,
  createFileListFromAttachments,
  getSenderHeaderReady,
  getSenderHeaderReadyServer,
  insertSkillTag,
  mergeAttachmentFileList,
  removeAttachmentItem,
  revokeBlobUrls,
  selectAttachments,
  shouldOpenSkillSuggestion,
  stopCascaderSwallowingInputKeys,
  subscribeSenderHeaderReady,
  toSkillSuggestionItems,
  withPreviewUrls,
} from './utils';

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
  const [attachmentScope, setAttachmentScope] = useState<AttachmentScope>(() => ({
    items: [],
    open: false,
  }));

  const senderRef = useRef<SenderRef>(null);
  const attachmentsRef = useRef<AttachmentsRef>(null);
  const latestAttachmentItemsRef = useRef(attachmentScope.items);

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
      <AttachmentPreviewList
        items={attachmentItems}
        disabled={loading}
        canAdd={!loading && attachmentItems.length < MAX_ATTACHMENT_COUNT}
        onRemove={(uid) => {
          setAttachmentScope((prev) => removeAttachmentItem(prev, uid));
        }}
        onAdd={() => selectAttachments(attachmentsRef)}
      />
      {/* children 走 SilentUploader，避开内部 FileList 首帧空列表；列表由 PreviewList 直出 */}
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
        onChange={({ fileList }) => {
          setAttachmentScope((prev) => {
            const next = withPreviewUrls(mergeAttachmentFileList(fileList, prev.items), prev.items);
            return { items: next, open: next.length > 0 };
          });
        }}
        getDropContainer={() => senderRef.current?.nativeElement ?? null}
        styles={{ root: { display: 'none' } }}
      >
        <span />
      </Attachments>
    </Sender.Header>
  );

  return (
    <Suggestion
      items={skillItems}
      onSelect={(value) => {
        const summary = skillSummaryById.get(value);
        if (!summary) return;

        const current = senderRef.current?.getValue()?.value ?? input;
        insertSkillTag(senderRef, summary, current);

        onSkillChange(activeSkillIds.includes(value) ? activeSkillIds : [...activeSkillIds, value]);
      }}
      classNames={{ root: styles.suggestion, content: styles.suggestionContent }}
    >
      {({ onTrigger, onKeyDown, open }) => (
        <Sender
          ref={senderRef}
          classNames={{
            root: styles.root,
          }}
          slotConfig={EMPTY_SLOT_CONFIG}
          onChange={(value, event) => {
            setInput(value);
            if (skillItems.length === 0) {
              onTrigger(false);
              return;
            }
            const nativeEvent = event?.nativeEvent;
            const inputData = nativeEvent instanceof InputEvent ? nativeEvent.data : undefined;
            onTrigger(shouldOpenSkillSuggestion(value, inputData));
          }}
          onKeyDown={(event) => {
            if (event.key === ' ' && open) {
              onTrigger(false);
            }
            return stopCascaderSwallowingInputKeys(event, open, onKeyDown);
          }}
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
                  onClick={() => selectAttachments(attachmentsRef)}
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
            senderRef.current?.clear();
          }}
        />
      )}
    </Suggestion>
  );
}
