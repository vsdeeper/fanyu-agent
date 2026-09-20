import type { StyleDimension } from './types';

/**
 * 文风维度卡片库 —— 只改这一个文件即可增删维度 / 分类 / 卡片。
 *
 * 约定：
 * - tag 会拼进发给服务端的文风文本，请写成关键词（如「外聚焦、低调陈述」）；
 *   description 只显示在弹框里作解释，不进提示词。
 * - id 全局唯一，且一旦被选过就不要再改，否则旧任务的已选会失效。合并两根轴时
 *   不要把幸存卡片的 id 顺手改成新前缀——语义没变就沿用旧 id，能救回旧任务已选。
 * - groups / cards 留空即空态，UI 显示「该维度暂无可选卡片」。
 *
 * 结构约定：
 * - 每个 group 是一根**独立的轴**，`exclusive` 标注该轴是否互斥：
 *   true → 组内单选（温度、收束方式这类一根连续轴，多选会拼出自相矛盾的提示词）；
 *   false → 组内可多选（词汇、意象这类彼此不冲突的并列要求）。
 * - `label` 是轴的短名，拼提示词时作前缀（「人称=第三人称」）；`title` 只做弹框分组标题。
 * - **不同维度之间不得共用同一根轴**。历史上温度、密度、时间位置、解决方式各自被
 *   贴了 2～4 层皮散落在多个维度里，拼出的提示词互相抵消；新增卡片前先确认这根轴
 *   在当前维度是否已经存在。
 *
 * 几处易混轴的边界（勿合并）：
 * - 时空编排·时间位置 = **叙述**站在哪个时间点讲；情感质地·情感时间结构 = **情感自身**
 *   的时序（事情发生时没感觉、过后才涌上）。两者不同层，可同时成立。
 * - 主题风格·关涉对象 = 这篇讲几个人；语言质地·对话 = 对话在文本里起什么作用。
 */
