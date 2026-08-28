# 凡域

基于 **Next.js App Router + TypeScript + Vercel AI SDK + Ant Design X** 的 AI 对话应用。样式使用 CSS Modules 与 Ant Design（不使用 Tailwind）。

协作约定、分层规范与编码细则见 [AGENTS.md](./AGENTS.md)。

## 功能概览

- **流式对话**：Think 推理、联网搜索引用、停止生成；刷新后可还原思考过程与引用来源
- **双 Provider**：默认 DeepSeek 直连；可切火山方舟。识图与生图始终走方舟
- **模型路由**：按消息复杂度自动选择 `pro` / `lite` / `mini` 三档
- **工具**：文生图 / 改图、识图、DESIGN.md 落盘；Provider 侧 `web_search`
- **Skills**：品牌规范板、移动端 / Web 端设计；出图后可按需导出语义化 DESIGN.md
- **附件**：图片（png / jpeg / webp / gif）、PDF、txt / md、docx（最多 5 个，单文件 10MB）
- **主题**：浅色 / 深色 / 跟随系统，SSR 无闪白
- **会话持久化**：本地 SQLite（Drizzle + better-sqlite3），支持云盘镜像备份

## 技术栈

| 依赖                                                       | 版本      | 用途               |
| ---------------------------------------------------------- | --------- | ------------------ |
| Next.js                                                    | 16.x      | App Router         |
| React                                                      | 19.x      | UI 运行时          |
| Vercel AI SDK（`ai` / `@ai-sdk/react` / `@ai-sdk/openai`） | 7.x / 4.x | 流式对话、工具调用 |
| Ant Design X + Ant Design                                  | 2.x / 6.x | 对话 UI 与基础组件 |
| Drizzle + better-sqlite3                                   | —         | 会话与图片资产存储 |
| TypeScript、ESLint、Prettier、Husky、Commitlint            | —         | 工程化             |

## 环境要求

