import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

vi.mock('server-only', () => ({}));

import { ApiErrorCode } from '@/lib/shared/server/api-response';
import { TASK_NAME_CONFLICT_MESSAGE } from '../_shared/task-constants';
import { createTaskHandlers } from './create-task-handlers';

const deps = vi.hoisted(() => ({
  parseCreateTaskRequest: vi.fn(),
  parseUpdateTaskRequest: vi.fn((value: unknown) => value as { name: string }),
  parseSaveStepRequest: vi.fn(),
  parseStepKey: vi.fn(),
  parseTaskListQuery: vi.fn(),
  create: vi.fn(),
  list: vi.fn(),
  load: vi.fn(),
  hasName: vi.fn(),
  exists: vi.fn(),
  updateName: vi.fn(),
  saveStep: vi.fn(),
  deleteStep: vi.fn(),
  remove: vi.fn(),
  persistSnapshotAssets: vi.fn(),
}));

const TASK = {
  id: 'task-1',
  name: '春季主图',
  workflowVersion: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  steps: {},
};

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const handlers = createTaskHandlers({
  logTag: 'studio-tasks',
  notFoundMessage: '任务不存在',
  createInvalidMessage: '任务名称无效',
  ...deps,
});

describe('工作室任务名称冲突', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.parseCreateTaskRequest.mockImplementation((value: unknown) => value);
    deps.parseUpdateTaskRequest.mockImplementation((value: unknown) => value as { name: string });
  });

  it('同名创建返回 409', async () => {
    deps.hasName.mockReturnValue(true);
    deps.parseCreateTaskRequest.mockReturnValue({ name: '春季主图' });

    const res = await handlers.handleCreateTask(
      jsonRequest('https://example.test/api/studio/ecommerce/tasks', { name: '春季主图' }),
    );
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body).toEqual({
      code: ApiErrorCode.TASK_NAME_CONFLICT,
      message: TASK_NAME_CONFLICT_MESSAGE,
      data: null,
    });
    expect(deps.create).not.toHaveBeenCalled();
  });

  it('trim 后与已有名称相同视为冲突', async () => {
    deps.hasName.mockReturnValue(true);
    deps.parseCreateTaskRequest.mockReturnValue({ name: '春季主图' });

    const res = await handlers.handleCreateTask(
      jsonRequest('https://example.test/api/studio/ecommerce/tasks', { name: ' 春季主图 ' }),
    );

    expect(res.status).toBe(409);
    expect(deps.hasName).toHaveBeenCalledWith('春季主图');
  });

  it('改成自己原名可以通过', async () => {
    deps.load.mockReturnValue(TASK);
    deps.hasName.mockReturnValue(true);
    deps.updateName.mockReturnValue(true);
    deps.parseUpdateTaskRequest.mockReturnValue({ name: '春季主图' });

    const res = await handlers.handleUpdateTask(
      'task-1',
      jsonRequest('https://example.test/api/studio/ecommerce/tasks/task-1', { name: '春季主图' }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.code).toBe(0);
    expect(deps.hasName).not.toHaveBeenCalled();
    expect(deps.updateName).toHaveBeenCalledWith('task-1', '春季主图');
  });

  it('改名撞到其他任务返回 409', async () => {
    deps.load.mockReturnValue(TASK);
    deps.hasName.mockReturnValue(true);
    deps.parseUpdateTaskRequest.mockReturnValue({ name: '夏季主图' });

    const res = await handlers.handleUpdateTask(
      'task-1',
      jsonRequest('https://example.test/api/studio/ecommerce/tasks/task-1', { name: '夏季主图' }),
    );
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.message).toBe(TASK_NAME_CONFLICT_MESSAGE);
    expect(deps.hasName).toHaveBeenCalledWith('夏季主图', 'task-1');
    expect(deps.updateName).not.toHaveBeenCalled();
  });
});

describe('保存步骤', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('非法步骤键返回 400 步骤标识无效', async () => {
    deps.parseStepKey.mockImplementation(() => {
      throw new ZodError([]);
    });

    const res = await handlers.handleSaveTaskStep(
      'task-1',
      'unknown',
      jsonRequest('https://example.test/api/studio/ecommerce/tasks/task-1/steps/unknown', {
        snapshotVersion: 1,
        data: {},
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({
      code: ApiErrorCode.INVALID_PARAMS,
      message: '步骤标识无效',
      data: null,
    });
    expect(deps.persistSnapshotAssets).not.toHaveBeenCalled();
    expect(deps.saveStep).not.toHaveBeenCalled();
  });

  it('非法步骤数据返回 400 步骤数据无效', async () => {
    deps.parseStepKey.mockReturnValue('visual');
    deps.exists.mockReturnValue(true);
    deps.parseSaveStepRequest.mockImplementation(() => {
      throw new ZodError([]);
    });

    const res = await handlers.handleSaveTaskStep(
      'task-1',
      'visual',
      jsonRequest('https://example.test/api/studio/ecommerce/tasks/task-1/steps/visual', {
        snapshotVersion: 0,
        data: {},
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({
      code: ApiErrorCode.INVALID_PARAMS,
      message: '步骤数据无效',
      data: null,
    });
    expect(deps.persistSnapshotAssets).not.toHaveBeenCalled();
    expect(deps.saveStep).not.toHaveBeenCalled();
  });

  it('合法保存先落盘资产再写入步骤快照', async () => {
    const persisted = { images: [{ url: '/api/studio/ecommerce/tasks/task-1/assets/a1' }] };
    const savedStep = {
      stepKey: 'visual',
      snapshotVersion: 1,
      data: persisted,
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    deps.parseStepKey.mockReturnValue('visual');
    deps.exists.mockReturnValue(true);
    deps.parseSaveStepRequest.mockReturnValue({ snapshotVersion: 1, data: { images: [] } });
    deps.persistSnapshotAssets.mockReturnValue(persisted);
    deps.load.mockReturnValue({ ...TASK, steps: { visual: savedStep } });

    const res = await handlers.handleSaveTaskStep(
      'task-1',
      'visual',
      jsonRequest('https://example.test/api/studio/ecommerce/tasks/task-1/steps/visual', {
        snapshotVersion: 1,
        data: { images: [] },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ code: 0, message: 'ok', data: savedStep });
    expect(deps.persistSnapshotAssets).toHaveBeenCalledWith('task-1', 'visual', { images: [] });
    expect(deps.saveStep).toHaveBeenCalledWith({
      taskId: 'task-1',
      stepKey: 'visual',
      snapshotVersion: 1,
      data: persisted,
    });
    expect(deps.persistSnapshotAssets.mock.invocationCallOrder[0]).toBeLessThan(
      deps.saveStep.mock.invocationCallOrder[0],
    );
  });
});
