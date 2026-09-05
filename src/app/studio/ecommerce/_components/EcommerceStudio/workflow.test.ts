import { describe, expect, it } from 'vitest';
import { getWorkflowStepIndex, resolveEcommerceWorkflow } from './workflow';

describe('resolveEcommerceWorkflow', () => {
  it.each(['主图', '详情图', '营销海报'] as const)('%s 暂时使用同一套稳定步骤键', (taskType) => {
    expect(resolveEcommerceWorkflow(taskType, 1).map((step) => step.key)).toEqual([
      'analysis',
      'visual',
      'design',
      'complete',
    ]);
  });

  it('营销海报将视觉设计步标题改为营销海报，末步为预览生成物料', () => {
    expect(resolveEcommerceWorkflow('营销海报', 1).map((step) => step.title)).toEqual([
      '商业分析',
      '营销主视觉',
      '营销海报',
      '预览生成物料',
    ]);
  });

  it('步骤下标由配置顺序决定而非硬编码序号', () => {
    const reordered = [
      { key: 'visual', title: '主视觉' },
      { key: 'analysis', title: '分析' },
      { key: 'design', title: '设计' },
      { key: 'complete', title: '完成' },
    ] as const;
    expect(getWorkflowStepIndex(reordered, 'analyzed')).toBe(1);
    expect(getWorkflowStepIndex(reordered, 'visualGenerating')).toBe(0);
  });
});
