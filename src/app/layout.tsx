import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import Providers from '@/components/Providers';
import './global.css';

export const metadata: Metadata = {
  title: 'OneAgent',
  description: 'Vercel AI SDK + Next.js + @ant-design/x',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 预挂载设主题：避免首帧浅色闪烁；键值与 theme/constants.ts 同步（脚本无法 import） */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('one-theme');if(m!=='light'&&m!=='dark'){m=(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}var d=document.documentElement;d.dataset.theme=m;d.style.colorScheme=m;}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <AntdRegistry>
          <Providers>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
