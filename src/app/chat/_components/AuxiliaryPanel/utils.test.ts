import { describe, expect, it } from 'vitest';
import { AUX_PANEL_SOURCE_LIST_WIDTH, AUX_PANEL_WIDTH } from './constants';
import type { AuxiliaryPanelContent } from './types';
import { getPanelTitle, getPanelWidth, isSourceListOpenFor } from './utils';

const filePreview: AuxiliaryPanelContent = {
  type: 'file-preview',
  fileName: 'notes.md',
  mediaType: 'text/markdown',
  source: { kind: 'http', href: '/api/docs/c1/a1' },
};

const sourceList: AuxiliaryPanelContent = {
  type: 'source-list',
  messageId: 'msg-1',
  items: [{ key: '1', title: 'A', url: 'https://example.com' }],
};

describe('getPanelTitle', () => {
  it('文件预览用文件名，来源概要用计数文案', () => {
    expect(getPanelTitle(null)).toBe('');
    expect(getPanelTitle(filePreview)).toBe('notes.md');
    expect(getPanelTitle(sourceList)).toBe('参考 1 个来源');
  });
});

describe('getPanelWidth', () => {
  it('来源概要固定窄栏，其余走弹性宽度', () => {
    expect(getPanelWidth(sourceList)).toBe(AUX_PANEL_SOURCE_LIST_WIDTH);
    expect(getPanelWidth(filePreview)).toBe(AUX_PANEL_WIDTH);
    expect(getPanelWidth(null)).toBe(AUX_PANEL_WIDTH);
  });
});

describe('isSourceListOpenFor', () => {
  it('仅当展开且 messageId 一致时为 true', () => {
    expect(isSourceListOpenFor('msg-1', sourceList, true)).toBe(true);
    expect(isSourceListOpenFor('msg-2', sourceList, true)).toBe(false);
    expect(isSourceListOpenFor('msg-1', sourceList, false)).toBe(false);
    expect(isSourceListOpenFor('msg-1', filePreview, true)).toBe(false);
    expect(isSourceListOpenFor('msg-1', null, true)).toBe(false);
  });
});
