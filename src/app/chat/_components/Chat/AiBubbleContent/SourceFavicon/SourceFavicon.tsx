import { useState } from 'react';
import { GlobalOutlined } from '@ant-design/icons';
import styles from './SourceFavicon.module.css';
import { getHostname } from './utils';

export type SourceFaviconProps = {
  url: string;
};

/** 用域名推导 favicon（ico.n3v.cn；模型不返回图标 URL） */
export default function SourceFavicon({ url }: SourceFaviconProps) {
  const [failed, setFailed] = useState(false);
  const host = getHostname(url)?.replace(/^www\./, '') ?? null;

  if (!host || failed) {
    return <GlobalOutlined className={styles.fallback} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- 第三方 favicon 服务，无需 next/image
    <img
      className={styles.favicon}
      src={`https://ico.n3v.cn/get.php?url=${encodeURIComponent(host)}`}
      alt=""
      width={16}
      height={16}
      onError={() => setFailed(true)}
    />
  );
}
