import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('server-only', () => ({}));

import {
  ECOMMERCE_STEP_KEYS,
  ECOMMERCE_TASK_TYPES,
} from '@/app/api/studio/ecommerce/_shared/task-constants';
import { createTaskParseRequest } from './create-task-parse-request';

const parse = createTaskParseRequest({
  stepKeys: ECOMMERCE_STEP_KEYS,
  createSchema: z.strictObject({
    name: z.string().trim().min(1).max(100),
    taskType: z.enum(ECOMMERCE_TASK_TYPES),
  }),
});

describe('parseCreateTaskRequest', () => {
  it('接受合法名称与任务类型', () => {
    expect(parse.parseCreateTaskRequest({ name: ' 春季主图 ', taskType: '主图' })).toEqual({
      name: '春季主图',
      taskType: '主图',
    });
  });

  it('拒绝未知任务类型', () => {
    expect(() => parse.parseCreateTaskRequest({ name: '任务', taskType: '手机界面' })).toThrow();
  });
});

describe('parseUpdateTaskRequest', () => {
  it('只接受任务名称', () => {
    expect(parse.parseUpdateTaskRequest({ name: '新名称' })).toEqual({ name: '新名称' });
  });

  it('拒绝修改任务类型', () => {
    expect(() => parse.parseUpdateTaskRequest({ name: '新名称', taskType: '详情图' })).toThrow();
  });
});

describe('parseTaskListQuery', () => {
  it('解析任务名称搜索与分页', () => {
    expect(
      parse.parseTaskListQuery(
        'https://example.test/api/studio/ecommerce/tasks?name=主图&current=2&pageSize=20',
      ),
    ).toEqual({
      name: '主图',
      page: 2,
      pageSize: 20,
    });
  });
});

describe('parseStepKey', () => {
  it('只接受稳定语义步骤键', () => {
    expect(parse.parseStepKey('analysis')).toBe('analysis');
    expect(() => parse.parseStepKey('1')).toThrow();
  });
});

describe('parseSaveStepRequest', () => {
  it('要求正整数快照版本', () => {
    expect(
      parse.parseSaveStepRequest({ snapshotVersion: 1, data: { analysisText: 'ok' } }),
    ).toEqual({
      snapshotVersion: 1,
      data: { analysisText: 'ok' },
    });
    expect(() => parse.parseSaveStepRequest({ snapshotVersion: 0, data: {} })).toThrow();
  });
});
