<!-- BEGIN:nextjs-agent-rules -->

# 注意：这不是你熟悉的旧版 Next.js

本版本包含破坏性变更 — API、约定与文件结构可能都与训练数据不同。编写任何代码前，请先阅读 `node_modules/next/dist/docs/` 中的相关指南，并留意弃用提示。

<!-- END:nextjs-agent-rules -->

# 凡域

> AI 对话语言默认使用中文简体。

## 目录

1. [入门](#入门)
2. [目录与分层约定](#目录与分层约定)
3. [领域约定](#领域约定)
4. [编码约定](#编码约定)
5. [应做与不应做](#应做与不应做)

---

## 入门

### 项目概述

基于 **Next.js App Router + TypeScript + Vercel AI SDK + @ant-design/x** 的 AI 对话前端脚手架。样式使用 CSS Modules / Ant Design（**不使用 Tailwind**）。

| 项        | 值                                 |
| --------- | ---------------------------------- |
| 应用名称  | 凡域                               |
| 包管理器  | pnpm                               |
| Node 版本 | 未在 package.json 指定（建议 22+） |

### 技术栈

| 依赖包                      | 版本 | 使用场景                                     |
| --------------------------- | ---- | -------------------------------------------- |
| next                        | 16.x | App Router 框架                              |
| react / react-dom           | 19.x | UI 运行时                                    |
| typescript                  | 5.x  | 类型系统                                     |
| ai                          | 7.x  | Vercel AI SDK 核心（streamText 等）          |
| @ai-sdk/react               | 4.x  | 前端 `useChat` 等 Hooks                      |
| @ai-sdk/openai              | 4.x  | OpenAI 模型 Provider                         |
| @ant-design/x               | 2.x  | AI 对话 UI 组件（Bubble / Sender / Welcome） |
| antd                        | 6.x  | 基础组件与中文 locale                        |
| @ant-design/nextjs-registry | 1.x  | App Router SSR 样式注入                      |
| zod                         | 4.x  | Schema 校验（工具调用等）                    |

### 开发命令

```bash
pnpm install
pnpm run dev
pnpm run lint
pnpm run format
pnpm run build
```

本地对话前：

```bash
cp .env.example .env.local
```

### 提交规范

采用 [Conventional Commits](https://www.conventionalcommits.org/)，**description 使用中文简体**。

```text
<type>[optional scope]: <中文描述>
```

常用 type：`feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `chore` / `ci` / `build`

```text
feat(chat): 新增流式对话与停止生成
fix(api): 修复消息转换失败导致的 500
docs(agents): 补充本地启动与环境变量说明
refactor(ui): 抽离 Chat 组件
chore(deps): 升级 eslint 与 prettier
```

**只写一行**：不加 body 段落，不罗列改了哪些文件、为何这么改。改动再复杂也只留标题，细节看 diff。

- commit-msg：commitlint（`@commitlint/config-conventional`）
- pre-commit：husky + lint-staged（ESLint / Prettier）

---

## 目录与分层约定

实现**跟路由走**：前端在 `app/<页面域>/`，服务端在 `app/api/<域>/`。`src/lib/` 只放无独立产品面的平台内核（`db` / `shared` / `theme` / `skills`）。

skills 同时被 Sender UI 与 `stream-chat` 使用，故留在 `lib/`。本地 tool 是 chat 这一轮 `streamText` 的适配器，放在 `app/api/chat/_server/tools/`，`execute` 再调 `app/api/images/_server`、`app/api/docs/_server` 等。

无独立页面的能力（images / docs / geo）只出现在 `app/api/<域>/`，不建空的 `app/images` 等页面。

### 目录树

```
src/
  app/                     # 按路由收敛：页面前端 + API 实现
    chat/                  # 对话产品面（前端）
      layout.tsx
      [[...id]]/page.tsx
      _hooks/              # 页面级共享 Hook；勿放 Node 代码
      _utils/              # 页面级共享工具与常量；勿放 Node 代码
      _components/         # ChatShell / ChatSidebar / Chat / AuxiliaryPanel
    studio/                # 工作室产品面（前端）
      _utils/ / _hooks/ / _components/
      ecommerce/
      business-analysis/ / product-model/ / product-retouch/
      wechat-article/
    api/
      chat/                # POST /api/chat
        route.ts           # HTTP 薄壳
        _shared/           # Client 也要对齐的契约
        _server/           # handle-post / stream-chat / providers / tools
      chats/               # 会话 CRUD
        route.ts / [id]/route.ts
        _shared/types.ts
        _server/           # store / handle-*
      studio/              # 共用 generate + 各产品 tasks
        generate/route.ts
        _shared/ / _server/
        ecommerce/ / business-analysis/ / product-model/
        product-retouch/ / wechat-article/
      geo/ / images/ / docs/
    page.tsx / layout.tsx / global.css
  components/              # 全局通用 UI（无业务耦合）
  hooks/                   # 全局通用 Hook
  lib/                     # 平台内核：db / skills / shared / theme
public/
drizzle/                   # SQL migrations
```

### 落点规则一览

| #   | 场景                                                  | 落点                                                                              |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1   | 组件专属（store / 纯函数 / 类型 / 常量 / Hook）       | `app/<页面域>/_components/<Component>/`（`utils.ts` / `constants.ts` / `hooks/`） |
| 2   | 页面级共享工具与常量（同路由多个**顶层**组件或 page） | `app/<页面域>/_utils/`（勿叫 `_lib`；勿在页面根平铺 `constants.ts`）              |
| 3   | 页面级共享 Hook                                       | `app/<页面域>/_hooks/`（勿叫 `hooks/`，否则成 URL 段）                            |
| 4   | 仅 Node / Route                                       | `app/api/<域>/_server/`（`import 'server-only'`）                                 |
| 5   | Client + Server 共用类型 / 纯函数 / 常量              | 该 API 域 `_shared/`（Client **只允许** import `_shared`）                        |
| 6   | 无独立产品面                                          | `src/lib/`                                                                        |
| 7   | 跨路由、无业务耦合 UI / Hook                          | `src/components/` / `src/hooks/`                                                  |
| 8   | 工作室跨产品子路由复用 UI                             | `app/studio/_components/`（专属 Hook/常量仍放该组件目录）                         |

**命名约束：**

- `_` 前缀沿用 `_components`：不是 URL 段
- 页面域**不设** `_lib` / `_server`
- API 域**不设** `_utils` / `_hooks`
- `_utils/` 内文件避免 App Router 保留名（不可用 `route.ts`）

**禁止：**

- Client import `_server`
- `_server` barrel 把 `_shared` 与 server 实现混进同一个 `index.ts`
- 页面 import 另一页面的 `_components` / `_hooks` / `_utils`
- 把 store / Provider / stream-chat 放进 `_utils` 或 `_hooks`
- 把页面/组件私有 Hook 放进 `src/hooks`

### 依赖方向

```text
app/chat Client      →  _hooks、_utils、_components、lib/skills、lib/shared/client、
                        api/*/ _shared、components、hooks
app/chat RSC         →  同上 + app/api/chats/_server/store
app/studio Client    →  studio/_hooks、_utils、_components、
                        api/studio/_shared、api/studio/{product}/_shared、
                        components
app/api/<域>/_server →  本域 _shared、lib/db、lib/shared/server、其他域 _server（仅能力调用）
lib/*、src/hooks     →  禁止依赖 app/ 与任何产品实现
```

工作室：共用放 `api/studio/_server` + `_shared`；产品差异放 `api/studio/{product}/_server` 与 `_shared`。禁止共用层与子域混进同一 barrel `index.ts`。

允许的跨域服务端调用：`api/chat/_server/stream-chat` → images / docs / geo；`api/studio/_server` 生图 → `api/images/_server`。

### API 域约定

#### Route 一览

| API Route                 | 实现目录                | 说明                          |
| ------------------------- | ----------------------- | ----------------------------- |
| `app/api/chat/`           | `_server/`              | 流式对话、会话提交、tools     |
| `app/api/chats/`、`[id]/` | `_server/`              | 会话列表 / 新建 / 读取 / 删除 |
| `app/api/studio/`         | `_server/` + 各产品子域 | 共用生图与任务；子路由见下    |
| `app/api/geo/`            | `_server/`              | 逆地理、UserLocation          |
| `app/api/images/`         | `_server/`              | 生图资源、Provider            |
| `app/api/docs/`           | `_server/`              | DESIGN.md 等会话文档下载      |

工作室子路由要点：

- 共用：`generate`
- 各产品：`{ecommerce,business-analysis,product-model,product-retouch,wechat-article}/tasks`
- 另有：商业分析 `analyze`；电商 `analyze` / `rewrite-card`（主题规划，**不跑商业分析**）；公众号 `research` / `plan` / `draft` / `images`

#### `route.ts` 职责上限

- 导出 Route 段配置（`runtime`、`maxDuration`、`dynamic` 等）
- 读取 `params` / `req` 等 HTTP 边界参数
- 调用同域 `_server/` 的 `handle-*` / `serve-*` 并 `return`
- 最外层 `try/catch` 与统一错误信封（若领域层未包）

业务不写进 `route.ts`，实现放同目录 `_server`。

#### 域内典型文件命名

| 文件                     | 位置                     | 说明                                            |
| ------------------------ | ------------------------ | ----------------------------------------------- |
| `handle-<动作>.ts`       | `_server/`               | HTTP 方法或 Route 入口                          |
| `parse-request.ts`       | `_server/`               | 请求体解析与校验                                |
| `store.ts` / `assets.ts` | `_server/`               | DAL（`import 'server-only'`）                   |
| `providers/<name>/`      | `_server/`               | 第三方 SDK 适配；`client.ts` **不是**浏览器模块 |
| `types.ts`               | `_shared/`               | **仅**类型；勿放运行时常量                      |
| `constants.ts`           | `_shared/` 或 `_server/` | 运行时常量；与 types 分离                       |

Client 需要的会话类型从 `app/api/chats/_shared/types.ts` 导入，**勿**从 `store.ts` 再导出。

#### 跨域复用

- 横切工具 → `lib/shared/`（浏览器 `shared/client/`，服务端 `shared/server/`）
- Agent skill 注册表 → `lib/skills`
- 某域 Client+Server 共用 → 该 API 域 `_shared/`；仅 Node → `_server/`
- 勿塞回 `lib/shared/`，除非 truly 全局

#### 新增 API checklist

1. `app/api/<域>/.../route.ts` 建薄壳
2. Node 实现放同域 `_server/`（DAL 加 `server-only`）；两端契约放 `_shared/`
3. 多 Provider 时放 `_server/providers/<name>/`
4. 页面域不设 `_server`；API 域不设 `_utils` / `_hooks`
5. 不要加跨 `_server` / `_shared` 的域级 barrel `index.ts`

### 页面路由约定

- `page.tsx` / `layout.tsx`（RSC）可直调 `app/api/chats/_server/store`（如 `listChats()`）
- 路由 id 归一化放 `app/chat/_utils/chat-id.ts`
- UI 分层见下方「组件 / Hook / 常量」；跨页领域逻辑仍放对应 `api/<域>/_server` 或 `_shared`
- **`'use client'` 只打在被 Server Component 直接 import 的入口**（当前：`src/components/Providers`、`app/chat/_components/ChatShell`）。子树内勿重复标注

### 组件目录约定

| 层级       | 路径                       | 判定                   | 示例                    |
| ---------- | -------------------------- | ---------------------- | ----------------------- |
| 全局通用   | `src/components/`          | 无业务耦合，可跨路由   | `theme/`、`ModeSwitch/` |
| 工作室共用 | `app/studio/_components/`  | 跨工作室产品子路由复用 | `StudioImageUpload/`    |
| 页面级     | `app/<route>/_components/` | 仅该路由段；`_` 非 URL | `app/chat/_components/` |

页面级可引用全局 / 工作室共用；反向禁止。工作室产品页可引用 `app/studio/_components/`，勿反向依赖各产品 `_components`。

#### 单组件目录结构

有样式 / 测试 / 子文件时，**一个公开组件一个目录**（PascalCase）；colocation，勿单独堆 `styles/`：

```text
Button/
  Button.tsx              # 或 index.tsx
  Button.module.css       # 勿用 index.module.css
  Button.test.tsx
  constants.ts            # 组件专属常量（可选）
  utils.ts                # 组件级纯函数（可选）
  hooks/
    useButton.ts          # 组件专属 Hook（可选；勿与主文件平铺）
  SubButton/              # 子组件拆离
    SubButton.tsx
    SubButton.module.css
    constants.ts / utils.ts / hooks/
    index.ts
  index.ts                # 仅再导出，勿塞业务逻辑
```

仅单文件且无样式时可暂平铺：`components/Foo.tsx`。

#### 主文件约束

- **不在主文件内**定义子组件 / 方法 / 专属常量 / Hook → 分别进子目录、`utils.ts`、`constants.ts`、`hooks/`
- `utils.ts` 只放纯函数；Hook 勿写入 `utils.ts`
- Context 配套的 `useXxx` 与 Provider 同目录，不进三级 `hooks/`
- 抽离子组件时**同步带走**样式 / 方法 / 常量 / Hook
- **同一组件树内**跨子组件共享 → 可留父级对应文件
- **同页多个顶层组件**共用 → 上提到 `_utils/` / `_hooks/`（见下）

### Hook 目录约定

| 层级     | 路径                  | 判定                       | 示例                        |
| -------- | --------------------- | -------------------------- | --------------------------- |
| 全局     | `src/hooks/`          | 无业务耦合，可跨路由       | 按需创建                    |
| 页面私有 | `app/<route>/_hooks/` | 同路由多个组件或 page 共用 | 按需创建                    |
| 组件私有 | `<Component>/hooks/`  | 仅该组件使用               | `EcommerceTaskList/hooks/…` |

- 文件名 `useXxx.ts`；勿为空目录占位
- **就近上提**：单调用方 → 组件 `hooks/` → 同页多组件 → `_hooks/` → 跨路由无业务耦合 → `src/hooks/`
- 页面级必须 `_hooks/`；组件级 / 全局是 `hooks/`
- Hook ≠ 纯函数：禁止与 `_utils/` / `utils.ts` 互塞
- 工作室跨产品复用组件的私有 Hook → `app/studio/_components/<Component>/hooks/`
- **禁止**跨页面 import `_hooks`；**禁止**把页面/组件私有逻辑放进 `src/hooks`

### 常量目录约定

| 层级     | 路径                                                      | 判定                                           | 示例                                       |
| -------- | --------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------ |
| 组件专属 | `<Component>/constants.ts`                                | 仅该组件；同树子组件可留父级                   | `EcommerceStudio/constants.ts`             |
| 页面私有 | `app/<route>/_utils/constants.ts`（或按主题拆分）         | 同路由多个**顶层**组件或 page 共用             | `app/studio/ecommerce/_utils/constants.ts` |
| API 契约 | `api/<域>/_shared/constants.ts` 或 `_server/constants.ts` | Client+Server → `_shared`；仅 Node → `_server` | `api/docs/_shared/constants.ts`            |

**就近上提：**

1. 单调用方 → 组件 `constants.ts`
2. 同树多子组件 → 父级 `constants.ts`
3. 同页多个顶层组件 → `_utils/constants.ts` 或 `_utils/<主题>.ts`
4. 跨页契约 → API `_shared`
5. 跨路由无业务耦合 UI 常量 → `src/components/<Component>/constants.ts`

**禁止：**

- 页面根平铺 `constants.ts`（与 `_utils` / `_hooks` 分层不一致）
- 为「共享」伪造无关父组件依赖
- Client import `_server/constants.ts`
- 跨页面 import `_utils`；API 运行时常量勿塞进页面 `_utils`
- 在 `types.ts` 写 `export const`（types 只导出类型）

---

## 领域约定

### 会话持久化

#### 存储路径

| 用途            | 路径规则                                              | 默认                       |
| --------------- | ----------------------------------------------------- | -------------------------- |
| 会话图片 / 文档 | `CHAT_STORE_DIR` 下 `images/`、`docs/`                | `./data/chats/`            |
| 应用库          | `dirname(CHAT_STORE_DIR)/app.db`（WAL）               | `./data/app.db`            |
| 工作室任务资产  | `dirname(CHAT_STORE_DIR)/studio/{product}/{taskId}/`  | `./data/studio/{product}/` |
| 云盘同步对端    | `CHAT_SYNC_REMOTE_DIR`（须 `.env.local`，无代码默认） | 应指向 `.../chats`         |

- `pnpm sync:data:push` 本地→云盘；`pnpm sync:data:pull` 云盘→本地（镜像 chats、同级 studio、上一级 app.db；pull 覆盖本地）
- 同步前先关应用，再跑 `pnpm db:checkpoint`（WAL 合回主库）；若仍残留 `-wal`/`-shm` 导致 sync 风险检测中止，关应用后重跑即可
- 明文落盘 + 云盘同步不适合高敏感内容

#### 数据模型与路由

- 表：`chats` + `messages`（`messages.data` 存完整 **UIMessage** JSON，含 reasoning / source-url）
- 调方舟前仍用 `pruneMessages` 去掉历史 reasoning；**持久化与模型入参解耦**，勿把落盘也 prune 掉
- `/`：有历史进最近会话，否则 `/chat`
- `chat/[[...id]]`：承载草稿 `/chat` 与 `/chat/[id]`（多段路径 `notFound`）
- 侧栏「开启新对话」→ `/chat`；首条发送 → `replace('/chat/[id]')`
- Chat 挂在 `ChatShell`，避免首条发送 remount 丢流；侧栏在 `chat/layout`，切换 id 不卸载

### 生图与主 Agent

#### 主对话循环

- 入口：[`src/app/api/chat/route.ts`](src/app/api/chat/route.ts)，经 `generate_image` tool 出图/改图
- `stopWhen`：`isLoopFinished()` 自然终止 + `stepCountIs(40)` 兜底（`MAX_TOOL_LOOP_STEPS`）

#### 模型选型

- env `IMAGE_MODEL_ID`：**设置则绝对优先**；未设置则主模型经 `generate_image` 的 `model` 回传，由 `resolveImageModelId` 路由
- 未设置且无自选、无父图 → 兜底 `FALLBACK_IMAGE_MODEL_ID`
- Provider：老张 Gemini（`LAOZHANG_*`）/ 方舟 Seedream（`ARK_*`）
- 清单与能力：`registry.ts`（`listImageModels` / `describeImageModels`）；尺寸：`IMAGE_SPEC_BY_MODEL_ID`

#### 资产与前端展示

- 图片：`CHAT_STORE_DIR/images/{chatId}/`；表 `image_assets`；`chats.working_image_asset_id` 为多轮改图默认源
- DESIGN.md：`CHAT_STORE_DIR/docs/{chatId}/`，经 `save_design_md`；前端下载卡片，不贴全文
- 展示：`GET /api/images/[assetId]` + antd `Image`；勿直接用上游临时 CDN URL
- 改图入参用本地 data URL/base64，避免 URL 过期导致下一轮 edit 失败
- `execute` 返回完整 output（含 `assetId`/`url`）供落盘与 `GenerateImageBlock`；`toModelOutput` 返回不含 `url` 的摘要，避免正文重复插图
- 历史正文若含 `/api/images/` Markdown，仍可能与 `GenerateImageBlock` 重复（未做前端过滤）

### Skills 渐进披露

两层注入（Execution / references 预留）：**Discovery → Activation**。

| 层         | 行为                                                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discovery  | 每轮 `instructions` 常驻目录（`id` + `name` + `description`），见 `buildSkillCatalogPrompt`；不含指令正文；区分可调用 vs 知识库（`userInvocable: false`） |
| Activation | 仅本轮加载完整 `instructions`；来源：手动 `/<id>`（跳过阈值）、意图达阈值、`coActivateWith` 伴随激活；取并集                                              |

补充规则：

- **不可调用**（`userInvocable: false`）：不进 Suggestion、不识别 `/<id>`；仍可 Discovery + 意图/伴随注入（如 `design-md`）
- **信度**（`src/lib/skills/server/constants.ts`）：High ≥ 0.70 激活；Medium 0.55–0.69 默认不激活；Low < 0.55 不激活；sticky 短 follow-up 可降阈
- **粘滞**：`metadata.skillIds` 只增不减，供 Tags / follow-up；**≠** 每轮注入正文
- **去重**：已激活 skill 在 `/token` 处只保留 `【Skill：name】`；历史令牌不再展开
- **观测**：服务端日志 `[skills] intent-match`，不返回客户端

### 主题系统

#### 状态与配置

- UI 状态：`src/components/theme/` — `ThemeProvider` + `useThemeMode()`
  - `mode`：实际生效 `'light' | 'dark'`
  - `preference`：用户选择 `'light' | 'dark' | 'system'`
  - `setMode` / `toggle`：三态循环 light → dark → system → light
- 主题 token：`src/lib/theme/` — `appTheme` / `darkTheme`（`cssVar.prefix: 'fanyu'`）
- 切换按钮：`src/components/ModeSwitch/`（ChatShell 顶栏右侧）

#### 持久化与 SSR

| 键                     | 存储         | 内容                                        |
| ---------------------- | ------------ | ------------------------------------------- |
| `fanyu-theme`          | localStorage | 偏好（可含 `'system'`）                     |
| `fanyu-theme-resolved` | cookie       | 解析后的 `'light' \| 'dark'`（SSR 防 FOUC） |

- `html[data-theme]` / `color-scheme` 永远写解析后的 light/dark
- `'system'` 用 `matchMedia` 实时解析；preference 为 system 时挂 `change` 监听
- 改键须同步：constants、`layout.tsx` 预挂载脚本、cookie 读写

#### 样式与 Layout

- CSS Module 用 `--fanyu-*` 即可换肤；无 antd token 的自定义色在 `global.css` 的 `html[data-theme='dark']` 覆盖
- **布局壳必须用 antd `Layout`**（否则 `Layout.*` 组件级 token 不 flush）

#### XMarkdown

- 同时引入 `light.css` / `dark.css`，用 `useThemeMode()` 切换 `x-markdown-light` / `x-markdown-dark`
- 变量覆写：[`src/lib/theme/XMarkdownTheme.css`](src/lib/theme/XMarkdownTheme.css) 映射到 `--fanyu-*`
- **引入顺序**：消费组件内紧跟 light/dark 之后 import 覆写层；**勿放 `global.css`**
- 浅/深 code 背景分别覆写 `--light-bg` / `--dark-bg`

---

## 编码约定

### 通用

- 对话、注释、提交说明默认中文简体
- **不引入 Tailwind**；样式用 CSS Modules + Ant Design / Ant Design X
- 目录落点遵循上文「目录与分层约定」（组件 / Hook / 常量 / App Router）
- App Router 下避免 `Bubble.List` 点号子组件，改从独立路径导入（如 `@ant-design/x/es/bubble/BubbleList`）
- 改完对改动文件执行格式化；提交前由 lint-staged 检查
- 写 Next.js 相关代码前先查 `node_modules/next/dist/docs/`
- **`types.ts` 与 `constants.ts` 分离**：types 只导出类型；运行时常量放 `constants.ts`
- **antd 反馈 API**：组件 / Hook 内用 `App.useApp()` 取 `message` / `modal` / `notification`；**禁止** `Modal.confirm`、`message.xxx` 等静态调用（吃不到动态主题，控制台会告警）。非 React 模块仅经 `lib/shared/client/antd-message` 注入的实例。参考 `useChatManageList`

### AI SDK v7

- `streamText` / `generateText` 用 **`instructions`**，**勿用**已废弃的 `system`
- 调用方舟 Responses API 必须传 `providerOptions: { openai: { store: false } }`，否则默认 `store:true` 会发 `item_reference` 导致方舟 `<nil>` 错误（见 `api/chat/_server/providers/ark/constants.ts`）

### 代码注释

按「目的」分两类，勿混淆：

| 类型   | 何时写                     | 内容                               |
| ------ | -------------------------- | ---------------------------------- |
| 防回归 | **仅**真实修错的代码       | 原现象 / 根因 / 为何这样写、勿改回 |
| 意图   | 反直觉、易被误改、隐藏约束 | 「为什么」取舍；显而易见不写       |

规则：

- 判断：删掉注释后读者/AI 会不会改坏？会 → 写；不会 → 不写
- 只注「为什么」，不注「是什么」
- 「修复 / 防回归 / 勿再踩 / 否则会 BUG」**只能**出现在修复 diff 所改行上；新增行出现即违规
- 业务逻辑函数须有基本说明注释（职责、入参/返回值要点）；显而易见的单行包装或框架生命周期回调可从简

### 环境变量

- `.env.example` → `.env.local`，所列变量必须填写；业务代码假定已配置且非空
- 用 [`requireEnv(name)`](src/lib/shared/server/env.ts) 读取；**勿** `?? 默认值` / `|| 'fallback'` / Route 内判空
- 缺失或空字符串直接 `throw`；面向用户的 JSON API 不因「未配置 env」单独返回 503

### JSON API 响应

统一信封：`{ code: number; message: string; data: T | null }`

| 结果 | `code` | `message`    | `data`   | HTTP                     |
| ---- | ------ | ------------ | -------- | ------------------------ |
| 成功 | `0`    | `'ok'`       | 业务载荷 | 200                      |
| 失败 | ≠ 0    | 中文可读描述 | `null`   | 保留语义（400/404/502…） |

客户端以 `code === 0` 判成功。工具：[`api-response.ts`](src/lib/shared/server/api-response.ts) — `jsonOk` / `jsonFail` / `readApiData`。

**用户端 `message`：**

- 勿暴露 env 名、业务码含义、Provider/SDK 原文、`err.message`
- 上游不可用：「XX 服务暂不可用」
- 用户输入问题：简短说明缺什么
- 兜底：「服务暂时不可用，请稍后重试」

业务码（`ApiErrorCode`）：`40001` 参数无效、`40401` 会话不存在、`50201` 高德上游失败；`50301`/`50302` 保留（env 缺省改由 `requireEnv` 抛错）。

**例外：**

- `POST /api/chat` 成功为 AI SDK SSE 流，非 JSON 信封；其 400 仍走信封
- RSC 直调 `store` 不经 HTTP，无需信封

---

## 应做与不应做

**应做**

- 改动前对齐相邻文件习惯
- 新功能先判断落点
- 冲突时先询问再改
- 新增函数/方法补基本说明注释

**不应做**

- 多职责堆单文件或过度抽象
- 未要求时 commit / push
- 覆盖更细规范
- 默认沿用冲突的项目命名
- 业务函数无说明注释
