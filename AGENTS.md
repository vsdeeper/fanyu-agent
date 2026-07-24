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
  app/
    api/chat/route.ts      # AI 流式对话 API（落盘）
    api/chats/route.ts     # 会话列表 / 新建
    api/chats/[id]/route.ts
    chat/layout.tsx        # 侧栏壳（跨 /chat/[id] 保持）
    chat/[id]/page.tsx     # 加载并 hydrate 会话
    page.tsx               # createChat → redirect /chat/[id]
    layout.tsx             # AntdRegistry + Providers
    globals.css
  components/
    Providers.tsx
    ChatShell.tsx / ChatSidebar.tsx
    Chat.tsx
  lib/
    chat-store.ts          # 本地 JSON 会话 CRUD
    chat-group.ts          # 侧栏时间分组（可客户端用）
    user-location.ts
public/
```

## 会话持久化约定

- 存储目录由环境变量 **`CHAT_STORE_DIR`** 指定（示例：`D:/华为云盘/ai-agent/chats`，Windows 建议正斜杠）；每个会话一个 `{id}.json`
- 磁盘存完整 **`UIMessage[]`**（含 reasoning / source-url），刷新可还原 Think 与引用
- **修复**：调方舟前仍用 `pruneMessages` 去掉历史 reasoning；持久化与模型入参解耦，勿把落盘也 prune 掉
- 路由：`/` 有历史则进最近会话，否则新建；`/chat/[id]` 打开会话；侧栏在 `chat/layout`，切换 id 不卸载；新建走侧栏「开启新对话」
- 明文 JSON + 云盘同步不适合高敏感内容

## 编码约定

- 与用户/AI 对话默认使用中文简体
- 提交说明使用中文 description 的 Conventional Commits
- **不引入 Tailwind**；样式优先 CSS Modules 与 Ant Design / Ant Design X
- App Router 下避免 `Bubble.List` 这类点号子组件写法，改为从独立路径导入（如 `@ant-design/x/es/bubble/BubbleList`）
- 完成修改后对改动文件执行格式化（`pnpm run format` 或依赖 lint-staged）
- 提交前由 lint-staged 检查暂存文件
- 编写 Next.js 相关代码前先查阅 `node_modules/next/dist/docs/`
- **修复 BUG 后须标注修复**：在相关代码处用简短注释标明「为何容易出错 / 为何这样改 / 以后勿再踩」，必要时同步更新本文件或 README 中的约定说明；仅修代码不留说明视为未完成
