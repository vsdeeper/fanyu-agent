import type { AttachmentItem } from '../utils';
import { isImageAttachment } from '../utils';

export type PreviewCardModel = {
  uid: string;
  name: string;
  byte: number | undefined;
  src: string | undefined;
  cardType: 'image' | 'file';
};

/** 把附件项收成 FileCard 可直接消费的字段，避免把 mime type 传到卡片 type */
export function toPreviewCardModel(item: AttachmentItem): PreviewCardModel {
  return {
    uid: item.uid,
    name: item.name ?? '',
    byte: item.size,
    src: item.thumbUrl ?? item.url,
    cardType: isImageAttachment(item) ? 'image' : 'file',
  };
}
