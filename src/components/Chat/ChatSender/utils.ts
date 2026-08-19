import type { KeyboardEvent, RefObject } from 'react';
import type { AttachmentsProps, AttachmentsRef } from '@ant-design/x/es/attachments';
import type { SlotConfigType, SenderRef } from '@ant-design/x/es/sender/interface';
import type { SuggestionItem } from '@ant-design/x/es/suggestion';
import type { GetProp } from 'antd';
import type { SkillSummary } from '@/lib/skills/types';
import { formatSkillTagLabel } from '@/lib/skills/format-tag-label';
import { ATTACHMENT_ACCEPT } from './constants';

export type AttachmentItem = NonNullable<GetProp<AttachmentsProps, 'items'>>[number];

export type AttachmentScope = {
  items: AttachmentItem[];
  open: boolean;
};

/** 把 skill 精简视图映射为 Suggestion 菜单项（label=图标+名称，extra=描述） */
export function toSkillSuggestionItems(summaries: SkillSummary[]): SuggestionItem[] {
  return summaries.map(({ id, name, description, icon }) => ({
    value: id,
    label: icon ? `${icon} ${name}` : name,
    extra: description,
  }));
}

/** contenteditable 内可编辑 Text 节点上的光标位置 */
export type EditableCaret = {
  node: Text;
  offset: number;
};

/** 光标处正在输入的 skill 令牌（`/关键词` 整段，供删除与过滤） */
export type SkillTokenAtCaret = {
  node: Text;
  slashPos: number;
  tokenEnd: number;
  keyword: string;
};

/** Suggestion 唤起结果：`false` 关闭；字符串为传给 `onTrigger` 的过滤关键词（裸 `/` 时为 `''`） */
export type SkillSuggestionTriggerResult =
  | false
  | {
      keyword: string;
      token: SkillTokenAtCaret;
    };

/**
 * 从 window.getSelection 读取编辑器内光标；选区不在 editable 或落在 slot 内时返回 null。
 */
export function getEditableCaret(editable: HTMLElement | null): EditableCaret | null {
  if (!editable || typeof window === 'undefined') {
    return null;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return null;
  }

  const { startContainer, startOffset } = selection.getRangeAt(0);
  if (!editable.contains(startContainer)) {
    return null;
  }

  if (startContainer.nodeType !== Node.TEXT_NODE) {
    return null;
  }

  const node = startContainer as Text;
  if (node.parentElement?.closest('[data-slot-key]')) {
    return null;
  }

  return { node, offset: startOffset };
}

/**
 * 按 skill 中文 name 过滤菜单项；keyword 为空时返回全部。
 */
export function filterSkillSummaries(summaries: SkillSummary[], keyword: string): SkillSummary[] {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return summaries;
  }

  const lower = trimmed.toLowerCase();
  return summaries.filter((summary) => summary.name.toLowerCase().includes(lower));
}

/**
 * 根据光标处 `/` 令牌与 name 过滤结果，决定 Suggestion 开关与关键词。
 * 修复：原先用全文扫描未完成令牌，粘贴含「 / 」的正文也会弹菜单；现仅光标落在行首或前置空格后的 `/关键词` 内才打开。
 */
export function resolveSkillSuggestionTrigger(
  editable: HTMLElement | null,
  summaries: SkillSummary[],
  inputData: string | null | undefined,
): SkillSuggestionTriggerResult {
  if (inputData === ' ') {
    return false;
  }

  const caret = getEditableCaret(editable);
  const token = findSkillTokenAtCaret(editable, caret);
  if (!token) {
    return false;
  }

  if (filterSkillSummaries(summaries, token.keyword).length === 0) {
    return false;
  }

  return { keyword: token.keyword, token };
}

/**
 * 光标是否落在行首或前置空格后的 `/` 与关键词之间；keyword 为 `/` 到光标之间的非空白原文。
 */
export function findSkillTokenAtCaret(
  editable: HTMLElement | null,
  caret: EditableCaret | null,
): SkillTokenAtCaret | null {
  if (!editable || !caret) {
    return null;
  }

  const { node, offset: caretOffset } = caret;
  const text = node.textContent ?? '';

  for (let slashPos = caretOffset - 1; slashPos >= 0; slashPos -= 1) {
    if (text[slashPos] !== '/') {
      continue;
    }

    if (!hasSkillSlashBoundary(editable, node, slashPos)) {
      continue;
    }

    const keyword = text.slice(slashPos + 1, caretOffset);
    if (/\s/.test(keyword) || caretOffset <= slashPos) {
      continue;
    }

    return {
      node,
      slashPos,
      tokenEnd: caretOffset,
      keyword,
    };
  }

  return null;
}

