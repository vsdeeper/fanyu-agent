import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({
  hasProductModelTaskName: vi.fn(),
  createProductModelTask: vi.fn(),
  loadProductModelTask: vi.fn(),
  listProductModelTasks: vi.fn(),
  updateProductModelTaskName: vi.fn(),
  deleteProductModelTask: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('./task-store', () => store);

import { ApiErrorCode } from '@/lib/shared/server/api-response';
import { TASK_NAME_CONFLICT_MESSAGE } from '../_shared/task-constants';
import { handleUpdateProductModelTask } from './handle-task-by-id';
import { handleCreateProductModelTask } from './handle-tasks';

const TASK = {
  id: 'task-1',
  name: '春季模特',
  workflowVersion: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  steps: {},
};

function jsonRequest(body: unknown): Request {
  return new Request('https://example.test/api/product-model/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('产品模特任务名称冲突', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('同名创建返回 409', async () => {
    store.hasProductModelTaskName.mockReturnValue(true);

    const res = await handleCreateProductModelTask(jsonRequest({ name: '春季模特' }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body).toEqual({
      code: ApiErrorCode.TASK_NAME_CONFLICT,
      message: TASK_NAME_CONFLICT_MESSAGE,
      data: null,
    });
    expect(store.createProductModelTask).not.toHaveBeenCalled();
  });

  it('trim 后与已有名称相同视为冲突', async () => {
    store.hasProductModelTaskName.mockReturnValue(true);

    const res = await handleCreateProductModelTask(jsonRequest({ name: ' 春季模特 ' }));

    expect(res.status).toBe(409);
    expect(store.hasProductModelTaskName).toHaveBeenCalledWith('春季模特');
  });

  it('改成自己原名可以通过', async () => {
    store.loadProductModelTask.mockReturnValue(TASK);
    store.hasProductModelTaskName.mockReturnValue(true);
    store.updateProductModelTaskName.mockReturnValue(true);

    const res = await handleUpdateProductModelTask('task-1', jsonRequest({ name: '春季模特' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.code).toBe(0);
    expect(store.hasProductModelTaskName).not.toHaveBeenCalled();
    expect(store.updateProductModelTaskName).toHaveBeenCalledWith('task-1', '春季模特');
  });

  it('改名撞到其他任务返回 409', async () => {
    store.loadProductModelTask.mockReturnValue(TASK);
    store.hasProductModelTaskName.mockReturnValue(true);

    const res = await handleUpdateProductModelTask('task-1', jsonRequest({ name: '夏季模特' }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.message).toBe(TASK_NAME_CONFLICT_MESSAGE);
    expect(store.hasProductModelTaskName).toHaveBeenCalledWith('夏季模特', 'task-1');
    expect(store.updateProductModelTaskName).not.toHaveBeenCalled();
  });
});
