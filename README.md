# 凡域

基于 **Next.js App Router + TypeScript + Vercel AI SDK + @ant-design/x** 的 AI 对话应用。样式使用 CSS Modules 与 Ant Design（不使用 Tailwind）。

- 流式对话、停止生成、会话侧栏与浅色 / 深色 / 跟随系统主题
- Skills：品牌规范板、移动端 / Web 端设计；按需落盘 `DESIGN.md`
- 文生图 / 改图（方舟 Seedream；Flux 为二期接入）
- 会话、图片与文档落盘（SQLite + 本地文件）

协作约定与分层规范见 [AGENTS.md](./AGENTS.md)。

## 技术栈

- [Next.js](https://nextjs.org/) 16（App Router）
- [Vercel AI SDK](https://ai-sdk.dev/)（`ai` / `@ai-sdk/react` / `@ai-sdk/openai`）
- [@ant-design/x](https://x.ant.design/) + [Ant Design](https://ant.design/)
- Drizzle + better-sqlite3
- TypeScript、ESLint、Prettier、Husky、Commitlint

## 环境要求

- Node.js 22+
- pnpm

## 快速开始

```bash
pnpm install
cp .env.example .env.local
```

在 `.env.local` 中填写密钥（完整列表与注释见 `.env.example`）。默认对话 Provider 为 DeepSeek；识图与生图仍需方舟：

```env
CHAT_PROVIDER=deepseek

DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_BASE_URL=https://your-deepseek-base-url

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

主对话切到方舟时设 `CHAT_PROVIDER=ark`，并同样填写 `ARK_*`。DeepSeek 三档模型 ID 可缺省（代码默认 `deepseek-v4-flash`）；方舟三档须配置。

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
| `pnpm sync:chats:push` | 将会话数据镜像同步到云盘备份  |
| `pnpm sync:chats:pull` | 从云盘备份拉取并覆盖本地数据  |

## 数据库迁移

会话数据使用 Drizzle + SQLite（`CHAT_STORE_DIR/chats.db`，见 `.env.example`）。**这两个命令不会随** `dev` **/** `build` **自动执行**，仅在改表结构或需要单独跑迁移时使用。

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

`db:generate` 与 `db:migrate` 均读取 `CHAT_STORE_DIR`（见 `.env.example`，默认为 `./data/chats`），请保证与 `.env.local` 一致，避免迁错库文件。

## 会话数据备份

会话 SQLite 与图片默认落在项目内 `data/chats`（已 git 忽略）。云盘路径 `CHAT_SYNC_REMOTE_DIR` 仅作手动备份对端：

```bash
# 本地 → 云盘
pnpm sync:chats:push

# 云盘 → 本地（会覆盖本地 data/chats，需确认）
pnpm sync:chats:pull
pnpm sync:chats:pull -- --yes   # 跳过确认
```

同步前建议先关闭应用，避免 WAL 文件未 checkpoint 导致不一致。明文落盘 + 云盘同步不适合高敏感内容。

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

## 生图功能

`generate_image` 工具支持文生图（`generate`）和改图（`edit`）。模型由 `resolveImageModelId` 按三级优先级决定：

1. **LLM 显式指定**（最高优先级）— 用户在对话中要求的模型
2. **继承父图模型** — 多轮改图时沿用上一张图所用模型，保持风格一致
3. **当前生图模型** — `CURRENT_IMAGE_MODEL_ID`（[`src/features/images/size.ts`](src/features/images/size.ts)）

首版生图 Provider 为方舟 Seedream；Flux Art 仅注册接口，二期接入。

### 对话示例

**不指定模型，走默认：**

```
用户：帮我画一只猫
LLM → generate_image({ mode: "generate", prompt: "一只可爱的橘猫" })
      ↑ 未传 model → resolveImageModelId 返回默认 Seedream
```

**用户指定模型：**

```
用户：用 Flux 画一只猫
LLM → generate_image({ mode: "generate", prompt: "一只可爱的橘猫", model: "flux-kontext-pro" })
      ↑ model 已传 → resolveImageModelId 直接返回 "flux-kontext-pro"
```

**多轮改图，自动继承父图模型：**

```
第 1 轮：
用户：用 Flux 画一只猫
LLM → generate_image({ mode: "generate", prompt: "猫", model: "flux-kontext-pro" })
结果：assetId="abc123"，modelId="flux-kontext-pro"

第 2 轮：
用户：把猫改成黑色
LLM → generate_image({ mode: "edit", prompt: "把猫改成黑色", sourceAssetIds: ["abc123"] })
      ↑ 未传 model，但 parentId="abc123"
        → resolveParentModelId 读到 "flux-kontext-pro"
        → 自动沿用，不会跳回 Seedream
```

## 提交规范

采用 [Conventional Commits](https://www.conventionalcommits.org/)，description 使用中文简体：

```text
feat(chat): 新增流式对话与停止生成
fix(api): 修复消息转换失败导致的 500
docs(readme): 更新本地启动说明
```

commit-msg 由 commitlint 校验；pre-commit 通过 husky + lint-staged 对暂存文件执行 ESLint / Prettier。

## 相关文档

- [AGENTS.md](./AGENTS.md) — 分层、Skills、主题与编码约定
- [Next.js 文档](https://nextjs.org/docs)
- [Vercel AI SDK](https://ai-sdk.dev/docs)
- [Ant Design X](https://x.ant.design/docs/react/introduce)
