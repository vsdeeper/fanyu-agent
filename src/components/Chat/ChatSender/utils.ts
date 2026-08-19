import type { KeyboardEvent, RefObject } from 'react';
import type { AttachmentsProps, AttachmentsRef } from '@ant-design/x/es/attachments';
import type { SlotConfigType, SenderRef } from '@ant-design/x/es/sender/interface';
import type { SuggestionItem } from '@ant-design/x/es/suggestion';
import type { GetProp } from 'antd';
import { getSkill } from '@/lib/skills/registry';
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

// 修复：id 用 [a-z0-9-]* 而非 [^\s]*，避免把令牌后紧跟的中文/标点吞进 id（如「/brandkit用暖色」只匹配 /brandkit）。
const SKILL_TOKEN_RE = /(^|\s)\/([a-z0-9-]*)/g;

type SkillTokenSpan = {
  slashPos: number;
  tokenEnd: number;
};

/** 已补全令牌：注册表有 id，且后接空白、结尾或下一个 `/` */
function isCompleteSkillToken(id: string, next: string | undefined): boolean {
  return id.length > 0 && !!getSkill(id) && (!next || /\s/.test(next) || next === '/');
}

/**
 * 取文本里最后一个未完成的 / 令牌（行首或空格后），供唤起菜单与原位替换。
 */
export function findLastIncompleteSkillToken(text: string): SkillTokenSpan | null {
  let last: SkillTokenSpan | null = null;
  for (const match of text.matchAll(SKILL_TOKEN_RE)) {
    const id = match[2] ?? '';
    const matchStart = match.index ?? 0;
    const boundary = match[1] ?? '';
    const slashPos = matchStart + boundary.length;
    const tokenEnd = slashPos + 1 + id.length;
    if (!isCompleteSkillToken(id, text[tokenEnd])) {
      last = { slashPos, tokenEnd };
    }
  }
  return last;
}

/**
 * 是否含「可唤起菜单」的 / 令牌：行首或空格后的 /（前面紧贴普通文字的 / 不算）。
 * 已补全的完整 skill 令牌不再触发。
 */
export function hasSkillToken(value: string): boolean {
  return findLastIncompleteSkillToken(value) !== null;
}

/**
 * 根据本次输入字符决定是否打开 Suggestion：空格只关菜单，其余看 hasSkillToken。
 */
export function shouldOpenSkillSuggestion(
  value: string,
  inputData: string | null | undefined,
): boolean {
  if (inputData === ' ') return false;
  return hasSkillToken(value);
}

/**
 * 替换未完成令牌后是否须在 tag 后补空格：后续无内容或非空白开头时补。
 */
export function needsSpaceAfterLastSkillToken(input: string): boolean {
  const token = findLastIncompleteSkillToken(input);
  if (!token) return true;
  const afterRaw = input.slice(token.tokenEnd);
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
 * 从 contenteditable 里最后一个未完成 / 令牌处删掉该令牌（可在正文中间）。
 * 只删 `/xxx`，令牌前用户已输入的空格原样保留。
 */
export function removeIncompleteSkillTokenFromEditor(editable: HTMLElement | null): boolean {
  if (!editable) return false;

  const textNodes = collectEditableTextNodes(editable);
  for (let i = textNodes.length - 1; i >= 0; i--) {
    const node = textNodes[i];
    const text = node.textContent ?? '';
    if (!text) continue;

    const token = findLastIncompleteSkillToken(text);
    if (!token) continue;

    node.deleteData(token.slashPos, token.tokenEnd - token.slashPos);

    if (!node.textContent) {
      node.remove();
    }
    return true;
  }
  return false;
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
 * 选中 Suggestion 项后：在未完成 / 令牌原位删掉令牌并插入 tag。
 * 不调用 focus()（默认 cursor=end 会把插入点拽到末尾）；
 * 用 cursor + 失焦时保存的 lastSelection，把 tag 插回正文中间。
 * 不依赖 insert 的 replaceCharacters（Cascader 抢焦点时删字失败）。
 */
export function insertSkillTag(
  senderRef: RefObject<SenderRef | null>,
  summary: SkillSummary,
  currentValue: string,
): void {
  const editable = senderRef.current?.inputElement ?? null;
  removeIncompleteSkillTokenFromEditor(editable);

  const insertItems: SlotConfigType[] = [toSkillTagSlot(summary)];
  if (needsSpaceAfterLastSkillToken(currentValue)) {
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
