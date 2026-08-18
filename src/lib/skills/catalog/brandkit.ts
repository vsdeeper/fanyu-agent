import type { Skill } from '../types';

/**
 * brandkit：高端品牌视觉规范板生图 skill。
 * 内容源自本地 Claude Code skill `C:\Users\como\.agents\skills\brandkit\SKILL.md`，
 * 保留其操作性约束、去掉重复表述后整理为指令正文；名称/描述面向中文菜单。
 */
export const brandkit: Skill = {
  id: 'brandkit',
  name: '品牌规范板',
  description: '生成高端品牌视觉规范板：logo 系统、版式、暗色科技 / 奢侈 / 文化风',
  icon: '🎨',
  instructions: `以资深品牌艺术指导身份生成品牌视觉规范板（brand-guidelines deck）。整体必须：有意图、高级、克制、连贯、策略性、可直接上稿；不生成泛化 logo、随机 mockup、AI 拼贴 moodboard。

【先定品牌策略】动笔前推断：品类 / 受众 / 产品功能 / 情感承诺 / 文化定位 / 信任层级 / 视觉世界 / 象征隐喻 / 品牌应避免什么。视觉系统必须基于意义，符号不可随机挑选。

【Logo 标准】简洁、可记忆、有象征、可缩放、可拥有、与品牌理念相连，可作 icon / wordmark / badge / UI mark / 图案复用。避免：泛化闪电、随机动物、伪奢华纹章、抄袭名标、过度复杂、剪贴画、无意义闪光、不一致变体。
手法（最多叠加两种）：1) 首字母+隐喻（如 K + kite / 方向）；2) 产品动作符号（build→框架、protect→盾、speak→波形）；3) 隐喻融合（owl + drone 视野、shield + 山）；4) 负空间（藏箭头、切口首字母）；5) 构造几何（圆、斜切、网格、轨道线）。

【版式】默认 3×3 网格、4:3 或 16:10、干净 presentation 画布、panel 间强 gutter、统一留白；可用 2×3 / 2×2 / 1×3 / 4×2 或自定义。3×3 面板顺序：logo 封面 → logo 构造 → 数字应用（浏览器 / 终端 / dashboard）→ 品牌本质 tagline → 色彩系统 → 字体 → 实体应用（卡片 / 徽章 / 包装）→ 图像方向 → 系统细节。整体要有节奏（安静-功能-情绪-技术-氛围-细节），不要每格同样响亮。

【视觉模式】按品牌选一种：Dark Developer（近黑面板 + 等宽 + 命令行线索，青 / 蓝 / 珊瑚点缀）；Dark Product（黑 / 暗红 / 琥珀 + 发光 UI chip + 分段流程）；Dark Nature（深绿 + 青柠 + 雾景，宁静可信）；Dark Security（黑 / 藏青 + 盾 + 雷达线 + 红蓝告警 chip）；Light Editorial（暖象牙 + 纸纹理 + 衬线小标 + 印章徽章）；Luxury（象牙 / 石材 / 浓缩咖啡 + 衬线 wordmark + 纸纹 + 压印）；Voice（深靛蓝 + 淡紫光 + 波形 / 麦克风）；Cultural（半调 + CRT + 粗印 + 大胆强调色）。

【文本】文字极少：品牌名 + 一句 tagline + 一个 URL + 一条命令 + 2–5 个分区标签 + 短 UI chip。禁止长段落、假小字、lorem ipsum、密集菜单。tagline 短而具体（如 "Build better."），禁口号堆砌。

【色彩】单一主导色板：基色 + 主强调 + 次强调 + 中性；强调色跨 panel 重复；无彩虹、无泛化 AI 紫蓝光。

【Mockup / 图像】有 art-direction：浏览器 chrome、终端、URL bar、app icon、卡片堆叠、徽章 / 印章 / 文件夹、dashboard 局部、输入条、产品标签。禁完整假 dashboard、廉价高光 mockup、设备堆砌。图像用电影感山景、黄昏、半调云、CRT 场景、质感纸张背景；禁通用库存人物、办公室照片、机器人俗套。

【细节语言】小页码、页脚小标、对齐标记、构造线、细 rule、低透明度纹理、半调图像处理、一个高亮词、一个强调 chip、一个强图标态——克制使用。

【参考图】用户给参考时只提取：版式节奏 / 网格 / 间距 / 字阶 / 视觉密度 / logo 位置 / 文字量 / 图像处理 / 强调色逻辑 / 品牌系统行为；不复制其 logo、名称、构图、口号、独特视觉资产。

【反泛化】不做：随机漂浮图标、通用渐变、过度设计 logo、无意义 blob、杂乱拼贴、假小 UI、logo 不一致、过多颜色、廉价霓虹、模板品牌板、PPT 风、无灵魂 SaaS dashboard。宁可更安静、更锐利、更有意图。`,
  samplePrompt: '生成 XX 品牌的高端视觉规范板，3×3 版式',
};
