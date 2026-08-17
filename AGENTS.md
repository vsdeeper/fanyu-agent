<!-- BEGIN:nextjs-agent-rules -->

# 注意：这不是你熟悉的旧版 Next.js

本版本包含破坏性变更 — API、约定与文件结构可能都与训练数据不同。编写任何代码前，请先阅读 `node_modules/next/dist/docs/` 中的相关指南，并留意弃用提示。

<!-- END:nextjs-agent-rules -->

# OneAgent

> AI 对话语言默认使用中文简体。

## 项目概述

基于 **Next.js App Router + TypeScript + Vercel AI SDK + @ant-design/x** 的 AI 对话前端脚手架。样式使用 CSS Modules / Ant Design（**不使用 Tailwind**）。

- **应用名称**: ai-agent
- **包管理器**: pnpm
- **Node 版本**: 未在 package.json 中指定（建议 Node.js 22+）

## 技术栈

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

## 开发命令

```bash
pnpm install
pnpm run dev
pnpm run lint
pnpm run format
pnpm run build
```

本地对话前复制环境变量并填入密钥：

```bash
cp .env.example .env.local
```

## 提交规范

本项目采用 [Conventional Commits](https://www.conventionalcommits.org/)，**description 使用中文简体**。

格式：`<type>[optional scope]: <中文描述>`

常用 type：`feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `chore` / `ci` / `build`

**示例：**

```text
feat(chat): 新增流式对话与停止生成
fix(api): 修复消息转换失败导致的 500
docs(agents): 补充本地启动与环境变量说明
refactor(ui): 抽离 Chat 组件
chore(deps): 升级 eslint 与 prettier
```

commit-msg 由 commitlint（`@commitlint/config-conventional`）校验；pre-commit 通过 husky + lint-staged 对暂存文件执行 ESLint / Prettier。

## 项目结构

```
src/
  app/                     # 仅 Next.js 路由壳：route / page / layout / 静态资源
    api/
      chat/route.ts        # → lib/chat
      chats/route.ts       # → lib/chat
      chats/[id]/route.ts  # → lib/chat
      geo/regeo/route.ts   # → lib/geo
      images/[assetId]/route.ts  # → lib/images
    chat/layout.tsx
    chat/[[...id]]/page.tsx
    page.tsx
    layout.tsx
    global.css
  components/              # 跨路由 UI；见「组件目录约定」
  lib/                     # 业务逻辑与领域实现；与 app/api/<域> 一一对应
    chat/
      store.ts             # 会话 CRUD（Drizzle + SQLite）
      group.ts             # 侧栏时间分组（可客户端用）
      route.ts             # [[...id]] params 归一化
      parse-request.ts / handle-post.ts / handle-chats.ts / handle-chat-by-id.ts / stream-chat.ts / select-model.ts
      providers/ark/       # 对话模型 Provider 适配（出站 patch、入站 SSE、client）
    db/
      client.ts            # better-sqlite3 连接、WAL、migrate、清理旧 JSON
      schema.ts            # chats / messages 表
    images/
      assets.ts            # 生图资源落盘与元数据
      serve-asset.ts       # GET /api/images/[assetId] 业务逻辑
      generate-image-tool.ts / router.ts / registry.ts / providers/
    geo/
      types.ts             # UserLocation 类型
      parse-request.ts     # 请求体 / userLocation 校验
      regeo.ts             # 高德逆地理编码
      handle-regeo.ts      # POST /api/geo/regeo 业务逻辑
      client.ts            # 浏览器定位与缓存（调用 regeo API）
    shared/
      api-client.ts / api-response.ts / env.ts  # 横切基础设施
public/
drizzle/                   # SQL migrations（drizzle-kit generate）
```

### App Router 与 lib 分层约定

**`src/app/` 保持 Next.js 规范下的「路由壳」**：只放框架识别的入口文件（`route.ts`、`page.tsx`、`layout.tsx`、`loading.tsx`、`error.tsx`、样式与静态资源等），**不在 `app/api/*` 下堆 `utils/`、Provider 适配、业务方法或领域类型**。

业务逻辑一律抽到 **`src/lib/<域>/`**，并与 API 路径对齐：

| API Route                               | lib 目录      | 说明                           |
| --------------------------------------- | ------------- | ------------------------------ |
| `app/api/chat/`                         | `lib/chat/`   | 流式对话、会话 submit/continue |
| `app/api/chats/`、`app/api/chats/[id]/` | `lib/chat/`   | 会话列表 / 新建 / 读取 / 删除  |
| `app/api/geo/`                          | `lib/geo/`    | 逆地理、UserLocation           |
| `app/api/images/`                       | `lib/images/` | 生图资源、tool、Provider       |

**Route Handler（`route.ts`）职责上限：**

- 导出 Route 段配置（`runtime`、`maxDuration`、`dynamic` 等）
- 读取 `params` / `req` 等 HTTP 边界参数
- 调用 `lib/<域>/handle-*.ts`（或 `serve-*.ts` 等）并 `return` 其结果
- 最外层 `try/catch` 与统一错误信封（若 lib 未包）

**`lib/<域>/` 典型文件命名：**

- `handle-<动作>.ts` — 对应 HTTP 方法或 Route 入口（如 `handle-post.ts`、`handle-regeo.ts`、`handle-chats.ts`）
- `parse-request.ts` — 请求体解析与 zod/手工校验
- `store.ts` / `assets.ts` — 持久化与领域存储
- `providers/<name>/` — 第三方模型/SDK 适配（client、request-patch、sse 等）；后期新 Provider 增同级目录
- `client.ts` — 仅浏览器端调用该域 API 的封装（如 `lib/geo/client.ts`）

**跨域复用：**

- 横切工具放 `lib/shared/`（`env`、`api-response`、`api-client`）
- 某域类型/校验被其他域引用时，从 **`lib/<域>/types.ts`** 或 **`lib/<域>/parse-request.ts`** 导入，勿再塞回 `lib/shared/` 除非 truly 全局

**页面路由（非 API）：**

- `page.tsx` / `layout.tsx` 可直调 `lib/*`（如 `listChats()`），复杂校验抽到 `lib/chat/route.ts` 等
- 路由私有 UI 放 `app/<route>/_components/`；跨路由 UI 放 `src/components/`

**新增 API 时 checklist：**

1. 在 `app/api/<域>/.../route.ts` 建薄壳
2. 在 `lib/<域>/` 实现 `handle-*` / 领域模块
3. 多 Provider 时放 `lib/<域>/providers/<name>/`
4. 不在 `app/` 留业务实现文件

### 组件目录约定

有样式 / 测试 / 子文件时，**一个公开组件一个目录**（PascalCase，与主组件同名）；相关文件 colocation，勿单独堆 `styles/`：

```text
Button/
  Button.tsx          # 或 index.tsx
  Button.module.css   # 勿用 index.module.css（IDE 标签难辨认）
  Button.test.tsx
  constants.ts        # 组件专属常量（可选）
  utils.ts            # 组件级纯函数 / 数据处理（可选）
  SubButton/          # 子组件拆离（勿在主文件内定义）
    SubButton.tsx
    SubButton.module.css  # 抽离时同步带走专属样式
    constants.ts          # 抽离时同步带走专属常量（可选）
    utils.ts              # 抽离时同步带走专属方法（可选）
    index.ts              # 再导出
  index.ts            # 再导出（可选）
```

- 仅单文件且无样式时可暂平铺：`components/Foo.tsx`
- `index.ts` 只做对外导出，勿塞业务逻辑
- **不在主组件文件内定义子组件**：抽到同级子目录（如 `Button/SubButton/`），由 `index.ts` 再导出后供主组件引用
- **不在主组件文件内定义方法**：解析、归一化、memo 比较、事件处理等一律抽到同目录 `utils.ts`；主文件只保留组件函数与 JSX 组装
- **不在主组件文件内定义专属常量**：枚举值、文案映射、默认配置等一律抽到同目录 `constants.ts`
- **抽离子组件时同步抽离样式、方法与常量**：专属样式迁入子目录同名样式文件；专属方法迁入子目录 `utils.ts`；专属常量迁入子目录 `constants.ts`；勿继续依赖父级样式/utils/constants 中的专属部分（跨子组件共享类型/工具/常量可留在父级对应文件）
- 路由私有组件可放 `app/<route>/_components/`；跨路由复用放 `src/components`

## 会话持久化约定

- 存储目录由环境变量 **`CHAT_STORE_DIR`** 指定（示例：`D:/华为云盘/ai-agent/chats`，Windows 建议正斜杠）；库文件为目录内 **`chats.db`**（Drizzle + better-sqlite3，`journal_mode=WAL`，运行中可能另有 `chats.db-wal` / `chats.db-shm`）
- 表：`chats` + `messages`（`messages.data` 存完整 **`UIMessage` JSON**，含 reasoning / source-url）；刷新可还原 Think 与引用
- 换机前建议先关闭应用，便于 WAL checkpoint 回主库后再靠云盘同步
- **修复**：调方舟前仍用 `pruneMessages` 去掉历史 reasoning；持久化与模型入参解耦，勿把落盘也 prune 掉
- 路由：`/` 有历史则进最近会话，否则 `/chat`；`chat/[[...id]]` 单页承载 `/chat`（草稿欢迎态不写库）与 `/chat/[id]`（多段路径 `notFound`）；侧栏「开启新对话」→ `/chat`；首条发送 → `replace('/chat/[id]')` 并侧栏锚定；Chat 在 `ChatShell` 渲染以免首条发送 remount 丢流；侧栏在 `chat/layout`，切换 id 不卸载
- 明文落盘 + 云盘同步不适合高敏感内容

## 生图与主 Agent 约定

- 主对话模型在 [`src/app/api/chat/route.ts`](src/app/api/chat/route.ts) 通过 `generate_image` tool 出图/改图；`stopWhen: stepCountIs(5)` 保证 tool 后主模型可汇总说明
- 首版生图 Provider 为方舟 Seedream（`ARK_IMAGE_MODEL_ID`，`POST /images/generations`）；Flux Art 仅注册 Provider 接口，二期接入
- 图片文件落盘于 `CHAT_STORE_DIR/images/{chatId}/`；元数据表 `image_assets`；`chats.working_image_asset_id` 为多轮改图默认源图
- 前端经 `GET /api/images/[assetId]` 展示；气泡内使用 antd `Image`，勿用临时上游 CDN URL 直接渲染
- 改图时 Provider 入参使用本地 data URL/base64，避免方舟返回 URL 过期导致下一轮 edit 失败
- `generate_image` 的 `execute` 返回完整 output（含 `assetId`/`url`）供 `tool-generate_image` part 落盘与 `GenerateImageBlock` 渲染；`toModelOutput` 向主模型返回不含 `url` 的文本摘要，避免汇总正文重复插入 Markdown 图片
- 历史已落盘消息若正文含 `/api/images/` Markdown，仍可能与 `GenerateImageBlock` 重复展示（未做前端过滤）

## 主题系统（浅色/深色）

- 主题状态由 `src/components/theme/` 提供：`ThemeProvider` + `useThemeMode()`；`mode: 'light' | 'dark'` 为**实际生效主题**，`preference: 'light' | 'dark' | 'system'` 为用户选择，`setMode` / `toggle`（三态循环 light→dark→system→light）；`ThemedConfigProvider` 按 `mode === 'dark'` 接入 antd `ConfigProvider`
- 主题配置在 `src/lib/theme/`：`appTheme`（浅色）与 `darkTheme`（`algorithm: theme.darkAlgorithm` + `darkSeedTokens`，见 `tokens.ts`）；两者共用 `cssVar.prefix: 'one'`，切换 algorithm 时 antd 在 `:root` 重新输出暗色 `--one-*`，走 token 的样式（含 `@ant-design/x` 组件）自动跟随
- 模式持久化键 **`one-theme`**（localStorage）存**偏好**（可含 `'system'`）；`html[data-theme]` / `color-scheme` 永远写解析后的 `'light' | 'dark'`（`'system'` 由 `matchMedia('(prefers-color-scheme: dark)')` 实时解析，preference 为 `'system'` 时挂 `change` 监听实时跟随、离开即移除）；首次无记录默认跟随系统；`src/app/layout.tsx` 的预挂载内联脚本也内联了该键并先行解析 `'system'` 后设置 `data-theme`（**改键需两处同步**）
- **SSR 初始主题 cookie `one-theme-resolved`**：存解析后的 `'light' | 'dark'`，由 `utils.applyThemeMode` 在客户端双写（localStorage=偏好、cookie=resolved；`'system'` 的 OS 明暗变化也随 `applyThemeMode` 更新 cookie）；`layout.tsx`（服务端组件）`await cookies()` 读取并作为 `ssrInitialMode` 传给 `ThemeProvider`，在 `hydrated` 前作为 context 的 `mode` 生效 → antd 在 SSR 即输出正确主题 CSS，避免深色模式刷新时的浅→深 FOUC；改键同样需两处同步（constants + layout）
- CSS Module 引用 `--one-*` 即可自动换肤；**antd 无对应 token 的自定义颜色变量**（滚动条、侧栏边框、侧栏按钮阴影）需在 `src/app/global.css` 的 `html[data-theme='dark']` 下覆盖
- **布局壳必须用 antd `Layout` 组件**（`ChatShell` 的 `Layout`/`Layout.Header`/`Layout.Content`、`ChatSidebar` 的 `Layout.Sider`）：antd 组件级 token 是惰性输出的，只有组件实际渲染才会把 `--one-layout-*` flush 到 `:root` 并注入 `.ant-layout-*` 规则；若改用原生 `div`/`aside` 布局，`src/lib/theme/components.ts` 里的 `Layout.*` 配置（`siderBg`/`bodyBg`/`headerBg`/`headerHeight` 等）将完全不生效（详见该文件注释）
- **XMarkdown 双主题规则**：同时引入 `@ant-design/x-markdown/themes/light.css` 与 `dark.css`，在组件内用 `useThemeMode()` 切换 `className` 的 `x-markdown-light` / `x-markdown-dark`（例：`AiBubbleContent.tsx`）；XMarkdown 无 `theme` prop，主题靠 className 作用域下的 CSS 变量驱动
- **XMarkdown 主题变量覆写层**：XMarkdown 主题色为硬编码默认值，不随应用主题。在 [`AiBubbleContent/XMarkdownTheme.css`](src/components/Chat/AiBubbleContent/XMarkdownTheme.css) 里把其主题变量重映射到 antd `--one-*`（如 `--text-color→--one-color-text`、`--heading-color→--one-color-text-base`、`--border-color→--one-color-border`、code 背景 `--light-bg`/`--dark-bg→--one-color-fill-tertiary`，详见该文件注释）；**引入顺序契约**：该文件必须在 `AiBubbleContent.tsx` 紧跟 `light.css`/`dark.css` 之后导入，**勿放 `global.css`**（根布局先加载，会被深层组件的主题 CSS 以同优先级反压而失效）；浅/深 code 背景变量名不同（`--light-bg`/`--dark-bg`），须在 `.x-markdown-light`/`.x-markdown-dark` 两个作用域分别覆写，code 背景以 `!important` 消费，靠重定义变量接管
- 切换按钮：`src/components/ModeSwitch/`，置于 `ChatShell` 顶部栏右侧；单按钮三态循环（浅色→深色→跟随系统→浅色），图标随当前偏好切换（SunOutlined/MoonOutlined/MonitorOutlined），Tooltip 与 aria-label 描述下一步

## 编码约定

- 与用户/AI 对话默认使用中文简体
- 提交说明使用中文 description 的 Conventional Commits
- **不引入 Tailwind**；样式优先 CSS Modules 与 Ant Design / Ant Design X
- 组件目录遵循上文「组件目录约定」（子组件拆离并同步带走样式/方法/常量、主文件不定义方法与专属常量、`utils.ts` / `constants.ts` 维护、`ComponentName.tsx` + 同名 `.module.css`）
- **App Router 与 lib 分层**遵循上文「App Router 与 lib 分层约定」：`app/` 仅路由壳，业务在 `lib/<域>/`，`app/api/<域>` 对应 `lib/<域>`
- App Router 下避免 `Bubble.List` 这类点号子组件写法，改为从独立路径导入（如 `@ant-design/x/es/bubble/BubbleList`）
- 完成修改后对改动文件执行格式化（`pnpm run format` 或依赖 lint-staged）
- 提交前由 lint-staged 检查暂存文件
- 编写 Next.js 相关代码前先查阅 `node_modules/next/dist/docs/`
- **AI SDK v7 API 约定**：
  - `streamText` / `generateText` 使用 **`instructions`**（provider-agnostic），**勿用已废弃的 `system`** 属性；`system` 仅为 OpenAI 兼容层，v7 中已标记 deprecated
  - 调用方舟 Responses API 时**必须**传 `providerOptions: { openai: { store: false } }`，否则 `store:true`（默认）会发 `item_reference`，方舟报 `<nil>` 错误（详见 `src/lib/chat/providers/ark/constants.ts`）
- **代码注释按「目的」分两类，勿混淆**：
  - **防回归注释（仅限真实修复）**：只在**确实改错了的代码**上打。写明「原现象 / 根因 / 为何现在这样写，勿改回」。**新功能、新文件、从未出错的代码一律不打**——没历史包袱却写「勿再踩」，会误导后来者以为这里有坑
  - **意图注释（新功能/重构）**：代码反直觉、易被重构误改、或隐藏关键约束时，写一条「为什么」说明取舍；显而易见的代码不注释
- **判断标准**：删掉这条注释，未来的读者/AI 会不会把代码改坏？会 → 写；不会 → 不写
- **只注「为什么」，不注「是什么」**：作用说明交给「函数/方法说明注释」；能用一行说清不用两行
- **词缀即校验锚点**：「修复 / 防回归 / 勿再踩 / 否则会 BUG」这类词只能出现在修复 diff 所改动的行上；新增行出现即视为违规，代码评审据此驳回
- **函数/方法说明注释**：定义函数、方法时须有基本说明注释，写清职责，以及与调用方相关的入参、返回值要点；显而易见的单行包装或框架生命周期回调（如 React 组件、Next.js Route Handler 入口）可从简，但业务逻辑函数不可省略

### 环境变量约定

- 本地开发须复制 `.env.example` 为 `.env.local`，**其中列出的变量必须填写**；业务代码假定其已配置且有非空值
- 读取时使用 [`requireEnv(name)`](src/lib/shared/env.ts)，**勿**写 `process.env.X ?? 默认值`、`|| 'fallback'` 或 Route 内 `if (!process.env.X)` 判空分支；缺失或空字符串直接 `throw`，排查看服务端日志
- 面向用户的 JSON API 亦不因「未配置环境变量」单独返回 503 业务码；属部署/本地配置错误，由抛错或外层 catch 处理

### JSON API 响应约定

- 所有 JSON Route Handler（`Response.json`）统一返回业务码信封：`{ code: number; message: string; data: T | null }`
- **成功**：`code === 0`，`message === 'ok'`，`data` 为业务载荷；HTTP 200
- **失败**：`code !== 0`，`message` 为中文可读描述，`data: null`；HTTP status 保留语义（400/404/502 等）；客户端以 `code === 0` 判业务成功
- **用户端友好提示语**（`jsonFail` 的 `message` 字段）：
  - 面向终端用户，勿暴露环境变量名、业务码含义、Provider/SDK 原文、`err.message` 等内部信息；排查细节写服务端日志，勿塞进响应
  - 上游不可用等运维类问题：用「**XX 服务暂不可用**」等中性表述；环境变量缺失见上文「环境变量约定」，不在 Route 内判空返回友好文案
  - 用户输入问题：简短说明缺什么或哪里不对（如「缺少会话或消息内容」「无效 JSON」）
  - 未知/兜底异常：「服务暂时不可用，请稍后重试」；勿把英文 provider 错误直接返回客户端
- 工具：[`src/lib/shared/api-response.ts`](src/lib/shared/api-response.ts) — `jsonOk(data)` / `jsonFail(code, message, status)` / `readApiData<T>(res)`
- 业务码（`ApiErrorCode`）：`40001` 参数无效、`40401` 会话不存在、`50201` 高德上游失败；`50301` / `50302` 保留码位，环境变量缺省改由 `requireEnv` 抛错
- **例外**：`POST /api/chat` 成功为 AI SDK SSE 流（`createUIMessageStreamResponse`），非 JSON 信封；其 400 错误仍走信封
- 服务端组件直调 `lib/chat/store`（如 `chat/layout` 的 `listChats()`）不经 HTTP，无需信封
