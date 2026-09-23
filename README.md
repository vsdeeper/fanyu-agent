# 凡域

基于 **Next.js App Router + TypeScript + Vercel AI SDK + Ant Design X** 的 AI 对话与工作室应用。样式使用 CSS Modules / Ant Design（**不使用 Tailwind**）。

协作约定与分层细则见 [AGENTS.md](./AGENTS.md)。

## 功能

- **流式对话**：Think、联网引用、停止生成；刷新可还原思考与来源
- **多 Provider**：DeepSeek（默认）/ 火山方舟 / 智谱；按消息复杂度路由 `pro` / `lite` / `mini`
- **工具**：文生图与改图、DESIGN.md 落盘、联网搜索
- **工作室**：产品精修、商业分析、产品模特、电商设计、公众号
- **Skills**：品牌规范板、移动端 / Web 设计；出图后可导出 DESIGN.md
- **附件**：图片、PDF、txt / md、docx（最多 10 个，单文件 10MB）
- **主题**：浅色 / 深色 / 跟随系统（SSR 无闪白）
- **持久化**：本地 SQLite + 可选云盘镜像

## 技术栈

| 依赖 | 版本 | 用途 |
| ---- | ---- | ---- |
| Next.js | 16.x | App Router |
| React | 19.x | UI |
| Vercel AI SDK（`ai` / `@ai-sdk/react` / `@ai-sdk/openai`） | 7.x / 4.x | 流式对话、工具 |
| Ant Design X + Ant Design | 2.x / 6.x | 对话 UI / 基础组件 |
| Drizzle + better-sqlite3 | — | 会话与资产存储 |
| TypeScript、ESLint、Prettier、Vitest、Husky、Commitlint | — | 工程化 |

## 快速开始

