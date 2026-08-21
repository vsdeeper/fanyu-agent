import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import Providers from '@/components/Providers';
import { THEME_RESOLVED_COOKIE_KEY } from '@/components/theme/constants';
import type { ResolvedThemeMode } from '@/components/theme/constants';
import './global.css';

export const metadata: Metadata = {
  title: 'FanyuAgent',
  description: 'Vercel AI SDK + Next.js + @ant-design/x',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 服务端无法读 localStorage，从 cookie 取「解析后主题」作为 SSR 初始 antd 主题，
  // 避免深色模式刷新时 antd 先输出浅色 CSS 造成整页浅→深 FOUC
  const cookieStore = await cookies();
  const resolvedCookie = cookieStore.get(THEME_RESOLVED_COOKIE_KEY)?.value;
  const ssrInitialMode: ResolvedThemeMode | undefined =
    resolvedCookie === 'light' || resolvedCookie === 'dark' ? resolvedCookie : undefined;

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 预挂载设主题：避免首帧浅色闪烁；键值与 theme/constants.ts 同步（脚本无法 import）。'system'（或缺失/非法）用 matchMedia 解析为 light|dark 再写 data-theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('one-theme');if(m!=='light'&&m!=='dark'&&m!=='system'){m='system';}if(m==='system'){m=(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}var d=document.documentElement;d.dataset.theme=m;d.style.colorScheme=m;}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <AntdRegistry>
          <Providers ssrInitialMode={ssrInitialMode}>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
