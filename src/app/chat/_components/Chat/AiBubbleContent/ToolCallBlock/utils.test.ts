import { describe, expect, it } from 'vitest';
import type { MessagePart } from '../utils';
import {
  getPendingTitle,
  getToolError,
  getToolInputRows,
  getToolName,
  getToolStatus,
  getToolTitle,
} from './utils';

function tool(type: string, extra: Record<string, unknown> = {}): MessagePart {
  return { type: `tool-${type}`, ...extra };
}

describe('getToolName', () => {
  it('去掉 tool- 前缀；非工具 part 返回空串', () => {
    expect(getToolName(tool('web_search'))).toBe('web_search');
    expect(getToolName({ type: 'text', text: '正文' })).toBe('');
  });
});

describe('getToolStatus', () => {
  it('传参与执行中都是 pending，产出即 done', () => {
    expect(getToolStatus(tool('web_search', { state: 'input-streaming' }))).toBe('pending');
    expect(getToolStatus(tool('web_search', { state: 'input-available' }))).toBe('pending');
    expect(getToolStatus(tool('web_search', { state: 'output-available' }))).toBe('done');
  });

  it('output-error 与服务端收尾的 { ok: false } 都算失败', () => {
    expect(getToolStatus(tool('web_search', { state: 'output-error' }))).toBe('failed');
    expect(
      getToolStatus(tool('generate_image', { state: 'output-available', output: { ok: false } })),
    ).toBe('failed');
  });
});

describe('getToolError', () => {
  it('优先取 output.error，其次 errorText', () => {
    expect(
      getToolError(
        tool('web_search', {
          state: 'output-available',
          output: { ok: false, error: '生成已中断' },
        }),
      ),
    ).toBe('生成已中断');
    expect(getToolError(tool('web_search', { state: 'output-error', errorText: '请求超时' }))).toBe(
      '请求超时',
    );
    expect(getToolError(tool('web_search', { state: 'input-streaming' }))).toBe('');
  });
});

describe('getToolTitle', () => {
  it('只给工具中文名，入参不进标题', () => {
    expect(getToolTitle(tool('web_search', { input: { query: '武汉今天天气' } }))).toBe('联网搜索');
    expect(getToolTitle(tool('analyze_image', { input: { question: '这是什么？' } }))).toBe('识图');
    expect(getToolTitle(tool('analyze_image', { input: { pastedImageIndexes: [0, 1] } }))).toBe(
      '识图',
    );
  });

  it('edit 模式的生图叫「改图」，未知工具回落原名', () => {
    expect(
      getToolTitle(
        tool('generate_image', { input: { mode: 'generate', size: '2K', aspectRatio: '3:4' } }),
      ),
    ).toBe('生成图片');
    expect(
      getToolTitle(tool('generate_image', { input: { mode: 'edit', prompt: '去 logo' } })),
    ).toBe('改图');
    expect(getToolTitle(tool('some_new_tool', { input: { foo: 1 } }))).toBe('some_new_tool');
  });
});

describe('getPendingTitle', () => {
  it('调用进行中在工具名后加省略号', () => {
    expect(getPendingTitle('识图')).toBe('识图...');
  });
});

