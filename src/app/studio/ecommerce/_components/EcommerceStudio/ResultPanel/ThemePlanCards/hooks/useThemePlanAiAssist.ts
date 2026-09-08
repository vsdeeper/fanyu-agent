import { useCallback, useRef, useState } from 'react';

type AssistFn = (themeId: string, draft: string) => Promise<string>;

/**
 * 编辑态 AI 帮写：请求中禁用按钮，成功后写回草稿；取消或切换编辑后丢弃迟到结果。
 */
export function useThemePlanAiAssist(
  onAiAssist: AssistFn | undefined,
  setDraft: (next: string) => void,
) {
  const [assistLoading, setAssistLoading] = useState(false);
  const sessionRef = useRef(0);

  const invalidateAssist = useCallback(() => {
    sessionRef.current += 1;
    setAssistLoading(false);
  }, []);

  const runAssist = useCallback(
    async (themeId: string, draft: string) => {
      if (!onAiAssist) return;
      const session = sessionRef.current;
      setAssistLoading(true);
      try {
        const next = await onAiAssist(themeId, draft);
        if (session !== sessionRef.current) return;
        const trimmed = next.trim();
        if (trimmed) setDraft(trimmed);
      } catch {
        /* api-client 已提示 */
      } finally {
        if (session === sessionRef.current) setAssistLoading(false);
      }
    },
    [onAiAssist, setDraft],
  );

  return { assistLoading, runAssist, invalidateAssist };
}
