# 凡域

基于 **Next.js App Router + TypeScript + Vercel AI SDK + Ant Design X** 的 AI 对话应用。样式使用 CSS Modules 与 Ant Design（不使用 Tailwind）。

协作约定、分层规范与编码细则见 [AGENTS.md](./AGENTS.md)。

## 功能概览

- **流式对话**：Think 推理、联网搜索引用、停止生成；刷新后可还原思考过程与引用来源
- **多 Provider**：默认 DeepSeek 直连；可切火山方舟 / 智谱 BigModel。识图始终走方舟，生图按所选模型路由
- **模型路由**：按消息复杂度自动选择 `pro` / `lite` / `mini` 三档
- **工具**：文生图 / 改图（支持多参考图）、识图、DESIGN.md 落盘；联网搜索按 Provider 适配
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

默认对话 Provider 为 DeepSeek；**识图无论主对话用哪家，都需要方舟，生图默认走老张**：

```env
CHAT_PROVIDER=deepseek

DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_BASE_URL=https://your-deepseek-base-url
# 三档模型 ID（均须配置，缺失启动时报错；按最后一条用户消息复杂度自动路由）
DEEPSEEK_MODEL_PRO=your-deepseek-model-pro
DEEPSEEK_MODEL_LITE=your-deepseek-model-lite
DEEPSEEK_MODEL_MINI=your-deepseek-model-mini
# 可选：思考强度，默认 high
# DEEPSEEK_REASONING_EFFORT=high

# 识图始终走方舟（任何 CHAT_PROVIDER 都需要）
ARK_API_KEY=your-ark-api-key
ARK_BASE_URL=https://your-ark-base-url
ARK_MODEL_PRO=your-ark-model-pro
ARK_MODEL_LITE=your-ark-model-lite
ARK_MODEL_MINI=your-ark-model-mini

# 智谱 BigModel（CHAT_PROVIDER=zhipu 时作为主对话；生图 / 识图底座仍依赖上方 ARK_*）
ZHIPU_API_KEY=your-zhipu-api-key
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
ZHIPU_MODEL_PRO=your-zhipu-model-pro
ZHIPU_MODEL_LITE=your-zhipu-model-lite
ZHIPU_MODEL_MINI=your-zhipu-model-mini

# 老张 API（生图默认模型 gemini-3.1-flash-image，其余老张生图模型亦走此端点）
LAOZHANG_API_KEY=your-laozhang-api-key
LAOZHANG_BASE_URL=https://api2.laozhang.ai/v1

AMAP_WEB_KEY=your-amap-web-service-key
CHAT_STORE_DIR=./data/chats
CHAT_SYNC_REMOTE_DIR=/path/to/cloud-backup/chats
```

主对话切到方舟 / 智谱时分别设 `CHAT_PROVIDER=ark` / `zhipu`，并填写对应 `ARK_*` / `ZHIPU_*`。各 Provider 三档模型 ID 均须配置。

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
  app/
    chat/              # 对话页：_components / _utils
    api/<域>/          # route.ts 薄壳 + _server 实现 + _shared 契约
  components/          # 全局通用 UI：theme / ModeSwitch / Providers
  lib/                 # 平台内核：db / skills / shared / theme
drizzle/               # SQL migrations
```

前端跟页面路由走，服务端跟 API 路由走；`lib/` 只放无产品面的平台能力。细节见 [AGENTS.md](./AGENTS.md)。

## 对话与工具

主对话按 `CHAT_PROVIDER` 选择 DeepSeek、方舟或智谱；工具调用完成后主模型会再汇总说明。

| 工具             | 作用                                                                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generate_image` | 文生图（`generate`）与改图（`edit`，支持多参考图）；按所选模型路由 Provider                                                                          |
| `analyze_image`  | 识图：方舟视觉模型返回结构化描述，回喂主模型（主模型本身看不见图）                                                                                   |
| `save_design_md` | 将会话 DESIGN.md 落盘，对话里只展示下载卡片                                                                                                          |
| `web_search`     | 联网搜索：方舟在 Provider 侧透传（可带高德逆地理近似位置）；智谱经独立 Web Search API 由本地工具调用；DeepSeek 走 Responses API 原生搜索，无需该工具 |

生图模型由 `resolveImageModelId` 按优先级决定：

1. **全局设置（最高）** — env `IMAGE_MODEL_ID`（将来全局设置写入）设置了则绝对优先，主模型自选不覆盖
2. **主模型自动选型** — `IMAGE_MODEL_ID` 未设置时，主模型按场景从清单自选（经 `generate_image` 的 `model` 参数回传）
3. **继承父图模型** — 多轮改图时沿用上一张图，保持风格一致
4. **兜底** — `FALLBACK_IMAGE_MODEL_ID`（默认 `gemini-3.1-flash-image`）

可选模型清单与各模型能力/擅长场景见 [`src/app/api/images/_server/registry.ts`](src/app/api/images/_server/registry.ts)（`listImageModels` / `describeImageModels`）：方舟 Seedream 4.5 / Seedream 5.0 Lite，老张 Gemini Flash Image / Gemini Flash Lite Image / GPT Image 2 VIP。

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

## 待办

- [ ] 用户消息锚点，快速跳转
- [ ] 媒体号方向探索，skill 快速出文/图
- [ ] DeepSeek 参考来源摘要和时间补全
- [ ] 品牌设计、web端/移动端设计、电商图设计案例
- [ ] 对话上下文管理
- [ ] 文字选中引用

## 开源协议

本项目采用 [MIT License](./LICENSE)。

## 相关文档

- [AGENTS.md](./AGENTS.md)
- [Next.js 文档](https://nextjs.org/docs)
- [Vercel AI SDK](https://ai-sdk.dev/docs)
- [Ant Design X](https://x.ant.design/docs/react/introduce)
