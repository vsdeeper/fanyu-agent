# 对话式电商商品图生成 · 分阶段实施方案

> 状态：设计草案（2026-08）· 待实现 · 保存于项目内供日后使用
> 关联：`src/lib/images/`（生图管线）、`src/lib/chat/stream-chat.ts`（工具注册与指令）

## Context

目标是在 FanyuAgent（Next.js + Vercel AI SDK + Seedream 生图）上做「**和 AI 对话来生成电商商品图**」。已调研 picell 及业界做法，并确认两个关键决策：

- **调研结论**：picell（即 Picset AI 更名）是「一张实拍图 → 整套电商营销图」平台，主打**主体保护、只改背景**，偏表单式。行业共识闭环：**上传产品图 → 收集（品类/平台/风格/卖点）→ 生成（多候选、主体不变）→ 编辑（改背景/改字/局部重绘）→ 按平台尺寸导出**。绘蛙 WaClaw 是最接近的对话式 Agent 参照。**一致性（产品本体不变）是护城河。**
- **用户决策**：① 方案**渐进式、可分阶段实施**；② **开发「图片识别 tool」扩展主模型识图能力**（主模型保持默认 DeepSeek，工具内部调方舟视觉模型 doubao-seed，回喂结构化描述），而非整体切换视觉 Provider。

**本项目现状（已核实）**：

- 用户上传图片**已通**：`ChatSender` 文件/粘贴/拖拽 → FileUIPart（data URL）→ UIMessage → `/api/chat` → `convertToModelMessages` 转 `input_image` 透传。但 **DeepSeek 纯文本看不了图**。
- `generate_image` 工具具备生成/改图（i2i）/`workingImageAssetId` 多轮继承，但 **edit 只认 `image_assets` 里已落盘的 assetId**，**用户上传图不落盘** → 无法作为底图引用。全库无图片上传 API。
- 可复用原语：`saveImageAsset`（写盘+插表+setWorkingAsset）、`assetToDataUrl`、`getAsset/getWorkingAsset/setWorkingAsset`、`buildImageAssetUrl`、`generateImageViaRouter`、`size.ts` 的 `2K/4K` 与像素校验；识图可复刻 `select-model.ts` 的 `getArkClient().chat(modelId)` + `generateText` 一次性调用范式。

## 交互设计（对话形式）

一轮电商图生成，用户与 AI 的对话形态：

1. **上传与意图识别**：用户上传产品图（一张或多张）并发指令（如「帮我做张淘宝主图」「把产品放进场景里」）。服务端把最新用户图**幂等落盘**为资产（前端零改动）。
2. **识图（新增）**：AI 先调 `analyze_image` 工具 → 方舟视觉模型返回结构化分析（品类/材质/主色/形状/原背景/建议卖点/是否适合电商图），**回喂主模型**。产品信息由此驱动，不靠主模型猜。
3. **分步收集、一次一问**：AI 按清单逐项追问**缺失项**（品类 → 平台/画幅 → 风格 → 卖点 → 是否留文字区），用户已提供的（含识图得出的）不重复问。**指令驱动 + 工具 schema 引导，非硬状态机。**
4. **生成前一句话复核**：出图前 AI 复述「我将生成：品类 X、平台 Y、画幅 1:1、风格 Z、卖点…，确认吗？」，用户确认或修正后才调用生图工具。
5. **出图**：`generate_commerce_image` 以产品图为 i2i 参考（`from_product`），prompt 结构化拼装（**主体 100% 不变，只换背景/场景/打光/风格**）+ 平台尺寸映射。
6. **基于生成图迭代**：改图优先 `from_previous`（基于上一张生成图 edit，保留风格）；用户要求回到产品图重做则 `from_product`。复用现有 working image / parentId 链。

设计要点（对齐行业共识）：分步收集避免信息过载；生成前复核闸门；**产品图作为持久参考资产 + 对话历史天然形成「项目记忆」**；编辑策略（改背景回到产品图、微调基于生成图）避免主体失真；**多源图批量修改**（一次对多张源图下同一修改指令 → 逐张出图）作为 Phase 3 扩展场景（见下文）。

## 技术方案（分阶段）

### Phase 1 — 识图工具 + 用户上传图落盘（小改动，先单独验收「识图」）

**1a. schema 两列 + migration**