describe('getToolInputRows', () => {
  it('字段转中文名、枚举转中文、粘贴图序号转 1 基', () => {
    const rows = getToolInputRows(
      tool('generate_image', {
        input: {
          mode: 'edit',
          prompt: '去掉 logo',
          pastedImageIndexes: [0, 2],
          transparent: false,
          unknownField: '原样输出',
        },
      }),
    );

    expect(rows).toEqual([
      { key: 'mode', label: '模式', value: '改图' },
      { key: 'prompt', label: '提示词', value: '去掉 logo' },
      { key: 'pastedImageIndexes', label: '粘贴图', value: '第 1、3 张' },
      { key: 'transparent', label: '透明背景', value: '否' },
      { key: 'unknownField', label: 'unknownField', value: '原样输出' },
    ]);
  });

  it('跳过空值字段；对象值保留 JSON', () => {
    const rows = getToolInputRows(
      tool('web_search', {
        input: { query: '天气', foo: undefined, bar: [], baz: null, extra: { a: 1 } },
      }),
    );

    expect(rows).toEqual([
      { key: 'query', label: '关键词', value: '天气' },
      { key: 'extra', label: 'extra', value: '{\n  "a": 1\n}' },
    ]);
  });

  it('入参尚未到达时返回空数组', () => {
    expect(getToolInputRows(tool('web_search', { state: 'input-streaming' }))).toEqual([]);
  });

  it('生图成功后用 output 真实模型覆盖 LLM 误传的 input.model', () => {
    const rows = getToolInputRows(
      tool('generate_image', {
        state: 'output-available',
        input: {
          mode: 'edit',
          prompt: '合成穴位图',
          model: 'gpt-image-2.5-sunburst-vip',
          size: '2K',
        },
        output: {
          ok: true,
          modelId: 'gpt-image-2.5-flare-vip',
          modelLabel: 'GPT Image 2.5 Flare VIP',
          assets: [{ assetId: 'a1', modelId: 'gpt-image-2.5-flare-vip' }],
        },
      }),
    );

    expect(rows).toEqual([
      { key: 'mode', label: '模式', value: '改图' },
      { key: 'prompt', label: '提示词', value: '合成穴位图' },
      { key: 'model', label: '模型', value: 'GPT Image 2.5 Flare VIP' },
      { key: 'size', label: '尺寸', value: '2K' },
    ]);
  });

  it('旧落盘无顶层 modelId 时回落到 assets[].modelId', () => {
    const rows = getToolInputRows(
      tool('generate_image', {
        state: 'output-available',
        input: { mode: 'generate', prompt: '一只猫' },
        output: {
          ok: true,
          assets: [{ assetId: 'a1', modelId: 'gpt-image-2.5-flare-vip' }],
        },
      }),
    );

    expect(rows.find((row) => row.key === 'model')).toEqual({
      key: 'model',
      label: '模型',
      value: 'gpt-image-2.5-flare-vip',
    });
  });

  it('生图进行中不展示未确认的模型行', () => {
    const rows = getToolInputRows(
      tool('generate_image', {
        state: 'input-available',
        input: { mode: 'edit', prompt: '去 logo', model: 'gpt-image-2.5-sunburst-vip' },
      }),
    );

    expect(rows.find((row) => row.key === 'model')).toBeUndefined();
    expect(rows.map((row) => row.key)).toEqual(['mode', 'prompt']);
  });
});

describe('原生联网（providerExecuted，query 在 output.action）', () => {
  it('search：展开行用 action.queries，并剔除 ws_call_id 标记', () => {
    const part = tool('web_search', {
      state: 'output-available',
      input: {},
      output: {
        action: {
          type: 'search',
          queries: ['武汉 今天 天气 实时 气温', 'ws_call_id=call_00_abc'],
        },
      },
    });

    expect(getToolTitle(part)).toBe('联网搜索');
    expect(getToolInputRows(part)).toEqual([
      { key: 'queries', label: '关键词', value: '武汉 今天 天气 实时 气温' },
    ]);
  });

  it('openPage：展开行给出完整 URL', () => {
    const part = tool('web_search', {
      state: 'output-available',
      input: {},
      output: {
        action: { type: 'openPage', url: 'https://www.weather.com.cn/weather/101200101.shtml' },
      },
    });

    expect(getToolTitle(part)).toBe('联网搜索');
    expect(getToolInputRows(part)).toEqual([
      {
        key: 'url',
        label: '打开页面',
        value: 'https://www.weather.com.cn/weather/101200101.shtml',
      },
    ]);
  });

  it('超长字段值截断到 800 字（如 DESIGN.md 正文）', () => {
    const rows = getToolInputRows(tool('save_design_md', { input: { content: '设'.repeat(900) } }));

    expect(rows[0]?.value).toBe(`${'设'.repeat(800)}…`);
  });
});
