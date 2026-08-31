import { Image } from 'antd';
import FileCard from '@/components/FileCard';
import ChatImage, { CHAT_IMAGE_PREVIEW_GROUP_CLASS_NAMES } from '../../ChatImage';
import { USER_ATTACHMENT_IMAGE_SIZE } from './constants';
import styles from './UserAttachmentList.module.css';
import type { MessagePart } from '../utils';
import {
  bindUserFilePreview,
  getUserFileByteSize,
  getUserFileHref,
  getUserFileIcon,
  getUserFileKey,
  getUserFileName,
  getUserFileParts,
  isImageMediaType,
} from './utils';

export type UserAttachmentListProps = {
  parts: ReadonlyArray<MessagePart> | undefined;
};

export default function UserAttachmentList({ parts }: UserAttachmentListProps) {
  const fileParts = getUserFileParts(parts);
  if (fileParts.length === 0) return null;

  return (
    <div className={styles.list}>
      <Image.PreviewGroup classNames={CHAT_IMAGE_PREVIEW_GROUP_CLASS_NAMES}>
        {fileParts.map((part, index) => {
          const fileName = getUserFileName(part);
          const key = getUserFileKey(part, index);
          if (isImageMediaType(part.mediaType)) {
            return (
              <ChatImage
                key={key}
                src={part.url}
                size={USER_ATTACHMENT_IMAGE_SIZE}
                alt={fileName}
              />
            );
          }
          const href = getUserFileHref(part.url);
          return (
            <FileCard
              key={key}
              fileName={fileName}
              byteSize={getUserFileByteSize(part.url)}
              icon={getUserFileIcon(part.mediaType)}
              href={href}
              onPreview={bindUserFilePreview(fileName, part.mediaType, part.url)}
            />
          );
        })}
      </Image.PreviewGroup>
    </div>
  );
}