export const STYLE_DIMENSIONS: readonly StyleDimension[] = [
  {
    key: 'narrativeStance',
    label: '叙事姿态',
    groups: [
      {
        title: '一、按「人称」分',
        label: '人称',
        exclusive: true,
        cards: [
          {
            id: 'voice-first',
            tag: '第一人称',
            description: '用「我」讲。别让「我」变成布道者——理想状态是一个还在路上的人。',
          },
          {
            id: 'voice-second',
            tag: '第二人称',
            description:
              '用「你」讲，像自我对话。容易变成说教；用得好可写出「分裂出去的另一个自己」。',
          },
          {
            id: 'voice-third',
            tag: '第三人称',
            description: '用「他/她」讲。最客观也最灵活——像一台安静的摄影机。',
          },
          {
            id: 'voice-plural',
            tag: '第一人称复数',
            description: '用「我们」讲。制造共同体感，警惕变成集体抒情。',
          },
          {
            id: 'voice-none',
            tag: '无人称',
            description: '没有「我」「你」「他」，只有动作和景物，像古诗。写「无我」时用。',
          },
        ],
      },
      {
        title: '二、按「聚焦」分',
        label: '聚焦',
        exclusive: true,
        cards: [
          {
            id: 'external-focus',
            tag: '外聚焦',
            description: '只写外部言行与对话，不进任何人的内心，读者自己拼出真相。',
          },
          {
            id: 'internal-focus',
            tag: '内聚焦',
            description:
              '只写某个人物的所见所思。分固定（始终一人）、不定（多人轮流）、多重（同一事件多人分别讲）。',
          },
          {
            id: 'omniscient',
            tag: '全知视角',
            description: '像上帝一样知道所有人的内心和来龙去脉。慎用，容易滑向说教与审判。',
          },
          {
            id: 'zero-focus',
            tag: '零聚焦',
            description: '只记录发生了什么，不解释、不评价，比外聚焦更冷。适合荒诞、疏离的主题。',
          },
        ],
      },
      {
        title: '三、按叙述者的「站位」分',
        label: '站位',
        exclusive: true,
        cards: [
          {
            id: 'insider-view',
            tag: '局内人',
            description:
              '叙述者在故事内部，是参与者。有立场、有盲区、有情感卷入；用「我」讲自己的经历即属此类。',
          },
          {
            id: 'outsider-view',
            tag: '局外人',
            description:
              '叙述者在故事外部，是观察者。不参与、不评判、不站队；用「他/她」讲别人的事即属此类。',
          },
          {
            id: 'boundary-view',
            tag: '边界站位',
            description:
              '站在内外交界处，一只脚在里面，一只脚在外面。写「修行者回到世俗生活」常用。',
          },
          {
            id: 'multi-boundary-view',
            tag: '多重边界',
            description: '在多个边界之间切换：故乡与异乡、过去与现在。写「漂泊」的核心视角。',
          },
        ],
      },
      {
        title: '四、按「视角距离」分',
        label: '距离',
        exclusive: true,
        cards: [
          {
            id: 'close-view',
            tag: '贴身距离',
            description: '紧贴人物，几乎同步感受。适合写「当下」「觉察」。',
          },
          {
            id: 'medium-view',
            tag: '中距',
            description: '保持一段距离，看得见动作，但不完全进入内心。近到能看见，远到不打扰。',
          },
          {
            id: 'far-view',
            tag: '远距',
            description: '站得很远，人物变成一个小点，故事变成一幅画。适合写「无常」「渺小」。',
          },
          {
            id: 'distance-shift',
            tag: '距离切换',
            description: '同一篇里视角忽远忽近。距离的变化本身就是情感的变化。',
          },
        ],
      },
      {
        title: '五、按「叙述可靠度」分',
        label: '可靠度',
        exclusive: true,
        cards: [
          {
            id: 'reliable-narrator',
            tag: '可靠叙述者',
            description: '叙述可信，和故事隐含的价值观一致，读者可以照单全收。',
          },
          {
            id: 'unreliable-narrator',
            tag: '不可靠叙述者',
            description:
              '叙述有偏差、隐瞒或误解，读者要读出言外之意。适合写「他以为放下了，读者却看得出」。',
          },
        ],
      },
      {
        title: '六、按叙述者的「态度」分',
        label: '态度',
        exclusive: true,
        cards: [
          {
            id: 'understatement',
            tag: '低调陈述',
            description: '刻意把重的事往轻里说。不渲染悲伤，悲伤反而更重。',
          },
          {
            id: 'irony',
            tag: '反讽',
            description: '表面说一套，实际意思相反。容易显得刻薄；「温柔的自我反讽」例外。',
          },
          {
            id: 'camera-eye',
            tag: '零度叙事',
            description: '完全不流露情感，像摄像机一样记录。适合写「痛而不言」的部分。',
          },
          {
            id: 'intrusive-commentary',
            tag: '介入式议论',
            description: '叙述者跳出来发表观点、评价人物。要用的话最好以自嘲介入，避免居高临下。',
          },
        ],
      },
    ],
  },
  {
    key: 'spacePerspective',
    label: '时空编排',
    groups: [
      {
        title: '一、按「叙述的时间位置」分',
        label: '时间位置',
        exclusive: true,
        cards: [
          {
            id: 'retrospective',
            tag: '事后回看',
            description: '站在事情发生之后回看，天然带反思和沉淀感。最常用的一种。',
          },
          {
            id: 'simultaneous',
            tag: '同步进行',
            description: '叙述和事件同步进行，像现场直播。适合写「当下」「觉察」。',
          },
          {
            id: 'proleptic',
            tag: '提前预言',
            description: '提前透露结局，制造宿命感。适合写「无常」。',
          },
          {
            id: 'mixed-view',
            tag: '三层交错',
            description: '过去、现在、未来交替叠加。适合写「时间中的修行」，写出未完成感。',
          },
          {
            id: 'theme-time-none',
            tag: '无时间',
            description: '不指向任何具体时间，像抽离了钟表的状态。',
          },
        ],
      },
      {
        title: '二、按空间的「功能」分',
        label: '空间功能',
        exclusive: false,
        cards: [
          {
            id: 'physical-space',
            tag: '物理空间',
            description: '故事发生的具体场所：房间、街道、城市、山川。不只是背景，是心境的延伸。',
          },
          {
            id: 'psychological-space',
            tag: '心理空间',
            description:
              '人物内心的地形：记忆的迷宫、情绪的深渊、认知的边界。常投射到物理空间上写。',
          },
          {
            id: 'social-space',
            tag: '社会空间',
            description:
              '人物所处的阶层、圈子、人际网络。写出「在写字楼修行」和「在山里修行」的差别。',
          },
          {
            id: 'textual-space',
            tag: '文本空间',
            description:
              '叙述本身营造的空间感：留白、跳跃、省略留下的空隙。不填满，让读者在空隙里呼吸。',
          },
        ],
      },
      {
        title: '三、按空间的「尺度」分',
        label: '空间尺度',
        exclusive: false,
        cards: [
          {
            id: 'micro-space',
            tag: '微观',
            description: '一个杯子、一道裂缝、一粒米。从极小的东西里写出整个世界。',
          },
          {
            id: 'meso-space',
            tag: '中观',
            description: '一间屋子、一条街、一个村庄。日常生活的尺度，也是修心最真实的现场。',
          },
          {
            id: 'macro-space',
            tag: '宏观',
            description: '一座城市、一片大陆、一个时代。容易空泛，谨慎使用。',
          },
          {
            id: 'scale-shift',
            tag: '跨尺度切换',
            description: '从一粒米写到一座城。用微观动作承载宏观主题，高级手法。',
          },
        ],
      },
      {
        title: '四、按空间的「移动方式」分',
        label: '空间移动',
        exclusive: true,
        cards: [
          {
            id: 'fixed-space',
            tag: '固定不移',
            description: '故事只在一个地点，不移动，像独幕剧。写「日常修行」常用。',
          },
          {
            id: 'linear-movement',
            tag: '线性移动',
            description:
              '人物按时间顺序从一地到另一地。写「寻找自我」的旅程可用；注意移动不等于抵达。',
          },
          {
            id: 'radiating-movement',
            tag: '辐射式移动',
            description:
              '以某个中心点向四周扩散，反复回到同一处，每次带回不同的东西。写「回乡」常用。',
          },
          {
            id: 'rootless-movement',
            tag: '无根漂泊',
            description: '不断移动，没有固定坐标，处处经过却无处抵达。地理的漂泊对应心理的未完成。',
          },
          {
            id: 'circular-movement',
            tag: '循环移动',
            description: '回到原点，但已经不是原来的自己。写「修行一圈，山还是那座山」。',
          },
        ],
      },
    ],
  },
  {
    key: 'emotionTexture',
    label: '情感质地',
    groups: [
      {
        title: '一、按情感的「温度」分',
        label: '温度',
        exclusive: true,
        cards: [
          {
            id: 'heat-burning',
            tag: '炽热',
            description: '情感直接、浓烈、外放。慎用，太烫容易灼伤读者，也容易滑向煽情。',
          },
          {
            id: 'heat-warm',
            tag: '温润',
            description: '有温度但不烫手，像一杯放了一会儿的茶。暖，但不逼近。',
          },
          {
            id: 'heat-cool',
            tag: '微凉',
            description: '带着一层薄薄的凉意，不冷也不热。写孤独、疏离、「算了」时常用。',
          },
          {
            id: 'heat-cold',
            tag: '冷峻',
            description: '情感压到最低，几乎不流露。写「痛而不言」「已经习惯了」时用。',
          },
          {
            id: 'heat-freezing',
            tag: '冰点以下',
            description: '比冷峻更冷，带荒诞感或虚无感。慎用，容易让读者觉得太丧。',
          },
        ],
      },
      {
        title: '二、按情感的「密度」分',
        label: '密度',
        exclusive: true,
        cards: [
          {
            id: 'density-thick',
            tag: '浓稠',
            description: '密集、层层叠加，几乎不透气。写思念、执念时用；要克制，否则变成纠缠。',
          },
          {
            id: 'density-thin',
            tag: '稀薄',
            description: '稀释在大量日常细节里，散落在动作、对话、景物中。淡，但无处不在。',
          },
          {
            id: 'density-intermittent',
            tag: '间隙式',
            description: '时有时无，像信号不好的灯。写「以为放下了，某个瞬间又疼了一下」。',
          },
          {
            id: 'density-vacuum',
            tag: '真空式',
            description: '刻意抽空，只留动作和对话。读者能感觉到下面有东西，但叙述者不说。',
          },
        ],
      },
      {
        title: '三、按情感的「身体性」分',
        label: '身体性',
        exclusive: true,
        cards: [
          {
            id: 'body-embodied',
            tag: '具身',
            description: '通过身体反应呈现：胃里一沉、喉咙发紧、手指发麻。情绪首先住在身体里。',
          },
          {
            id: 'body-disembodied',
            tag: '离身',
            description: '与身体分离，只存在于意识层面。写「解离」「麻木」时用。',
          },
          {
            id: 'body-somatized',
            tag: '躯体化',
            description: '心理情感转化为身体症状：焦虑变成失眠，悲伤变成背痛。写「身心一体」时用。',
          },
          {
            id: 'body-actionized',
            tag: '动作化',
            description: '完全通过动作呈现，不进入身体内部。动作比形容词更诚实。',
          },
        ],
      },
      {
        title: '四、按情感的「表达方式」分',
        label: '表达方式',
        exclusive: true,
        cards: [
          {
            id: 'express-direct',
            tag: '直抒胸臆',
            description: '直接说出情感。慎用，太直白，没有余味。',
          },
          {
            id: 'express-implied',
            tag: '暗示',
            description:
              '通过动作、对话、景物暗示情感（借景抒情、借事抒情都归此类）。让读者自己完成「悟」的动作。',
          },
          {
            id: 'express-anti-lyrical',
            tag: '反抒情的抒情',
            description:
              '越想表达深情越往回收。写思念不写「我想你」，写「今天路过那家店，没进去」。',
          },
          {
            id: 'express-displaced',
            tag: '错位表达',
            description: '用相反的情感表达真实情感：悲伤用笑，在乎用冷漠，想留用「你走吧」。',
          },
          {
            id: 'express-silence',
            tag: '沉默表达',
            description: '完全不说，只留空白。不说，是最重的说。',
          },
        ],
      },
      {
        title: '五、按情感的「道德姿态」分',
        label: '社会姿态',
        exclusive: true,
        cards: [
          {
            id: 'stance-judging',
            tag: '审判式',
            description: '站在道德高地评判人物或读者的情感。大忌。',
          },
          {
            id: 'stance-complicit',
            tag: '共谋式',
            description: '与读者站在一起共同面对。「我们都一样」可用，但要避免集体抒情。',
          },
          {
            id: 'stance-observing',
            tag: '旁观式',
            description: '不站队，只呈现。像一面镜子，不解释照见了什么。',
          },
          {
            id: 'stance-self-deprecating',
            tag: '自嘲式',
            description: '对自己也保持距离，带温和的反讽。能消解说教感。',
          },
          {
            id: 'stance-gentle-cruelty',
            tag: '温柔的残忍',
            description:
              '不回避痛苦，不粉饰困境，也不居高临下地点醒。不审判任何人，包括叙述者自己。',
          },
        ],
      },
      {
        title: '六、按情感的「关系性」分',
        label: '关系性',
        exclusive: true,
        cards: [
          {
            id: 'relation-unrequited',
            tag: '单向情感',
            description: '一方有情感，对方不知道或不回应。写暗恋、单向的亲情。',
          },
          {
            id: 'relation-mismatched',
            tag: '双向错位',
            description: '双方都有情感，但不在同一个频道上。写「错过」常用。',
          },
          {
            id: 'relation-collective',
            tag: '共同体情感',
            description: '一群人共享某种情感。可用，但要避免集体煽情。',
          },
          {
            id: 'relation-solitary',
            tag: '孤独的情感',
            description: '只属于一个人，无法分享。孤独浮在表面而不被解决。',
          },
        ],
      },
      {
        title: '七、按情感的「时间性」分',
        label: '情感时间结构',
        exclusive: true,
        cards: [
          {
            id: 'timing-immediate',
            tag: '即时',
            description: '此刻正在发生的情感。写「当下」的觉察：愤怒升起的那一秒。',
          },
          {
            id: 'timing-delayed',
            tag: '延迟',
            description: '事情发生时没感觉，过后才涌上来。写「无常」常用。',
          },
          {
            id: 'timing-anticipatory',
            tag: '预期',
            description: '事情还没发生，情感先到了。写「放下」的前奏。',
          },
          {
            id: 'timing-mismatched',
            tag: '错时',
            description: '情感与事件的时间线错位。写「未完成」的核心质地。',
          },
        ],
      },
    ],
  },
  {
    key: 'languageTexture',
    label: '语言质地',
    groups: [
      {
        title: '一、按句子的「长度与节奏」分',
        label: '节奏',
        exclusive: true,
        cards: [
          {
            id: 'rhythm-short',
            tag: '短句平缓',
            description: '句子短，但节奏不急促，像一下一下的呼吸。短，但有停顿；平，但有暗涌。',
          },
          {
            id: 'rhythm-long',
            tag: '长句绵密',
            description: '层层嵌套，像一条不断流的河。慎用，容易让读者喘不过气。',
          },
          {
            id: 'rhythm-alternating',
            tag: '长短交错',
            description: '短句为主，偶尔一个长句打破节奏。写「情绪突然涌上来」时用。',
          },
          {
            id: 'rhythm-fragment',
            tag: '碎片断句',
            description: '句子不完整，主谓宾残缺，像意识碎片。写「走神」「恍惚」时用。',
          },
          {
            id: 'rhythm-repetition',
            tag: '重复节奏',
            description: '同一句式反复出现，像敲木鱼。写「执念」「循环」时用。',
          },
        ],
      },
      {
        title: '二、按词汇的「质感」分',
        label: '词汇',
        exclusive: false,
        cards: [
          {
            id: 'word-concrete',
            tag: '具体名词',
            description: '用看得见摸得着的东西：杯子、裂缝、水龙头。比抽象名词更有力量。',
          },
          {
            id: 'word-abstract',
            tag: '抽象名词',
            description: '用概念和情感词：孤独、自由、放下、觉察。慎用，容易滑向说教。',
          },
          {
            id: 'word-verb-first',
            tag: '动词优先',
            description: '用动作代替状态。不写「他很难过」，写「他把那封信折好，放回信封」。',
          },
          {
            id: 'word-few-adjectives',
            tag: '形容词克制',
            description: '少用形容词，尤其情感形容词——一出现，情感就被说破了。',
          },
          {
            id: 'word-colloquial',
            tag: '口语词',
            description: '用日常说话的词，不用书面语。修行不在云端，在厨房。',
          },
          {
            id: 'word-dialect',
            tag: '方言词',
            description: '偶尔用一两个增加质感。不要过量，否则读者会出戏。',
          },
          {
            id: 'word-zen-phrase',
            tag: '禅语',
            description: '「吃茶去」「平常心」可用，但要少，用多了变成功夫茶表演。',
          },
        ],
      },
      {
        title: '三、按修辞的「密度」分',
        label: '修辞密度',
        exclusive: true,
        cards: [
          {
            id: 'rhetoric-none',
            tag: '零修辞',
            description: '完全不用比喻、拟人、排比，只呈现事实，像摄像机。不修饰，本身就是修行。',
          },
          {
            id: 'rhetoric-low',
            tag: '低修辞',
            description: '偶尔一个很轻的比喻，不抢戏。',
          },
          {
            id: 'rhetoric-medium',
            tag: '中修辞',
            description: '比喻、拟人、排比适度使用。修辞是盐，不是菜。',
          },
          {
            id: 'rhetoric-high',
            tag: '高修辞',
            description: '密集的比喻、通感、排比。慎用，容易变成「美文」，失去质朴。',
          },
          {
            id: 'rhetoric-anti',
            tag: '反修辞',
            description: '故意不用修辞，甚至故意用「丑」的语言。写「狼狈」时用。',
          },
        ],
      },
      {
        title: '四、按「意象」的使用分',
        label: '意象',
        exclusive: false,
        cards: [
          {
            id: 'image-daily',
            tag: '日常意象',
            description: '杯子、筷子、冻饺子、地铁玻璃。修行就在日常里，最推荐。',
          },
          {
            id: 'image-nature',
            tag: '自然意象',
            description: '山、水、云、树、雨。要具体——不是「山」，是「后山那棵歪脖子树」。',
          },
          {
            id: 'image-body',
            tag: '身体意象',
            description: '手、胃、喉咙、呼吸、心跳。情绪首先住在身体里。',
          },
          {
            id: 'image-city',
            tag: '城市意象',
            description: '地铁、便利店、出租屋、写字楼。写「都市修行」时用。',
          },
          {
            id: 'image-zen',
            tag: '禅意意象',
            description: '茶、香、蒲团、木鱼、莲花。慎用，要用得少、用得准。',
          },
        ],
      },
      {
        title: '五、按对话的「功能」分',
        label: '对话',
        exclusive: true,
        cards: [
          {
            id: 'dialogue-info',
            tag: '信息交换',
            description: '对话只传递信息，太功能化，没有余味。慎用。',
          },
          {
            id: 'dialogue-character',
            tag: '性格展示',
            description: '对话展示人物性格。可以用，但别变成「人物塑造练习」。',
          },
          {
            id: 'dialogue-undercurrent',
            tag: '暗流承载',
            description: '表面说 A，实际说 B。谁都没说真话，但谁都听懂了。最推荐。',
          },
          {
            id: 'dialogue-silent',
            tag: '沉默对话',
            description: '有大量停顿、省略、答非所问。写「亲密关系中的隔阂」时用。',
          },
          {
            id: 'dialogue-monologue',
            tag: '独白式对话',
            description: '一个人在说，另一个不回应；或两人各说各的。写「孤独」时用。',
          },
        ],
      },
    ],
  },
  {
    key: 'themeStyle',
    label: '主题风格',
    groups: [
      {
        title: '一、按「主题的收束方式」分',
        label: '收束方式',
        exclusive: true,
        cards: [
          {
            id: 'arc-complete',
            tag: '完成式',
            description:
              '有明确的起承转合，最终抵达某个结论，情绪有明确出口。慎用，太圆满反而失真。',
          },
          {
            id: 'arc-unfinished',
            tag: '未完成式',
            description: '始终悬而未决，不给出答案。写「他还在学。昨天又没做到。今天再试」。',
          },
          {
            id: 'arc-shelved',
            tag: '搁置式',
            description: '没被解决，只是放在一边。搁置不等于放下，但可以继续生活。',
          },
          {
            id: 'lonely-transformed',
            tag: '转化式',
            description: '情绪改变了形态：愤怒变成疲惫，疲惫变成沉默。不是消灭情绪，是让它流动。',
          },
          {
            id: 'arc-recurring',
            tag: '反复式',
            description: '以为结束了，又回来了。写「以为自己放下了，结果又梦见了」。',
          },
          {
            id: 'ending-circular',
            tag: '循环式',
            description: '回到原点，但人已经不同。写「山还是那座山，但她看山的方式变了」。',
          },
          {
            id: 'ending-anti-climax',
            tag: '反高潮式',
            description: '铺垫了很久，最后什么都没发生。不爆发，只是继续生活。',
          },
          {
            id: 'lonely-renamed',
            tag: '重新命名式',
            description:
              '不是问题解决了，是命名方式变了。写「她不再叫它孤独了。她叫它『一个人』」。',
          },
          {
            id: 'arc-no-exit',
            tag: '无解式',
            description: '从头到尾没有出口，也不试图找出口。不升华，不超越，只是与它共处。',
          },
        ],
      },
      {
        title: '二、按「主题的落点」分',
        label: '落点',
        exclusive: true,
        cards: [
          {
            id: 'landing-self',
            tag: '向内落',
            description: '最终落在自我认知上。写「原来我不是放不下他，是放不下『被需要』的感觉」。',
          },
          {
            id: 'landing-other',
            tag: '向外落',
            description: '最终落在他者或世界上。可用，但别变成「道德升华」。',
          },
          {
            id: 'landing-daily',
            tag: '向日常落',
            description: '最终落在一个具体动作上。道理落在动作里，才算真的懂了，最推荐。',
          },
          {
            id: 'landing-void',
            tag: '向空处落',
            description: '最终没有落点，像石子扔进深井。写「无常」「漂泊」时用。',
          },
          {
            id: 'landing-paradox',
            tag: '向悖论落',
            description: '最终呈现为一个矛盾。不解决矛盾，只是呈现矛盾。',
          },
        ],
      },
      {
        title: '三、按「过程怎么走」分',
        label: '过程质感',
        exclusive: false,
        cards: [
          {
            id: 'practice-clumsy',
            tag: '带着狼狈',
            description: '写过程里的尴尬与失手：说了重话、没做到、自己先急了。不完美才是现场。',
          },
          {
            id: 'practice-no-gain',
            tag: '无所得',
            description: '写「什么都没换来，只是继续往前」。不追求顿悟式收获，只是把日子过下去。',
          },
          {
            id: 'practice-mismatched',
            tag: '差一点',
            description: '写「想安慰却说重了」「想靠近却推开了」。写人与人之间那些差一点的连接。',
          },
        ],
      },
      {
        title: '四、按「主题的自我认知」分',
        label: '自我认知',
        exclusive: true,
        cards: [
          {
            id: 'aware-none',
            tag: '未觉察',
            description: '人物不知道自己怎么了。写「他一直在生气，但不知道在气什么」。',
          },
          {
            id: 'aware-partial',
            tag: '半觉察',
            description: '知道自己在经历什么，但不知道怎么办。知道，但做不到，最真实的认知状态。',
          },
          {
            id: 'aware-full',
            tag: '全觉察',
            description: '完全清楚自己的状态和成因。慎用，太清醒反而失真。',
          },
          {
            id: 'aware-named',
            tag: '自我命名的清醒',
            description: '对自己有认知，但不急于改变。不解决，但清醒。',
          },
          {
            id: 'aware-unreliable',
            tag: '不可靠的自我认知',
            description:
              '人物以为自己放下了，读者从动作里看出他还没放下。叙述者不点破，留白让读者自己判断。',
          },
        ],
      },
      {
        title: '五、按「主题的关涉对象」分',
        label: '关涉对象',
        exclusive: true,
        cards: [
          {
            id: 'theme-dialogue-solo',
            tag: '一个人',
            description: '只关乎一个人，无人回应。写「孤独」时用。',
          },
          {
            id: 'theme-dialogue-pair',
            tag: '两个人',
            description:
              '关乎两个人之间的关系，可包含不在同一频道（错过）或只有沉默（隔阂）。写「亲密关系」时用。',
          },
          {
            id: 'theme-dialogue-group',
            tag: '一群人',
            description: '关乎一群人的共同处境。可用，但要避免集体抒情。',
          },
          {
            id: 'theme-dialogue-self',
            tag: '与自我',
            description: '一个人对着自己或空气说话，像分裂出另一个自己。写「自我对话」时用。',
          },
        ],
      },
    ],
  },
  {
    key: 'genre',
    label: '文体体例',
    groups: [
      {
        title: '一、按「文体」分',
        label: '文体',
        exclusive: true,
        cards: [
          {
            id: 'genre-narrative',
            tag: '叙事散文',
            description: '以一件具体的事或一段经历为骨，边走边看，判断藏在细节后面。',
          },
          {
            id: 'genre-commentary',
            tag: '观点评论',
            description:
              '先立一个尖锐判断，再给理由与反方会怎么反驳，最后落到自己的取舍。不写成中立综述。',
          },
          {
            id: 'genre-explanatory',
            tag: '知识说明',
            description: '把一件事讲清楚：是什么、为什么、怎么办。多用例子与对照，少用形容词。',
          },
          {
            id: 'genre-interview',
            tag: '人物访谈',
            description: '以问答或转述他人原话推进，作者退到后面，只在关键处补一句判断。',
          },
          {
            id: 'genre-listicle',
            tag: '清单体',
            description:
              '用分点短章推进，每点自成一个可独立阅读的小块，点与点之间有递进或对照关系。',
          },
          {
            id: 'genre-timeline',
            tag: '时间线复盘',
            description: '按时间顺序还原事件脉络，在关键节点停下来说判断，不做整体总结。',
          },
        ],
      },
      {
        title: '二、按「材料类型」分',
        label: '材料',
        exclusive: false,
        cards: [
          {
            id: 'material-personal',
            tag: '个人经历',
            description: '用自己或身边人的具体经历作材料。写清时间、地点、动作，别只写感受。',
          },
          {
            id: 'material-data',
            tag: '数据引述',
            description: '用可核对的数据、报告、公开统计作支撑。数字要给出处与口径。',
          },
          {
            id: 'material-case',
            tag: '案例细节',
            description: '用具体案例的细节（时间、数字、对话中的一句）代替概括性描述。',
          },
          {
            id: 'material-dialogue',
            tag: '对话实录',
            description: '直接引述原话或对话片段作为材料，让当事人自己说，作者不代劳总结。',
          },
          {
            id: 'material-classic',
            tag: '典籍引用',
            description: '引用经典文本、古语或行业权威的原话。要少而准，不做装饰性掉书袋。',
          },
        ],
      },
    ],
  },
];