/** `/` 前须为行首或空白；节点以 `/` 开头时看前一个可编辑文本节点末字符 */
function hasSkillSlashBoundary(editable: HTMLElement, node: Text, slashPos: number): boolean {
  if (slashPos > 0) {
    const text = node.textContent ?? '';
    return /\s/.test(text[slashPos - 1] ?? '');
  }

  const prevNode = getPreviousEditableTextNode(editable, node);
  if (!prevNode) {
    return true;
  }

  const prevText = prevNode.textContent ?? '';
  if (!prevText) {
    return true;
  }

  return /\s/.test(prevText[prevText.length - 1] ?? '');
}

function getPreviousEditableTextNode(editable: HTMLElement, node: Text): Text | null {
  const nodes = collectEditableTextNodes(editable);
  const index = nodes.indexOf(node);
  if (index <= 0) {
    return null;
  }
  return nodes[index - 1] ?? null;
}

/** 删除令牌后 tag 后是否须补空格：看该 span 之后是否已有空白 */
function needsSpaceAfterSkillToken(token: SkillTokenAtCaret): boolean {
  const text = token.node.textContent ?? '';
  const afterRaw = text.slice(token.tokenEnd);
  return !afterRaw || !/^\s/.test(afterRaw);
}

/** 收集编辑器内可改写的 text 节点（跳过 slot 内部） */
function collectEditableTextNodes(editable: HTMLElement): Text[] {
  const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement;
      if (parent?.closest('[data-slot-key]')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes: Text[] = [];
  for (let current = walker.nextNode(); current; current = walker.nextNode()) {
    nodes.push(current as Text);
  }
  return nodes;
}

/**
 * 从 contenteditable 删掉唤起菜单时记录的光标处 `/关键词` 整段；令牌前的空格原样保留。
 */
export function removeSkillTokenFromEditor(
  editable: HTMLElement | null,
  token: SkillTokenAtCaret | null,
): boolean {
  if (!editable || !token) {
    return false;
  }

  token.node.deleteData(token.slashPos, token.tokenEnd - token.slashPos);

  if (!token.node.textContent) {
    token.node.remove();
  }
  return true;
}

let skillTagKeyCounter = 0;

/** 输入区 / 气泡 skill tag 展示文案：保留 / 前缀，正文用 name 而非 id */
export { formatSkillTagLabel } from '@/lib/skills/format-tag-label';

/**
 * 生成 Sender slotConfig tag：界面展示中文 name，formatResult 序列化为 /id 供提交与 expand。
 */
export function toSkillTagSlot(summary: SkillSummary): SlotConfigType {
  skillTagKeyCounter += 1;
  const label = formatSkillTagLabel(summary);
  return {
    type: 'tag',
    key: `skill-tag-${summary.id}-${skillTagKeyCounter}`,
    props: {
      label,
      value: summary.id,
    },
    formatResult: () => `/${summary.id}`,
  };
}

/**
 * 选中 Suggestion 项后：在唤起菜单时记录的 `/关键词` 原位删掉并插入 tag。
 * 不调用 focus()（默认 cursor=end 会把插入点拽到末尾）；
 * 用 cursor + 失焦时保存的 lastSelection，把 tag 插回正文中间。
 * 不依赖 insert 的 replaceCharacters（Cascader 抢焦点时删字失败）。
 */
export function insertSkillTag(
  senderRef: RefObject<SenderRef | null>,
  summary: SkillSummary,
  pendingToken: SkillTokenAtCaret | null,
): void {
  const editable = senderRef.current?.inputElement ?? null;
  const needsSpace = pendingToken ? needsSpaceAfterSkillToken(pendingToken) : true;
  removeSkillTokenFromEditor(editable, pendingToken);

  const insertItems: SlotConfigType[] = [toSkillTagSlot(summary)];
  if (needsSpace) {
    insertItems.push({ type: 'text', value: ' ' });
  }

  senderRef.current?.insert(insertItems, 'cursor');
}

/**
 * Sender.Header 延后挂载：无 external store，subscribe 为空。
 * 配合 useSyncExternalStore，hydrate 后从服务端 snapshot 切到客户端 snapshot。
 */
export function subscribeSenderHeaderReady(): () => void {
  return () => {};
}

/** 客户端 snapshot：hydrate 完成后挂 Header */
export function getSenderHeaderReady(): boolean {
  return true;
}

/** 服务端 snapshot：SSR / hydrate 首帧不挂 Header，避免 CSSMotion forceRender 错位 */
export function getSenderHeaderReadyServer(): boolean {
  return false;
}

type SuggestionKeyDown = (event: KeyboardEvent) => void | false;

/**
 * 先交给 Suggestion 处理方向键/Escape/打开态 Enter，再拦住空格与关闭态 Enter 冒泡。
 * Suggestion 底层 Cascader 非 combobox，会把 Space/Enter 当打开下拉的控制键并 preventDefault，
 * 导致 Sender textarea 无法插入空格与换行；菜单打开时 Enter 仍须冒泡以便选中项。
 */
export function stopCascaderSwallowingInputKeys(
  event: KeyboardEvent,
  suggestionOpen: boolean,
  suggestionOnKeyDown: SuggestionKeyDown,
): void | false {
  const result = suggestionOnKeyDown(event);
  if (event.key === ' ' || (event.key === 'Enter' && !suggestionOpen)) {
    event.stopPropagation();
  }
  return result;
}

/** 是否为图片附件（按 mime，供预览卡片选型与 blob 预览） */
export function isImageAttachment(item: AttachmentItem): boolean {
  const type = item.type ?? item.originFileObj?.type;
  return type?.startsWith('image/') ?? false;
}

/** 释放附件上的 blob 预览 URL，避免滞留 object URL */
export function revokeBlobUrls(items: AttachmentItem[]) {
  for (const item of items) {
    const blobUrls = new Set<string>();
    if (item.url?.startsWith('blob:')) blobUrls.add(item.url);
    if (item.thumbUrl?.startsWith('blob:')) blobUrls.add(item.thumbUrl);
    for (const url of blobUrls) {
      URL.revokeObjectURL(url);
    }
  }
}

/**
 * 受控回传的 fileList 可能丢掉 originFileObj / blob，按 uid 从上一轮补回。
 */
export function mergeAttachmentFileList(
  fileList: AttachmentItem[],
  prevItems: AttachmentItem[],
): AttachmentItem[] {
  const prevByUid = new Map(prevItems.map((item) => [item.uid, item]));
  return fileList.map((item) => {
    const prev = prevByUid.get(item.uid);
    if (!prev) return item;
    return {
      ...item,
      originFileObj: item.originFileObj ?? prev.originFileObj,
      thumbUrl: item.thumbUrl ?? prev.thumbUrl,
      url: item.url ?? prev.url,
    };
  });
}

/**
 * 图片用原图 blob 作预览（避免 previewImage 压到约 200px），状态仍保留 originFileObj 供发送。
 * 同时释放已移除项的 blob URL。
 */
export function withPreviewUrls(
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

/** 按 uid 移除附件并释放其 blob 预览；列表空则收起 Header */
export function removeAttachmentItem(prev: AttachmentScope, uid: string): AttachmentScope {
  const removed = prev.items.filter((item) => item.uid === uid);
  revokeBlobUrls(removed);
  const items = prev.items.filter((item) => item.uid !== uid);
  return { items, open: items.length > 0 };
}

/** 从附件列表还原 FileList，供 sendMessage 转 FileUIPart */
export function createFileListFromAttachments(items: AttachmentItem[]): FileList | undefined {
  const dataTransfer = new DataTransfer();
  for (const item of items) {
    if (item.originFileObj) {
      dataTransfer.items.add(item.originFileObj);
    }
  }
  return dataTransfer.files.length > 0 ? dataTransfer.files : undefined;
}

/** 打开附件选择器（回形针与列表「+」共用） */
export function selectAttachments(ref: RefObject<AttachmentsRef | null>) {
  ref.current?.select({
    accept: ATTACHMENT_ACCEPT,
    multiple: true,
  });
}
