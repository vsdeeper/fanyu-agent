import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const generateText = vi.hoisted(() => vi.fn());
const getMainModel = vi.hoisted(() => vi.fn(() => ({ modelId: 'mock' })));
const getCapabilities = vi.hoisted(() =>
  vi.fn(() => ({
    acceptsImageInput: true,
    usesSdkWebSearchTool: true,
    needsOpenaiStoreFalse: true,
  })),
);
const getOpenAIOptions = vi.hoisted(() => vi.fn(() => ({})));

vi.mock('server-only', () => ({}));
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return { ...actual, generateText };
});
vi.mock('@/app/api/chat/_server/providers/resolve', () => ({
  getChatProviderRuntimeFor: () => ({
    getMainModel,
    getCapabilities,
    getOpenAIOptions,
  }),
}));

import { analyzeImage } from './analyze-image';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

async function runAnalyze(
  input: {
    question?: string;
    sourceAssetIds?: string[];
    pastedImageIndexes?: number[];
  },
  pastedImageDataUrls: string[] = [PNG],
  abortSignal?: AbortSignal,
) {
  const toolInstance = analyzeImage.create({ chatId: 'c1', pastedImageDataUrls });
  return toolInstance.execute!(input, {
    toolCallId: 't1',
    messages: [],
    abortSignal,
    // AI SDK ToolExecutionOptions 要求 context；本 tool 不使用
    context: undefined,
  } as never);
}

beforeEach(() => {
  generateText.mockReset();
  getMainModel.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('analyze_image tool', () => {
  // ANALYZE_IMAGE_MODEL_ID 已移除；tool 源码暂留但不注册，恒返回未配置
  it('识图模型未配置时返回错误且不调模型', async () => {
    const result = await runAnalyze({ question: '这是什么？' });

    expect(result).toEqual({ ok: false, error: '识图模型未配置，请稍后重试' });
    expect(generateText).not.toHaveBeenCalled();
  });

  it('中断时返回已中断', async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await runAnalyze({}, [PNG], controller.signal);

    expect(result).toEqual({ ok: false, error: '已中断' });
  });
});