- `src/lib/db/schema.ts`：`chats` 加 `productImageAssetId: text('product_image_asset_id')`（「最近一张上传产品图」默认指针，O(1) 查询，与 `workingImageAssetId` 同构）；`imageAssets` 加 `source: text('source')`（上传图溯源 `message:<messageId>:<partIndex>`，幂等去重；生成图为 null）。
- 跑 `drizzle-kit generate` + `migrate`（`getDb()` 初始化自动执行）。

**1b. 桥接函数** `src/lib/images/commerce/product-asset.ts`：

- `dataUrlToBytes(dataUrl)`：切逗号后 base64 解码。
- `ensureProductImageAsset(chatId, messages)`：**遍历最新 user 消息里的全部 image `file` part、逐个落盘**（多图上传一并落盘；前端已支持最多 5 张附件）。每张拼 `source` 标记（`message:<messageId>:<partIndex>`）查 `image_assets` 去重；不存在则 `saveImageAsset({ chatId, parentId: null, modelId: 'user-upload', prompt: '用户上传的产品图（桥接自对话消息）', bytes, mimeType, source })`；落盘后把**最近一张** `setProductImageAsset` 为默认指针。
- **多图溯源与回查**：`image_assets` 里 `chat_id=? AND source IS NOT NULL` 即本会话全部上传图（**无需新表**）；`product_image_asset_id` 仅是「最近一张」快捷指针，工具可另传 `productAssetIds[]` 指定多张（见 Phase 2 / 3）。
- **哨兵 modelId `'user-upload'`**（定义在 `src/lib/images/types.ts` 共享）保持 `image_assets.modelId` 非空约束且语义真实。
- **必做 guard**：`src/lib/images/router.ts` 的 `resolveImageModelId` 里，`parentModelId` 为 `'user-upload'` 时跳过（否则用户直接对产品图 `generate_image mode=edit` 会继承哨兵而报「不支持的生图模型」）。
- `assets.ts` 增 `getProductImageAsset(chatId)` / `setProductImageAsset(chatId, assetId)`（读写 `chats.product_image_asset_id`）；`saveImageAsset` 加可选 `source` 参数。
- **调用点**：`src/lib/chat/stream-chat.ts` 的 `streamChatResponse`，在 `selectModel` 之后、`convertToModelMessages` 之前 `await ensureProductImageAsset(chatId, messages)` —— 一处覆盖 submit + continue + 改图全部路径；`source` 去重保证不重复落盘。

**1c. 识图工具** `src/lib/images/commerce/analyze-tool.ts` + `src/lib/images/vision/vision.ts`：

- env：新增 `ARK_VISION_MODEL_ID`（可选，缺省回退 `ARK_MODEL_PRO`=doubao-seed-2-0-pro，本身多模态）。
- `analyzeProductImage(dataUrl, question?)`：复刻 `select-model.ts` 的 `getArkClient().chat(modelId)` + `generateText` 模式（**Chat Completions**，勿用 Responses——非流式缺 annotations 会 schema 校验失败），`messages` 传 `[{ type:'image', image:dataUrl }, { type:'text', text:... }]`，`instructions` 要求输出严格 JSON（品类/材质/主色/形状/原背景/卖点/是否适合电商图/建议），容错 `extractJsonObject` + zod 校验，失败返回 `{ok:false,error}` 不阻塞主对话。
- `createAnalyzeImageTool(chatId)`：沿用 `createGenerateImageTool` 工厂模式。`inputSchema: { assetId?, question? }`；execute 取资产（`assetId` → `getProductImageAsset` → `getWorkingAsset`，校验归属 chatId）→ `analyzeProductImage(assetToDataUrl(asset))`；`toModelOutput` 返回结构化中文摘要（品类/材质/主色/卖点/建议），**并提示「据此构建生图方案，勿臆造产品不存在的细节」**。
- 注册进 `stream-chat.ts` 的 `tools`（`generate_image` 旁），`baseInstructions` 追加一行：「用户上传产品图并做电商图时，先调用 analyze_image 再收集信息。」

**验收**：上传一张或多张图 → 发「这是什么产品，适合做淘宝主图吗」→ 看到 `analyze_image` 被调用并回述结构化信息；`image_assets` 里每张上传图各有一行 `source='message:...'`、`chats.product_image_asset_id` 指向最近一张；「继续」不产生重复资产行。

