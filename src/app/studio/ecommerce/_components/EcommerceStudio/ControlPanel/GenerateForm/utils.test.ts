import { describe, expect, it, vi } from 'vitest';
import { dispatchSpecFormChange } from './utils';

const SPEC = {
  model: 'gpt-image-2-vip',
  aspectRatio: '3:4',
  quality: 'high',
  clarity: '2K',
};

describe('dispatchSpecFormChange', () => {
  it('只派发清晰度等规格变更，不连发数量回调', () => {
    const onFormChange = vi.fn();
    const onCountChange = vi.fn();
    dispatchSpecFormChange(
      { ...SPEC, clarity: '4K', count: '1' },
      '1',
      onFormChange,
      onCountChange,
    );
    expect(onFormChange).toHaveBeenCalledOnce();
    expect(onFormChange).toHaveBeenCalledWith({ ...SPEC, clarity: '4K' });
    expect(onCountChange).not.toHaveBeenCalled();
  });

  it('数量变化时只派发数量回调', () => {
    const onFormChange = vi.fn();
    const onCountChange = vi.fn();
    dispatchSpecFormChange({ ...SPEC, count: '2' }, '1', onFormChange, onCountChange);
    expect(onCountChange).toHaveBeenCalledOnce();
    expect(onCountChange).toHaveBeenCalledWith('2');
    expect(onFormChange).not.toHaveBeenCalled();
  });
});
