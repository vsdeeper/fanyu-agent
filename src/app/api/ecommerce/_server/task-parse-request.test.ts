import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  parseCreateTaskRequest,
  parseEcommerceStepKey,
  parseSaveStepRequest,
  parseTaskListQuery,
  parseUpdateTaskRequest,
} from './task-parse-request';

describe('parseCreateTaskRequest', () => {
  it('接受合法名称与任务类型', () => {
    expect(parseCreateTaskRequest({ name: ' 春季主图 ', taskType: '主图' })).toEqual({
      name: '春季主图',
      taskType: '主图',
    });
  });

  it('拒绝未知任务类型', () => {
    expect(() => parseCreateTaskRequest({ name: '任务', taskType: '手机界面' })).toThrow();
  });
});

describe('parseUpdateTaskRequest', () => {
  it('只接受任务名称', () => {
    expect(parseUpdateTaskRequest({ name: '新名称' })).toEqual({ name: '新名称' });
  });

  it('拒绝修改任务类型', () => {
    expect(() => parseUpdateTaskRequest({ name: '新名称', taskType: '详情图' })).toThrow();
  });
});

describe('parseTaskListQuery', () => {
  it('解析任务名称搜索与分页', () => {
    expect(
      parseTaskListQuery(
        'https://example.test/api/ecommerce/tasks?name=主图&current=2&pageSize=20',
      ),
    ).toEqual({
      name: '主图',
      page: 2,
      pageSize: 20,
    });
  });
});

describe('parseEcommerceStepKey', () => {
  it('只接受稳定语义步骤键', () => {
    expect(parseEcommerceStepKey('analysis')).toBe('analysis');
    expect(() => parseEcommerceStepKey('1')).toThrow();
  });
});

describe('parseSaveStepRequest', () => {
  it('要求正整数快照版本', () => {
    expect(parseSaveStepRequest({ snapshotVersion: 1, data: { analysisText: 'ok' } })).toEqual({
      snapshotVersion: 1,
      data: { analysisText: 'ok' },
    });
    expect(() => parseSaveStepRequest({ snapshotVersion: 0, data: {} })).toThrow();
  });
});