### Phase 2 — 电商生图工具 + 对话收集流程（核心）

新增 `src/lib/images/commerce/`：`tool.ts`、`scenes.ts`、`platforms.ts`、`prompt.ts`、`hint.ts`、`types.ts`（`product-asset.ts` 已在 Phase 1）。

- **`scenes.ts`**：品类→场景模板（美妆→高级感梳妆台柔光、3C→深色霓虹科技感、服饰→幕布/模特自然光、食品→暖木餐桌、家居→北欧客厅；未命中回退「干净高级电商棚拍」）。
- **`platforms.ts`**：平台→尺寸映射，全部落在 Seedream 像素区间 [3,686,400, 16,777,216]：taobao/jd 主图 1:1=2048x2048、详情 3:4=1728x2304；douyin 9:16=1600x2848；pdd 1:1/9:16；amazon 1:1/16:9=2560x1440。`resolveCommerceSize(platform, aspectRatio)` 缺省 2048x2048。
- **`prompt.ts`**：`buildCommercePrompt(input)` 结构化拼装，核心措辞「以参考图产品为唯一主体，形状/颜色/材质/细节 100% 不变，仅更换背景、场景与打光」+ 场景/风格/用途画幅/卖点文案/是否预留文字区 + 负向「禁止改变主体、禁止添加不存在的部件」。
- **`tool.ts`**：`createGenerateCommerceImageTool(chatId)`。`inputSchema: { mode: 'from_product'|'from_previous', productAssetId?, category?, platform?, aspectRatio?, style?, scene?, sellingPoints?, textArea?, size? }`（MVP 单主图；多图时扩为可选 `productAssetIds?: string[]`，缺省用默认指针，向后兼容）。execute：`from_product` 取产品图（productAssetId → 当前产品图 → working image），`from_previous` 取 working image → 复用 `generateImageViaRouter({ modelId: 默认 Seedream, prompt, mode:'edit', referenceImageDataUrls:[assetToDataUrl(sourceAsset)], size })` → `saveImageAsset`（parentId=源图）→ 返回 `{ok, assetId, url, parentId}`，`toModelOutput` 复用「已生成，界面自动展示」文案。
- **`hint.ts`**：`IMAGE_COMMERCE_HINT` 指令文本（进入条件、先 analyze、分步一次一问、生成前一句话复核、from_product vs from_previous 策略、平台画幅规范、正文勿插 Markdown 图）。注入 `stream-chat.ts` 的 `baseInstructions`（`${getImageSystemHint()}\n\n${IMAGE_COMMERCE_HINT}`）。
- 注册 `generate_commerce_image` 进 tools；`stopWhen: stepCountIs(5)` 不够可升 `stepCountIs(8)`。

**验收**：端到端「上传 → 识图 → 分步追问 → 一句话复核 → 出图 → 改图 → 刷新还原」；`image_assets` 生成行 `parent_id` 串成链（upload → commerce1 → commerce2…）。

### Phase 3 — 增强（可选，逐个独立落地）

- **多候选 + 前端选图**：`ark-seedream.ts` 透传 `n`/`sequential_image_generation`（**需实测该接入点字段**）→ 工具循环 `saveImageAsset` 存多张、输出 `assetIds[]` → `GenerateImageBlock` 改画廊 + 每张「用这张继续」；新增 `POST /api/images/[assetId]/activate` 调 `setWorkingAsset`（校验归属 chatId）。前端改动点：`GenerateImageBlock.tsx`。
- **多源图修改（批处理）**：场景——用户一次指定多张源图（产品图或已生成图）并下同一修改指令（如「把这 3 张背景都换成白色」「两张产品的背景统一成卧室」）。入参扩 `sourceAssetIds[]` / `productAssetIds?: string[]`（缺省用默认指针，向后兼容）。执行：工具层对每张源图各走一次 i2i 生成、各自 `saveImageAsset`（parentId=各自源图，独立 parent 链），输出 `assetIds[]` 供前端多图渲染；HINT 引导「同时修改多张图时逐张生成、逐张说明」。**注意**：现有 `generate_image` edit 的 `sourceAssetIds` 已是数组但 execute 只取 `[0]`，做多源修改需改为逐张循环；批量 N 张留意上游速率与计费。
- **多参考合成（待实测）**：产品图 + 风格图等合成一张，需先验证 Seedream `body.image` 是否接受多参考数组；不支持则退化为「第一张 + prompt 描述其余」。
- **平台/画幅快捷选择**：`COMMERCE_PLATFORMS` 抽纯常量供前端 import，`ChatSender` 命中电商流程时显示 chips，选中值以文本前缀发给模型转工具参数（不改流式协议）。
- **风格锁定**：`chats` 加 `commerceStyle` 列（可选 migration）；工具 `style` 缺省读缓存、输入了新 style 则写回；HINT 引导「锁定这个风格」后续沿用。

