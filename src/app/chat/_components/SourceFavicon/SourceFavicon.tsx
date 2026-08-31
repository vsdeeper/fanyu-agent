import { useState } from 'react';
import { GlobalOutlined } from '@ant-design/icons';
import { DEFAULT_SIZE } from './constants';
import styles from './SourceFavicon.module.css';
import { getHostname } from './utils';

export type SourceFaviconProps = {
  url: string;
  /** 像素边长，默认 16 */
  size?: number;
  /** 圆形裁切，用于来源条堆叠与侧栏卡片 */
  circle?: boolean;
};

/** 用域名推导 favicon（ico.n3v.cn；模型不返回图标 URL） */
export default function SourceFavicon({ url, size = DEFAULT_SIZE, circle }: SourceFaviconProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = failedUrl === url;
  const host = getHostname(url)?.replace(/^www\./, '') ?? null;

  const fallback = (
    <GlobalOutlined className={styles.fallback} style={{ fontSize: Math.max(10, size - 4) }} />
  );

  const inner =
    !host || failed ? (
      fallback
    ) : (
      // eslint-disable-next-line @next/next/no-img-element -- 第三方 favicon 服务，无需 next/image
      <img
        className={circle ? styles.circleImg : styles.favicon}
        src={`https://ico.n3v.cn/get.php?url=${encodeURIComponent(host)}`}
        alt=""
        width={size}
        height={size}
        onError={() => setFailedUrl(url)}
      />
    );

  if (!circle) return inner;

  return (
    <span className={styles.circle} style={{ width: size, height: size }}>
      {inner}
    </span>
  );
}
