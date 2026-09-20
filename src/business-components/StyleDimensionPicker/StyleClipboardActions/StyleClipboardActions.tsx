import { useRef, useState } from 'react';
import { App, Button, Popconfirm } from 'antd';
import type { StyleDimensionSelections } from '../types';
import { hasStyleSelection, parseStylePayload, serializeStyleSelections } from '../utils';
import {
  COPY_BUTTON,
  COPY_EMPTY_WARNING,
  COPY_FAILED,
  COPY_SUCCESS,
  PASTE_BUTTON,
  PASTE_CONFIRM_CANCEL,
  PASTE_CONFIRM_DESCRIPTION,
  PASTE_CONFIRM_OK,
  PASTE_CONFIRM_TITLE,
  PASTE_EMPTY_WARNING,
  PASTE_FAILED,
  PASTE_SUCCESS,
  STYLE_PAYLOAD_ERROR_MESSAGE,
} from './constants';
import styles from './StyleClipboardActions.module.css';

export type StyleClipboardActionsProps = {
  selections: StyleDimensionSelections;
  disabled?: boolean;
  /** 由挂载方给对齐方式（组件本身不写定位）。 */
  className?: string;
  /** 校验通过的粘贴结果，调用方整份替换当前选择。 */
  onPaste: (selections: StyleDimensionSelections) => void;
};

/**
 * 文风复制 / 粘贴：复制当前选择为 JSON，粘贴到别的任务复现同一套文风。
 *
 * 剪贴板数据先严格校验再弹确认框——校验不过就没有「覆盖」这回事，
 * 不能先问一句再报错。校验通过才确认，因为粘贴会整份替换本任务已选的文风。
 *
 * 挂载位置必须避开 Form.Item 的 label：`<button>` 是 labelable 元素，
 * 放进 `<label>` 会让 label 隐式关联到第一个按钮，于是 hover 标签行会把它也
 * 染上 hover 态，点标签文字或另一个按钮也会连带触发它。
 */
export default function StyleClipboardActions({
  selections,
  disabled,
  className,
  onPaste,
}: StyleClipboardActionsProps) {
  const { message } = App.useApp();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reading, setReading] = useState(false);
  /** 已校验通过、等待确认的粘贴内容；取消或关闭确认框时清空。 */
  const pendingRef = useRef<StyleDimensionSelections | null>(null);

  async function handleCopy() {
    if (!hasStyleSelection(selections)) {
      message.warning(COPY_EMPTY_WARNING);
      return;
    }
    try {
      await navigator.clipboard.writeText(serializeStyleSelections(selections));
      message.success(COPY_SUCCESS);
    } catch {
      message.error(COPY_FAILED);
    }
  }

  async function handlePasteClick() {
    setReading(true);
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        message.warning(PASTE_EMPTY_WARNING);
        return;
      }
      const parsed = parseStylePayload(text);
      if (!parsed.ok) {
        message.error(STYLE_PAYLOAD_ERROR_MESSAGE[parsed.error]);
        return;
      }
      pendingRef.current = parsed.selections;
      setConfirmOpen(true);
    } catch {
      message.error(PASTE_FAILED);
    } finally {
      setReading(false);
    }
  }

  function closeConfirm() {
    pendingRef.current = null;
    setConfirmOpen(false);
  }

  function handleConfirm() {
    const next = pendingRef.current;
    closeConfirm();
    if (!next) return;
    onPaste(next);
    message.success(PASTE_SUCCESS);
  }

  return (
    <span className={className ? `${styles.actions} ${className}` : styles.actions}>
      <Button type="link" size="small" disabled={disabled} onClick={handleCopy}>
        {COPY_BUTTON}
      </Button>
      <Popconfirm
        open={confirmOpen}
        title={PASTE_CONFIRM_TITLE}
        description={PASTE_CONFIRM_DESCRIPTION}
        okText={PASTE_CONFIRM_OK}
        cancelText={PASTE_CONFIRM_CANCEL}
        onConfirm={handleConfirm}
        // 只认关闭：打开一律由 handlePasteClick 校验通过后自己置位，
        // 否则点按钮就会先弹出确认框，再在校验失败时尴尬地收回去。
        onOpenChange={(next) => {
          if (!next) closeConfirm();
        }}
      >
        <Button
          type="link"
          size="small"
          loading={reading}
          disabled={disabled}
          onClick={handlePasteClick}
        >
          {PASTE_BUTTON}
        </Button>
      </Popconfirm>
    </span>
  );
}