## 关键文件

**改动**：

- `src/lib/db/schema.ts`（两列）+ 新 migration
- `src/lib/images/assets.ts`（`saveImageAsset` 加 `source`、`get/setProductImageAsset`）
- `src/lib/images/router.ts`（哨兵 guard）
- `src/lib/chat/stream-chat.ts`（桥接调用 + 两个工具注册 + HINT 注入）
- `src/lib/chat/providers/config.ts`（`getVisionModelId`）
- `.env.example`（新增 `ARK_VISION_MODEL_ID` 说明）

**新增**：

- `src/lib/images/commerce/{tool,scenes,platforms,prompt,hint,types,product-asset}.ts`
- `src/lib/images/commerce/analyze-tool.ts`、`src/lib/images/vision/vision.ts`
- （Phase 3 可选）`src/app/api/images/[assetId]/activate/route.ts`

**复用**：`generateImageViaRouter`/`resolveImageModelId`（router.ts）、`saveImageAsset`/`assetToDataUrl`/`getWorkingAsset`/`setWorkingAsset`/`buildImageAssetUrl`（assets.ts）、`createGenerateImageTool` 工厂与 `toModelOutput` 模式（generate-image-tool.ts）、`size.ts` 校验、`getArkClient().chat()+generateText` 一次性视觉调用范式（select-model.ts）、`getDeepseekInstructions` 注入结构（deepseek/instructions.ts）。

## 实施顺序

Phase 1a（schema+桥接）→ Phase 1b/1c（analyze tool，单独验收识图）→ Phase 2（commerce tool + HINT，先人工校准一段保主体 prompt）→ 回归 `generate_image` edit 不受哨兵影响 → Phase 3 逐项增强。

## 验证（本地 `pnpm dev`）

1. `.env.local` 确认 `ARK_API_KEY/ARK_BASE_URL` 已配；可选加 `ARK_VISION_MODEL_ID`。
2. 改 schema 后 `pnpm db:generate && pnpm db:migrate`，`pnpm dev`。
3. 新会话上传一张产品图 → 发「帮我做张淘宝主图」。
4. 观察：先 `analyze_image`（Think 可见 tool-call）→ 一次一问（品类/平台/风格/卖点/文字区）→ 一句话复核 → `generate_commerce_image` 出图。
5. `GenerateImageBlock` 展示图、`/api/images/{assetId}` 可访问、正文无 Markdown 图/URL。
6. 查 `chats.db`：`image_assets` 有 `source='message:...'` 上传行与带 `parent_id` 的生成行；`chats.product_image_asset_id` / `working_image_asset_id` 已写。
7. 刷新页面还原历史图；改图「把背景换成夜景」（from_previous）与「回到产品原图重做」（from_product）。
8. 幂等：tool 阶段中断后「继续」，不新增重复上传资产行。
9. 降级：改错 `ARK_VISION_MODEL_ID` → `analyze_image` 返回友好错误，主对话不崩、commerce 仍可出图。

## 风险

- **核心风险：Seedream i2i「主体不变只换背景」保真度不确定**（跨画幅可能拉伸/重构产品）。缓解：prompt 强约束 + 默认 1:1 贴近产品 + scene 提供「原背景仅调光/留白」低重绘变体 + 首版以「能出图、主体基本不变」为目标，prompt 措辞需人工校准迭代。
- DeepSeek 主模型可能忘记调 analyze/臆造 → HINT + tool description 双保险，commerce prompt 由识图结构化结果驱动。
- 视觉模型不支持多模态会报错 → `analyzeProductImage` 已 try/catch 返回友好错误。
- Phase 3 的 `n` 参数与 Seedream 多参考图支持度均未知，落地前须实测（多参考不支持时退化为「第一张 + prompt 描述其余」）。
