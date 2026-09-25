import StudioCard from '@/app/studio/_components/StudioCard';
import { BEAT_DELETE_CONFIRM_TITLE } from '../../../constants';

type BeatItemProps = {
  index: number;
  value: string;
  /** 是否可删除；仅剩一条要点时由列表置 false。 */
  removable: boolean;
  onSave: (value: string) => void;
  onRemove: () => void;
};

/** 单条写作要点：Card 纯文本展示，编辑态可取消/保存，删除需二次确认。 */
export default function BeatItem({ index, value, removable, onSave, onRemove }: BeatItemProps) {
  return (
    <StudioCard
      editable
      index={index + 1}
      value={value}
      onSave={onSave}
      removable={removable}
      onRemove={onRemove}
      deleteConfirmTitle={BEAT_DELETE_CONFIRM_TITLE}
    />
  );
}