- Node.js 22+
- [pnpm](https://pnpm.io/)

## 快速开始

```bash
pnpm install
cp .env.example .env.local
```

在 `.env.local` 中填写密钥。完整列表与注释以 [`.env.example`](./.env.example) 为准；业务代码假定其中列出的变量已配置且非空。

默认对话 Provider 为 DeepSeek；**识图与生图无论主对话用哪家，都需要方舟**：

```env
CHAT_PROVIDER=deepseek

DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_BASE_URL=https://your-deepseek-base-url
# 可选：三档模型 ID（缺省均为 deepseek-v4-flash）
# DEEPSEEK_MODEL_PRO / DEEPSEEK_MODEL_LITE / DEEPSEEK_MODEL_MINI
# 可选：思考强度，默认 high
# DEEPSEEK_REASONING_EFFORT=high

# 识图 / 生图（CHAT_PROVIDER=deepseek 时也需要）
ARK_API_KEY=your-ark-api-key
ARK_BASE_URL=https://your-ark-base-url
ARK_MODEL_PRO=your-ark-model-pro
ARK_MODEL_LITE=your-ark-model-lite
ARK_MODEL_MINI=your-ark-model-mini

AMAP_WEB_KEY=your-amap-web-service-key
CHAT_STORE_DIR=./data/chats
CHAT_SYNC_REMOTE_DIR=/path/to/cloud-backup/chats
```

主对话切到方舟时设 `CHAT_PROVIDER=ark`，并同样填写 `ARK_*`。DeepSeek 三档模型 ID 可缺省；方舟三档必须配置。

启动开发服务：

```bash
pnpm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。有历史会话则进入最近一条，否则进入草稿欢迎态（`/chat`，不写库）；首条发送后进入 `/chat/[id]`。

## 常用命令

| 命令                   | 说明                         |
| ---------------------- | ---------------------------- |
| `pnpm run dev`         | 启动开发服务器               |
| `pnpm run build`       | 生产构建                     |
| `pnpm run start`       | 启动生产服务                 |
| `pnpm run lint`        | ESLint 检查                  |
| `pnpm run format`      | Prettier 格式化              |
| `pnpm run db:generate` | 根据 schema 生成迁移 SQL     |
| `pnpm run db:migrate`  | 用 CLI 将迁移应用到数据库    |
| `pnpm sync:chats:push` | 将会话数据镜像同步到云盘备份 |
| `pnpm sync:chats:pull` | 从云盘备份拉取并覆盖本地数据 |

## 数据库迁移

会话数据使用 Drizzle + SQLite（`CHAT_STORE_DIR/chats.db`）。**`db:generate` / `db:migrate` 不会随 `dev` / `build` 自动执行**，仅在改表结构或需要单独跑迁移时使用。

| 命令          | 何时需要                                                                        |
| ------------- | ------------------------------------------------------------------------------- |
| `db:generate` | 修改 `src/lib/db/schema.ts` 后，生成 `drizzle/` 下的新 SQL 与快照，并提交到 Git |
| `db:migrate`  | 不启动 Next.js、仅想先更新数据库时；或在 CI 中单独应用迁移                      |

日常开发不必每次启动前跑 `db:migrate`：应用首次访问数据库时会自动执行 `drizzle/` 中尚未应用的迁移（见 `src/lib/db/client.ts`）。

```bash
# 1. 修改 schema 后生成迁移
pnpm run db:generate

# 2. 检查 drizzle/ 下新生成的 .sql，确认无误后提交

# 3. 启动应用；首次读写会话时会自动 migrate
pnpm run dev
```

`db:generate` 与 `db:migrate` 均读取 `CHAT_STORE_DIR`（默认 `./data/chats`），请与 `.env.local` 保持一致，避免迁错库文件。

## 会话数据备份

会话 SQLite、图片与 DESIGN.md 默认落在项目内 `data/chats`（已 git 忽略）。云盘路径 `CHAT_SYNC_REMOTE_DIR` 仅作手动备份对端，不是运行时目录：

```bash
# 本地 → 云盘
pnpm sync:chats:push

# 云盘 → 本地（会覆盖本地 data/chats，需确认）
pnpm sync:chats:pull
pnpm sync:chats:pull -- --yes   # 跳过确认
```

同步前建议先关闭应用，避免 WAL 未 checkpoint 导致不一致。明文落盘 + 云盘同步不适合高敏感内容。

## 目录结构

```
src/
  app/                 # Next.js 路由壳（page / layout / route）
    api/               # 薄壳，转调 features/<域>/server
    chat/_components/  # 对话页 UI：ChatShell / ChatSidebar / Chat
  components/          # 全局通用 UI：theme / ModeSwitch / Providers
  features/            # 产品域：chat / images / docs / geo
  lib/                 # 基础设施与 Agent 能力：db / skills / tools / shared / theme
drizzle/               # SQL migrations
```

`app/` 只放框架入口；业务在 `features/`，skills / tools 在 `lib/`。细节见 [AGENTS.md](./AGENTS.md)。

## 对话与工具

主对话按 `CHAT_PROVIDER` 选择 DeepSeek 或方舟；工具调用完成后主模型会再汇总说明。

| 工具             | 作用                                                               |
| ---------------- | ------------------------------------------------------------------ |
| `generate_image` | 文生图（`generate`）与改图（`edit`），Provider 为方舟 Seedream     |
| `analyze_image`  | 识图：方舟视觉模型返回结构化描述，回喂主模型（主模型本身看不见图） |
| `save_design_md` | 将会话 DESIGN.md 落盘，对话里只展示下载卡片                        |
| `web_search`     | Provider 侧联网搜索；方舟可透传高德逆地理得到的近似位置            |

生图模型由 `resolveImageModelId` 按三级优先级决定：

1. **LLM 显式指定**（最高）— 用户在对话中要求的模型
2. **继承父图模型** — 多轮改图时沿用上一张图，保持风格一致
3. **当前生图模型** — `CURRENT_IMAGE_MODEL_ID`（[`src/features/images/image-spec.ts`](src/features/images/image-spec.ts)）

图片落盘于 `CHAT_STORE_DIR/images/{chatId}/`；前端经 `GET /api/images/[assetId]` 展示，不直接渲染上游 CDN URL。

## Skills

输入框 Suggestion 菜单或对话中的 `/<id>` 可调用用户面向 skill。知识库 skill（`userInvocable: false`）不进菜单，由意图匹配或伴随激活注入。

| Skill           | 说明                                         |
| --------------- | -------------------------------------------- |
| `brandkit`      | 品牌规范板、标志系统与视觉识别               |
| `mobile-design` | 移动端 App 界面概念图                        |
| `web-design`    | 网站 / 落地页设计参考图（一区块一图）        |
| `design-md`     | 知识库：出图后按需落盘 DESIGN.md，不直接出图 |

Discovery（目录）每轮常驻；Activation（完整指令）仅本轮按意图 / 令牌 / 伴随激活加载。新增 skill 的步骤见 [AGENTS.md](./AGENTS.md)「Skills 渐进披露与意图加载」。

## 提交规范

采用 [Conventional Commits](https://www.conventionalcommits.org/)，description 使用中文简体：

```text
feat(chat): 新增流式对话与停止生成
fix(api): 修复消息转换失败导致的 500
docs(readme): 更新本地启动说明
```

常用 type：`feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `chore` / `ci` / `build`。

commit-msg 由 commitlint 校验；pre-commit 通过 husky + lint-staged 对暂存文件执行 ESLint / Prettier。

## 开源协议

本项目采用 [MIT License](./LICENSE)。

## 相关文档

- [AGENTS.md](./AGENTS.md)
- [Next.js 文档](https://nextjs.org/docs)
- [Vercel AI SDK](https://ai-sdk.dev/docs)
- [Ant Design X](https://x.ant.design/docs/react/introduce)
