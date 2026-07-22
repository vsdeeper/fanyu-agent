# AI Agent

基于 **Next.js App Router + TypeScript + Vercel AI SDK + @ant-design/x** 的 AI 对话前端脚手架。样式使用 CSS Modules 与 Ant Design。

## 技术栈

- [Next.js](https://nextjs.org/) 16（App Router）
- [Vercel AI SDK](https://ai-sdk.dev/)（`ai` / `@ai-sdk/react` / `@ai-sdk/openai`）
- [@ant-design/x](https://x.ant.design/) + [Ant Design](https://ant.design/)
- TypeScript、ESLint、Prettier、Husky、Commitlint

## 环境要求

- Node.js 22+
- pnpm

## 快速开始

```bash
pnpm install
cp .env.example .env.local
```

在 `.env.local` 中填入 OpenAI API Key：

```env
OPENAI_API_KEY=sk-xxxxxxxx
# 可选：OpenAI 兼容接口
# OPENAI_BASE_URL=https://api.openai.com/v1
```

启动开发服务：

```bash
pnpm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

## 常用命令

| 命令              | 说明            |
| ----------------- | --------------- |
| `pnpm run dev`    | 启动开发服务器  |
| `pnpm run build`  | 生产构建        |
| `pnpm run start`  | 启动生产服务    |
| `pnpm run lint`   | ESLint 检查     |
| `pnpm run format` | Prettier 格式化 |

## 目录结构

```
src/
  app/
    api/chat/route.ts   # 流式对话 API（streamText）
    layout.tsx          # AntdRegistry + Providers
    page.tsx            # 首页
  components/
    Providers.tsx       # ConfigProvider + XProvider
    Chat.tsx            # 对话 UI（useChat + Bubble / Sender）
```

## 提交规范

采用 [Conventional Commits](https://www.conventionalcommits.org/)，description 使用中文简体：

```text
feat(chat): 新增流式对话与停止生成
fix(api): 修复消息转换失败导致的 500
docs(readme): 更新本地启动说明
```

更多协作约定见 [AGENTS.md](./AGENTS.md)。

## 相关文档

- [Next.js 文档](https://nextjs.org/docs)
- [Vercel AI SDK](https://ai-sdk.dev/docs)
- [Ant Design X](https://x.ant.design/docs/react/introduce)
- [Vercel 部署指南](https://nextjs.org/docs/app/building-your-application/deploying)
