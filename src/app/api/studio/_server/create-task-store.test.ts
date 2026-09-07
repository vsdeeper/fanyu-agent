import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbState } = vi.hoisted(() => ({
  dbState: {
    tasks: [] as Array<{
      id: string;
      name: string;
      workflowVersion: number;
      createdAt: string;
      updatedAt: string;
    }>,
    nameMatches: [] as Array<{ id: string }>,
    steps: [] as Array<{
      taskId: string;
      stepKey: string;
      snapshotVersion: number;
      data: string;
      updatedAt: string;
    }>,
  },
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/client', async () => {
  const { getTableName } = await import('drizzle-orm');
  return {
    getDb: () => ({
      select: (projection?: { id?: unknown; taskId?: unknown; stepKey?: unknown }) => ({
        from: (table: Parameters<typeof getTableName>[0]) => {
          const isSteps = getTableName(table).includes('steps');
          const chain = {
            from: () => chain,
            where: () => chain,
            orderBy: () => chain,
            all: () => {
              if (isSteps) {
                if (projection && 'taskId' in projection) {
                  return dbState.steps.map((step) => ({
                    taskId: step.taskId,
                    stepKey: step.stepKey,
                  }));
                }
                return dbState.steps;
              }
              if (projection && 'id' in projection) {
                return dbState.nameMatches;
              }
              return dbState.tasks;
            },
            get: () => (isSteps ? undefined : dbState.tasks[0]),
          };
          return chain;
        },
      }),
    }),
  };
});

import { ecommerceTaskSteps, ecommerceTasks } from '@/lib/db/schema';
import {
  ECOMMERCE_STEP_KEYS,
  ECOMMERCE_WORKFLOW_VERSION,
} from '../ecommerce/_shared/task-constants';
import { createTaskStore } from './create-task-store';

const store = createTaskStore({
  tasksTable: ecommerceTasks,
  stepsTable: ecommerceTaskSteps,
  stepKeys: ECOMMERCE_STEP_KEYS,
  workflowVersion: ECOMMERCE_WORKFLOW_VERSION,
  removeTaskAssetDirectory: vi.fn(),
});

describe('createTaskStore', () => {
  beforeEach(() => {
    dbState.tasks = [];
    dbState.nameMatches = [];
    dbState.steps = [];
  });

  it('hasName 改名时排除自身', () => {
    dbState.nameMatches = [{ id: 'task-1' }];
    expect(store.hasName('春季主图', 'task-1')).toBe(false);
    expect(store.hasName('春季主图', 'task-2')).toBe(true);
    expect(store.hasName('春季主图')).toBe(true);
  });

  it('load 把步骤快照中的旧资产 URL 改写为 /api/studio 前缀', () => {
    dbState.tasks = [
      {
        id: 'task-1',
        name: '春季主图',
        workflowVersion: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ];
    dbState.steps = [
      {
        taskId: 'task-1',
        stepKey: 'visual',
        snapshotVersion: 1,
        data: JSON.stringify({
          images: [{ previewUrl: '/api/ecommerce/tasks/task-1/assets/old' }],
        }),
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ];

    expect(store.load('task-1')).toEqual({
      id: 'task-1',
      name: '春季主图',
      workflowVersion: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      steps: {
        visual: {
          stepKey: 'visual',
          snapshotVersion: 1,
          data: { images: [{ previewUrl: '/api/studio/ecommerce/tasks/task-1/assets/old' }] },
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      },
    });
  });

  it('list 按名称过滤并分页', () => {
    dbState.tasks = [
      {
        id: 'task-1',
        name: '春季主图',
        workflowVersion: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
      },
      {
        id: 'task-2',
        name: '夏季主图',
        workflowVersion: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'task-3',
        name: '春季详情',
        workflowVersion: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    dbState.steps = [
      { taskId: 'task-1', stepKey: 'analysis', snapshotVersion: 1, data: '{}', updatedAt: '' },
    ];

    expect(store.list({ name: '春季', page: 1, pageSize: 1 })).toEqual({
      items: [
        {
          id: 'task-1',
          name: '春季主图',
          workflowVersion: 1,
          completedStepKeys: ['analysis'],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-03T00:00:00.000Z',
        },
      ],
      total: 2,
      page: 1,
      pageSize: 1,
    });
    expect(store.list({ name: '春季', page: 2, pageSize: 1 }).items).toEqual([
      {
        id: 'task-3',
        name: '春季详情',
        workflowVersion: 1,
        completedStepKeys: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });
});