需要 **Node.js 22+** 与 [pnpm](https://pnpm.io/)。

```bash
pnpm install
cp .env.example .env.local
# 按 .env.example 注释填写密钥（所列变量须非空；IMAGE_MODEL_ID 可留空）
pnpm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。有历史则进最近会话，否则进入草稿 `/chat`；首条发送后进入 `/chat/[id]`。工作室入口在 `/studio`。

**环境变量要点**（完整列表以 [`.env.example`](./.env.example) 为准）：

| 变量 | 说明 |
| ---- | ---- |
| `CHAT_PROVIDER` | `deepseek`（默认）/ `ark` / `zhipu` |
| `DEEPSEEK_*` / `ARK_*` / `ZHIPU_*` | 对应 Provider 的 Key、Base URL、三档模型 ID |
| `LAOZHANG_*` | 生图默认走老张；选用 Seedream 时另需 `ARK_*` |
| `IMAGE_MODEL_ID` | 可选；设置则生图绝对优先该模型，留空由主模型自选 |
| `AMAP_WEB_KEY` | 高德 Web 服务（逆地理等） |
| `CHAT_STORE_DIR` | 会话资产目录（默认 `./data/chats`） |
| `CHAT_SYNC_REMOTE_DIR` | 云盘备份对端（应指向 `.../chats`） |

说明：

- DeepSeek / 智谱主对话的联网搜索走本地 `web_search` → 智谱 API，故即使用 DeepSeek 也须配置 `ZHIPU_*`
- `db:generate` / `db:migrate` / `db:checkpoint` / `sync:data:*` 会读 `.env.local`（drizzle-kit 经 `loadEnvLocal`，不依赖 Next 自动注入）

## 常用命令

| 命令 | 说明 |
| ---- | ---- |
| `pnpm run dev` / `build` / `start` | 开发 / 构建 / 生产 |
| `pnpm run lint` / `format` / `test` | ESLint / Prettier / Vitest |
| `pnpm run db:generate` | 对照 `schema.ts` 生成 `drizzle/` 迁移 SQL（不改库） |
| `pnpm run db:migrate` | CLI 把未应用迁移写入 `app.db`（不启动 Next 时用） |
| `pnpm db:checkpoint` | 将 `app.db` 的 WAL 合回主库（同步前用） |
| `pnpm sync:data:push` / `pull` | 本地 ↔ 云盘镜像（pull 会覆盖本地） |

## 数据与备份

| 路径 | 内容 |
| ---- | ---- |
| `CHAT_STORE_DIR`（默认 `./data/chats`） | 会话图片、DESIGN.md |
| `dirname(CHAT_STORE_DIR)/app.db` | 应用库（会话 + 工作室任务元数据，WAL） |
| 同级 `studio/{product}/` | 工作室任务资产 |

```bash
# 同步前：先停掉 pnpm dev，再把 WAL 合回主库
pnpm db:checkpoint
pnpm sync:data:push              # 本地 → 云盘
pnpm sync:data:pull              # 云盘 → 本地（覆盖）
pnpm sync:data:pull -- --yes     # 跳过确认
```

`db:checkpoint` 执行 `PRAGMA wal_checkpoint(TRUNCATE)`，清理残留的 `app.db-wal` / `-shm`；若 sync 因 WAL 风险检测中止，关应用后跑一次即可。明文落盘不适合高敏感内容。

## 数据库迁移

表结构的真相在 `src/lib/db/schema.ts`；可执行的变更脚本在 `drizzle/`（须进 Git）。目标库由 `.env.local` 的 `CHAT_STORE_DIR` 解析（默认 `./data/app.db`）。`db:generate` / `db:migrate` **不会**随 `dev` / `build` 自动执行。

### `pnpm run db:generate` — 生成迁移（不改库）

对照当前 `schema.ts` 与 `drizzle/meta` 里上一份快照的差异，在 `drizzle/` 写出新文件，例如：

- `0008_xxx.sql` — 待执行的 SQL
- `meta/0008_snapshot.json` — 新快照
- 更新 `meta/_journal.json` — 登记本条迁移

**何时跑**：改了 `schema.ts`（加表 / 加列 / 改索引等）之后。不改 schema 不必跑。

**建议步骤**：

```bash
# 1. 改完 schema.ts
pnpm run db:generate

# 2. 打开 drizzle/ 下新生成的 .sql，确认无误后提交整个 drizzle/
# 3. 继续开发；见下方「如何应用到库」
```

注意：本命令**只写文件、不碰** `app.db`。没有生成新 SQL，后面怎么 migrate 库结构也不会变。

### `pnpm run db:migrate` — CLI 应用迁移（改库）

把 `drizzle/` 中**尚未应用到当前库**的 SQL 按 journal 顺序执行进 `app.db`。

**何时跑**：

- 不启动 Next，只想先把本地库结构更新好
- CI / 脚本里单独迁库
- 拉代码后想立刻对齐，而不等应用首次读库

空跑（没有未应用迁移）一般是安全的 no-op。

### 如何应用到库（二选一）

| 方式 | 说明 |
| ---- | ---- |
| 日常开发 | `pnpm run dev` 后，首次访问数据库时 `getDb()` 会自动 `migrate()` |
| CLI | `pnpm run db:migrate`，立刻写库、无需启动 Next |

两者效果同类：都只执行「还没跑过」的迁移。推荐习惯：

```text
改 schema.ts → db:generate → 检查并提交 drizzle/ → pnpm run dev
（需要立刻改库或不跑 Next 时再补 db:migrate）
```

## 目录结构

```
src/
  app/chat/            # 对话页（_components / _utils / _hooks）
  app/studio/          # 工作室页（各产品子路由 + 共用 _components）
  app/api/<域>/        # route.ts 薄壳 + _server + _shared
  components/          # 全局通用 UI
  lib/                 # 平台内核：db / skills / shared / theme
drizzle/               # SQL 迁移（db:generate 产出）
scripts/               # checkpoint / sync-data 等 Node 脚本
```

前端跟页面路由、服务端跟 API 路由；细节见 [AGENTS.md](./AGENTS.md)。

## 工作室

入口 `/studio`。各产品任务资产落在 `data/studio/{product}/`：

| 产品 | 路径 | 说明 |
| ---- | ---- | ---- |
| 产品精修 | `/studio/product-retouch` | 精修 / 多角度出图 |
| 商业分析 | `/studio/business-analysis` | 定位、卖点与视觉方向 |
| 产品模特 | `/studio/product-model` | 多角度模特图 |
| 电商设计 | `/studio/ecommerce` | 主图 / 详情图 / 营销海报（主题规划，不跑商业分析） |
| 公众号 | `/studio/wechat-article` | 选题调研、思路与成稿 |

## 对话与工具

主对话由 `CHAT_PROVIDER` 选择 Provider；工具跑完后主模型再汇总。

| 工具 | 作用 |
| ---- | ---- |
| `generate_image` | 文生图 / 改图（多参考图）；按模型路由 Provider |
| `save_design_md` | DESIGN.md 落盘，对话内仅下载卡片 |
| `web_search` | 联网搜索（方舟侧透传；DeepSeek / 智谱走本地工具调智谱 Web Search） |

生图模型优先级：`IMAGE_MODEL_ID`（若设置）→ 主模型自选 → 继承父图 → `FALLBACK_IMAGE_MODEL_ID`（`gemini-3.1-flash-image`）。清单见 [`registry.ts`](src/app/api/images/_server/registry.ts)（Seedream 4.5 / 5.0 Lite、Gemini Flash Image / Lite、GPT Image 2 VIP）。图片经 `GET /api/images/[assetId]` 展示，勿直链上游 CDN。

## Skills

`/<id>` 或 Suggestion 调用用户面向 skill；知识库 skill（`userInvocable: false`）由意图 / 伴随激活注入。

| Skill | 说明 |
| ----- | ---- |
| `brandkit` | 品牌规范板 |
| `mobile-design` / `web-design` | 移动端 / Web 设计参考图 |
| `design-md` | 知识库：出图后按需落盘 DESIGN.md |

新增与注入规则见 [AGENTS.md](./AGENTS.md)。

## 提交

[Conventional Commits](https://www.conventionalcommits.org/)，description 用中文简体（如 `feat(chat): 新增流式对话`）。commitlint + husky / lint-staged 会校验并格式化暂存文件。

## 协议与文档

[MIT License](./LICENSE) · [AGENTS.md](./AGENTS.md) · [Next.js](https://nextjs.org/docs) · [AI SDK](https://ai-sdk.dev/docs) · [Ant Design X](https://x.ant.design/docs/react/introduce)
