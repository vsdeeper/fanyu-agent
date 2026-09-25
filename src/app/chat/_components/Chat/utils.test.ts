import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';
import {
  GENERIC_TOOL_INTERRUPTED_ERROR,
  IMAGE_TOOL_INTERRUPTED_ERROR,
} from '@/app/api/chat/_shared/tool-errors';
import { isMessageStopped } from './utils';

function assistant(parts: UIMessage['parts'], metadata?: Record<string, unknown>): UIMessage {
  return {
    id: 'msg-1',
    role: 'assistant',
    parts,
    ...(metadata ? { metadata } : {}),
  };
}

describe('isMessageStopped', () => {
  it('完整正文且 state=done 时不算停止', () => {
    expect(isMessageStopped(assistant([{ type: 'text', text: '改图完成。', state: 'done' }]))).toBe(
      false,
    );
  });

  it('完整正文被误标 metadata.stopped 时不算停止', () => {
    expect(
      isMessageStopped(
        assistant([{ type: 'text', text: '改图完成。', state: 'done' }], { stopped: true }),
      ),
    ).toBe(false);
  });

  it('完整正文但生图被中断时仍算停止', () => {
    expect(
      isMessageStopped(
        assistant(
          [
            { type: 'text', text: '开始改图。', state: 'done' },
            {
              type: 'tool-generate_image',
              toolCallId: 'call-1',
              state: 'output-available',
              input: {},
              output: { ok: false, error: IMAGE_TOOL_INTERRUPTED_ERROR },
            },
          ],
          { stopped: true },
        ),
      ),
    ).toBe(true);
  });

  it('完整正文但其它 tool 被中断时仍算停止', () => {
    expect(
      isMessageStopped(
        assistant(
          [
            { type: 'text', text: '先识图。', state: 'done' },
            {
              type: 'tool-analyze_image',
              toolCallId: 'call-2',
              state: 'output-available',
              input: {},
              output: { ok: false, error: GENERIC_TOOL_INTERRUPTED_ERROR },
            },
          ],
          { stopped: true },
        ),
      ),
    ).toBe(true);
  });

  it('正文未收束时算停止', () => {
    expect(
      isMessageStopped(assistant([{ type: 'text', text: '还在写', state: 'streaming' }])),
    ).toBe(true);
  });
});
