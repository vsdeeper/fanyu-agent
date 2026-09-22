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

const ORIGINAL = process.env.ANALYZE_IMAGE_MODEL_ID;
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
  });
}

beforeEach(() => {
  generateText.mockReset();
  getMainModel.mockClear();
  process.env.ANALYZE_IMAGE_MODEL_ID = 'doubao-seed-2-0-pro-260215';
});

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.ANALYZE_IMAGE_MODEL_ID;
  } else {
    process.env.ANALYZE_IMAGE_MODEL_ID = ORIGINAL;
  }
});

describe('analyze_image tool', () => {
  it('成功时返回 analysis', async () => {
    generateText.mockResolvedValue({ text: '画面是一只猫' });

    const result = await runAnalyze({ question: '这是什么？' });

    expect(result).toEqual({ ok: true, analysis: '画面是一只猫' });
    expect(generateText).toHaveBeenCalled();
  });

  it('粘贴图索引越界时返回错误且不调模型', async () => {
    const result = await runAnalyze({ pastedImageIndexes: [9] });

    expect(result).toEqual({ ok: false, error: '粘贴图第 10 张不存在' });
    expect(generateText).not.toHaveBeenCalled();
  });

  it('中断时返回已中断', async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await runAnalyze({}, [PNG], controller.signal);

    expect(result).toEqual({ ok: false, error: '已中断' });
  });

  it('未知模型前缀返回友好错误', async () => {
    process.env.ANALYZE_IMAGE_MODEL_ID = 'gpt-image-2-vip';

    const result = await runAnalyze({});

    expect(result).toEqual({ ok: false, error: '不支持的识图模型，请检查配置后重试' });
  });
});
