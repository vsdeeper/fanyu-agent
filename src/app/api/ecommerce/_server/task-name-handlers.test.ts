import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({
  hasEcommerceTaskName: vi.fn(),
  createEcommerceTask: vi.fn(),
  loadEcommerceTask: vi.fn(),
  listEcommerceTasks: vi.fn(),
  updateEcommerceTaskName: vi.fn(),
  deleteEcommerceTask: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('./task-store', () => store);

import { ApiErrorCode } from '@/lib/shared/server/api-response';
import { TASK_NAME_CONFLICT_MESSAGE } from '../_shared/task-constants';
import { handleUpdateEcommerceTask } from './handle-task-by-id';
import { handleCreateEcommerceTask } from './handle-tasks';

const TASK = {
  id: 'task-1',
  name: '春季主图',
  taskType: '主图' as const,
  workflowVersion: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  steps: {},
};

function jsonRequest(body: unknown): Request {
  return new Request('https://example.test/api/ecommerce/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('电商设计任务名称冲突', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('同名创建返回 409', async () => {
    store.hasEcommerceTaskName.mockReturnValue(true);

    const res = await handleCreateEcommerceTask(
      jsonRequest({ name: '春季主图', taskType: '主图' }),
    );
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body).toEqual({
      code: ApiErrorCode.TASK_NAME_CONFLICT,
      message: TASK_NAME_CONFLICT_MESSAGE,
      data: null,
    });
    expect(store.createEcommerceTask).not.toHaveBeenCalled();
  });

  it('trim 后与已有名称相同视为冲突', async () => {
    store.hasEcommerceTaskName.mockReturnValue(true);

    const res = await handleCreateEcommerceTask(
      jsonRequest({ name: ' 春季主图 ', taskType: '主图' }),
    );

    expect(res.status).toBe(409);
    expect(store.hasEcommerceTaskName).toHaveBeenCalledWith('春季主图');
  });

  it('改成自己原名可以通过', async () => {
    store.loadEcommerceTask.mockReturnValue(TASK);
    store.hasEcommerceTaskName.mockReturnValue(true);
    store.updateEcommerceTaskName.mockReturnValue(true);

    const res = await handleUpdateEcommerceTask('task-1', jsonRequest({ name: '春季主图' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.code).toBe(0);
    expect(store.hasEcommerceTaskName).not.toHaveBeenCalled();
    expect(store.updateEcommerceTaskName).toHaveBeenCalledWith('task-1', '春季主图');
  });

  it('改名撞到其他任务返回 409', async () => {
    store.loadEcommerceTask.mockReturnValue(TASK);
    store.hasEcommerceTaskName.mockReturnValue(true);

    const res = await handleUpdateEcommerceTask('task-1', jsonRequest({ name: '夏季主图' }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.message).toBe(TASK_NAME_CONFLICT_MESSAGE);
    expect(store.hasEcommerceTaskName).toHaveBeenCalledWith('夏季主图', 'task-1');
    expect(store.updateEcommerceTaskName).not.toHaveBeenCalled();
  });
});
