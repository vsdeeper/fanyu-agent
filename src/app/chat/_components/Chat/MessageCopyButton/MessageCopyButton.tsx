import { CopyOutlined } from '@ant-design/icons';
import { App, Button, Tooltip } from 'antd';
import styles from './MessageCopyButton.module.css';

export type MessageCopyButtonProps = {
  text: string;
};

/** 消息正文复制：icon 按钮，写入剪贴板并 toast 结果。 */
export default function MessageCopyButton({ text }: MessageCopyButtonProps) {
  const { message } = App.useApp();
  const copyable = text.trim();

  if (!copyable) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyable);
      message.success('已复制');
    } catch {
      message.error('复制失败');
    }
  }

  return (
    <Tooltip title="复制">
      <Button
        className={styles.button}
        type="text"
        shape="circle"
        icon={<CopyOutlined />}
        aria-label="复制"
        onClick={() => {
          void handleCopy();
        }}
      />
    </Tooltip>
  );
}
