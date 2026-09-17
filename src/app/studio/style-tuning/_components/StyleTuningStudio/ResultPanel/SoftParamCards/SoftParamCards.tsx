import { useState } from 'react';
import { EditOutlined } from '@ant-design/icons';
import { Button, Input } from 'antd';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
import '@/lib/theme/XMarkdownTheme.css';
import type { StyleTuningSoftParams } from '@/app/api/studio/style-tuning/_shared/types';
import { useThemeMode } from '@/components/theme';
import { SOFT_PARAM_FIELDS } from '../../constants';
import type { SoftParamFieldKey } from '../../types';
import { resolveSoftParamDisplayBodies } from '../../utils';
import { CANCEL_BUTTON, EDIT_BUTTON, SAVE_BUTTON } from './constants';
import styles from './SoftParamCards.module.css';

type SoftParamCardsProps = {
  streamText: string;
  softParams: StyleTuningSoftParams;
  onSave: (key: SoftParamFieldKey, value: string) => void | Promise<void>;
  onEditingChange?: (editing: boolean) => void;
};

/**
 * 六维软参数分区：只读优先用流式 Markdown 正文；逐段编辑，编辑态为取消/保存。
 * 须由父级在主题 hydrated 后再挂载（XMarkdown 不能安全 SSR）。
 */
export default function SoftParamCards({
  streamText,
  softParams,
  onSave,
  onEditingChange,
}: SoftParamCardsProps) {
  const { mode } = useThemeMode();
  const [editingKey, setEditingKey] = useState<SoftParamFieldKey | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const displayBodies = resolveSoftParamDisplayBodies(streamText, softParams);

  function startEdit(key: SoftParamFieldKey) {
    setEditingKey(key);
    setDraft(displayBodies[key]);
    onEditingChange?.(true);
  }

  function cancelEdit() {
    setEditingKey(null);
    setDraft('');
    setSaving(false);
    onEditingChange?.(false);
  }

  async function saveEdit(key: SoftParamFieldKey) {
    const next = draft.trim();
    if (!next) return;
    setSaving(true);
    try {
      await onSave(key, next);
      setEditingKey(null);
      setDraft('');
      onEditingChange?.(false);
    } finally {
      setSaving(false);
    }
  }

  function renderActions(key: SoftParamFieldKey) {
    if (editingKey === key) {
      return (
        <span className={styles.actions}>
          <Button type="link" size="small" disabled={saving} onClick={cancelEdit}>
            {CANCEL_BUTTON}
          </Button>
          <Button
            type="link"
            size="small"
            disabled={!draft.trim() || saving}
            loading={saving}
            onClick={() => void saveEdit(key)}
          >
            {SAVE_BUTTON}
          </Button>
        </span>
      );
    }
    if (editingKey) return null;
    return (
      <span className={styles.actions}>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => startEdit(key)}>
          {EDIT_BUTTON}
        </Button>
      </span>
    );
  }

  const markdownClass = `${mode === 'dark' ? 'x-markdown-dark' : 'x-markdown-light'} ${styles.markdown}`;

  return (
    <div className={styles.list}>
      {SOFT_PARAM_FIELDS.map((field) => {
        const value = displayBodies[field.key];
        const editing = editingKey === field.key;
        return (
          <section key={field.key}>
            <div className={styles.sectionHead}>
              <h3 className={styles.title}>{field.label}</h3>
              {renderActions(field.key)}
            </div>
            {editing ? (
              <Input.TextArea
                className={styles.editor}
                value={draft}
                autoSize={{ minRows: 4, maxRows: 16 }}
                disabled={saving}
                onChange={(event) => setDraft(event.target.value)}
              />
            ) : (
              <XMarkdown
                className={markdownClass}
                content={value}
                paragraphTag="div"
                openLinksInNewTab
                escapeRawHtml
              />
            )}
          </section>
        );
      })}
    </div>
  );
}
