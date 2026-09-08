import { describe, expect, it } from 'vitest';
import { getWorkflowStepIndex, resolveEcommerceWorkflow } from './workflow';

describe('resolveEcommerceWorkflow', () => {
  it('主图为分析到设计到完成三步', () => {
    expect(resolveEcommerceWorkflow('主图').map((step) => step.key)).toEqual([
      'analysis',
      'design',
      'complete',
    ]);
    expect(resolveEcommerceWorkflow('主图').map((step) => step.title)).toEqual([
      '主图分析',
      '主图设计',
      '预览生成物料',
    ]);
  });

  it('详情图为结构规划到设计到完成三步', () => {
    expect(resolveEcommerceWorkflow('详情图').map((step) => step.key)).toEqual([
      'analysis',
      'design',
      'complete',
    ]);
    expect(resolveEcommerceWorkflow('详情图').map((step) => step.title)).toEqual([
      '结构规划',
      '详情图设计',
      '预览生成物料',
    ]);
  });

  it('营销海报无商业分析步，设计步标题为营销海报', () => {
    expect(resolveEcommerceWorkflow('营销海报').map((step) => step.key)).toEqual([
      'visual',
      'design',
      'complete',
    ]);
    expect(resolveEcommerceWorkflow('营销海报').map((step) => step.title)).toEqual([
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
