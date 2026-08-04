<!-- BEGIN:nextjs-agent-rules -->

# 注意：这不是你熟悉的旧版 Next.js

本版本包含破坏性变更 — API、约定与文件结构可能都与训练数据不同。编写任何代码前，请先阅读 `node_modules/next/dist/docs/` 中的相关指南，并留意弃用提示。

<!-- END:nextjs-agent-rules -->

# AI Agent

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
- **修复 BUG 后须标注修复**：在相关代码处用简短注释标明「为何容易出错 / 为何这样改 / 以后勿再踩」，必要时同步更新本文件或 README 中的约定说明；仅修代码不留说明视为未完成

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
