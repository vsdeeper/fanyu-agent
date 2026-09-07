import {
  handleCreateBusinessAnalysisTask,
  handleListBusinessAnalysisTasks,
} from '@/app/api/studio/business-analysis/_server/task-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  return handleListBusinessAnalysisTasks(req);
}

export function POST(req: Request) {
  return handleCreateBusinessAnalysisTask(req);
}
