import { describe, expect, it } from 'vitest';
import { isSavableThread, threadToDraft, trimThread, type ThreadDraft } from './utils';

const draft: ThreadDraft = {
  name: ' 旧信 ',
  core: ' 一封没寄出的信 ',
};

describe('isSavableThread', () => {
  it('名称和贯穿全书的文本都有内容才可保存', () => {
    expect(isSavableThread(draft)).toBe(true);
    expect(isSavableThread({ ...draft, name: '  ' })).toBe(false);
    expect(isSavableThread({ ...draft, core: '' })).toBe(false);
  });
});

describe('threadToDraft', () => {
  it('只保留名称和贯穿全书的文本', () => {
    expect(threadToDraft({ id: 't1', name: '旧信', core: '一封信' })).toEqual({
      name: '旧信',
      core: '一封信',
    });
  });
});

describe('trimThread', () => {
  it('去掉首尾空白', () => {
    expect(trimThread('t1', draft)).toEqual({
      id: 't1',
      name: '旧信',
      core: '一封没寄出的信',
    });
  });
});
