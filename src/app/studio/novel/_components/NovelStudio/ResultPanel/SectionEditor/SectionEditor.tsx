import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useState } from 'react';
import { ADD_SECTION_BUTTON } from '../../constants';
import type { NovelSection } from '../../types';
import SectionCard from './SectionCard';
import styles from './SectionEditor.module.css';
import { createSectionDraft, shortSectionId } from './utils';

type SectionEditorProps = {
  sections: NovelSection[];
  onChange: (next: NovelSection[]) => void;
};

/** 通用两级章节编辑器：世界观设定与创作方案共用，默认只读，点编辑后取消或保存。 */
export default function SectionEditor({ sections, onChange }: SectionEditorProps) {
  const [pendingId, setPendingId] = useState<string>();

  function saveSection(next: NovelSection) {
    onChange(sections.map((section) => (section.id === next.id ? next : section)));
  }

  function removeSection(sectionId: string) {
    if (sections.length <= 1) return;
    onChange(sections.filter((section) => section.id !== sectionId));
  }

  function addSection() {
    if (pendingId) return;
    setPendingId(shortSectionId('sec'));
  }

  return (
    <div className={styles.section}>
      <div className={styles.list}>
        {sections.map((section, index) => (
          <SectionCard
            key={section.id}
            section={section}
            index={index}
            onSave={saveSection}
            onDelete={sections.length > 1 ? () => removeSection(section.id) : undefined}
          />
        ))}
        {pendingId ? (
          <SectionCard
            key={pendingId}
            section={{ id: pendingId, ...createSectionDraft() }}
            index={sections.length}
            pending
            onSave={(next) => {
              onChange([...sections, next]);
              setPendingId(undefined);
            }}
            onCancelPending={() => setPendingId(undefined)}
          />
        ) : null}
      </div>
      <Button
        color="primary"
        variant="dashed"
        icon={<PlusOutlined />}
        disabled={Boolean(pendingId)}
        onClick={addSection}
      >
        {ADD_SECTION_BUTTON}
      </Button>
    </div>
  );
}
