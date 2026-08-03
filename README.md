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

| 命令                   | 说明                          |
| ---------------------- | ----------------------------- |
| `pnpm run dev`         | 启动开发服务器                |
| `pnpm run build`       | 生产构建                      |
| `pnpm run start`       | 启动生产服务                  |
| `pnpm run lint`        | ESLint 检查                   |
| `pnpm run format`      | Prettier 格式化               |
| `pnpm run db:generate` | 根据 schema 生成迁移 SQL 文件 |
| `pnpm run db:migrate`  | 用 CLI 将迁移应用到数据库     |

## 数据库迁移

会话数据使用 Drizzle + SQLite（`CHAT_STORE_DIR/chats.db`，见 `.env.example`）。**这两个命令不会随 `dev` / `build` 自动执行**，仅在改表结构或需要单独跑迁移时使用。

### 何时执行

| 命令          | 何时需要                                                                        |
| ------------- | ------------------------------------------------------------------------------- |
| `db:generate` | 修改 `src/lib/db/schema.ts` 后，生成 `drizzle/` 下的新 SQL 与快照，并提交到 Git |
| `db:migrate`  | 不启动 Next.js、仅想先更新数据库时；或在 CI 中单独应用迁移                      |

日常开发**不必**每次启动前跑 `db:migrate`：应用首次访问数据库时会自动执行 `drizzle/` 中尚未应用的迁移（见 `src/lib/db/client.ts`）。

### 典型工作流

```bash
# 1. 修改 src/lib/db/schema.ts 后生成迁移
pnpm run db:generate

# 2. 检查 drizzle/ 下新生成的 .sql，确认无误后提交

# 3. 启动应用；首次读写会话时会自动 migrate
pnpm run dev
```

若需手动应用迁移（可选）：

```bash
pnpm run db:migrate
```

`db:generate` 与 `db:migrate` 均读取 `CHAT_STORE_DIR`（未配置时与运行时相同，默认为 `D:/华为云盘/ai-agent/chats`），请保证与 `.env.local` 一致，避免迁错库文件。

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

## 待办

- [ ] 接入 DeepSeek 直连模型
- [ ] 增加知识库功能：AI 回答可添加入库，入库内容可编辑
- [ ] 引用源展示交互改造
- [ ] 图片生成增强：接入 Flux Art 国外模型
- [ ] 个性化主题定制

## 相关文档

- [Next.js 文档](https://nextjs.org/docs)
- [Vercel AI SDK](https://ai-sdk.dev/docs)
- [Ant Design X](https://x.ant.design/docs/react/introduce)
- [Vercel 部署指南](https://nextjs.org/docs/app/building-your-application/deploying)
