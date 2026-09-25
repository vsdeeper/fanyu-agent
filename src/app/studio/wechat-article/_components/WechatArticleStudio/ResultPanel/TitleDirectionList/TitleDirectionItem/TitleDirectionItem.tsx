import StudioCard from '@/app/studio/_components/StudioCard';

type TitleDirectionItemProps = {
  value: string;
  selected: boolean;
  onSelect: () => void;
  onSave: (value: string) => void;
};

/** 单条标题方向：Card 点选；标题在内容区，编辑态可取消/保存。 */
export default function TitleDirectionItem({
  value,
  selected,
  onSelect,
  onSave,
}: TitleDirectionItemProps) {
  return (
    <StudioCard
      selected={selected}
      interactive
      onClick={onSelect}
      editable
      value={value}
      onSave={onSave}
    />
  );
}
