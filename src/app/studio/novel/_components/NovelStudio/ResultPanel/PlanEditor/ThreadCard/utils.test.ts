import { describe, expect, it } from 'vitest';
import { isSavableThread, threadToDraft, trimThread, type ThreadDraft } from './utils';

const draft: ThreadDraft = {
  name: ' 血脉 ',
  core: ' 谁继承王位 ',
  advances: { v1: ' 进山 ', v2: '  ' },
};

describe('isSavableThread', () => {
  it('名称、核心和每一卷推进都有内容才可保存', () => {
    expect(isSavableThread({ ...draft, advances: { v1: '进山', v2: '出山' } }, ['v1', 'v2'])).toBe(
      true,
    );
    expect(isSavableThread(draft, ['v1', 'v2'])).toBe(false);
    expect(isSavableThread({ ...draft, name: '  ' }, ['v1'])).toBe(false);
  });
});

describe('threadToDraft', () => {
  it('缺的卷推进补成空字符串', () => {
    expect(
      threadToDraft(
        { id: 't1', name: '血脉', core: '继承', advances: [{ volumeId: 'v1', text: '进山' }] },
        ['v1', 'v2'],
      ),
    ).toEqual({
      name: '血脉',
      core: '继承',
      advances: { v1: '进山', v2: '' },
    });
  });
});

describe('trimThread', () => {
  it('去掉首尾空白，并按当前卷序写出推进', () => {
    expect(
      trimThread('t1', { ...draft, advances: { v1: ' 进山 ', v2: '出山' } }, ['v2', 'v1']),
    ).toEqual({
      id: 't1',
      name: '血脉',
      core: '谁继承王位',
      advances: [
        { volumeId: 'v2', text: '出山' },
        { volumeId: 'v1', text: '进山' },
      ],
    });
  });
});
