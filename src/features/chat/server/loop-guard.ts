import type { PrepareStepFunction, ToolSet } from 'ai';

/**
 * 循环守卫：当模型对「同一工具 + 完全相同入参」连续失败若干次时，判定为死循环预兆
 * （行业所称 Loop of Death：思 → 调 tool → 同一错误 → 再调）。
 *
 * 触发后做两件事：
 * 1. 将失败工具从 activeTools 剔除——模型在后续 step 物理上无法再调用它（确定性约束，
 *    而非靠提示说服），避免在同一失败点无限重试直至撞到步数上限。
 * 2. 注入一段收尾指令——引导模型向用户说明失败原因或改用其它工具，而非硬停（硬停会
 *    丢失收尾总结）。
 *
 * 仅作服务端日志，不注入流展示。
 */

const REPEAT_FAILURE_THRESHOLD = 2;

/** 守卫对应 step 里对某工具运行次数的归属键。 */
type FailureKey = `${string}::${string}`;

/**
 * 把工具结果判定为失败：execute 抛出（SDK 生成 type:'tool-error'）或用 `{ ok: false }`
 * 显式返回失败。`generate_image` 的 execute 内部 catch 后返回 `{ ok: false }`，
 * 不走抛出分支，故两种形状都要覆盖。
 */
function isFailedResult(result: {
  type: 'tool-result' | 'tool-error';
  error?: unknown;
  output?: unknown;
}): boolean {
  if (result.type === 'tool-error') return true;
  return typeof result.output === 'object' && result.output !== null && 'ok' in result.output
    ? (result.output as { ok?: boolean }).ok === false
    : false;
}

/**
 * 稳定序列化入参作为分组键。zod 解析出的 input 键序稳定，但字段可能为显式 undefined，
 * `JSON.stringify([undefined])` 会变成 `[null]`，故用 replacer 归一 undefined 为空串，
 * 保证同一语义入参产出同一键。
 */
function stableKey(input: unknown): string {
  const serialized = JSON.stringify(input, (_key, value) => (value === undefined ? '' : value));
  return serialized ?? '';
}

/**
 * 生成守卫。`toolNames` 为注册表全集，用于计算「剔除失败工具后剩余 activeTools」。
 */
export function buildLoopGuard(
  toolNames: Array<keyof ToolSet & string>,
): PrepareStepFunction<ToolSet> {
  // prepareStep 只在某次模型调用前触发；已被移除/注入过的工具用闭包状态记住，
  // 后续 step 持续生效（activeTools 不向后携带，需每次返回；指令只注入一次避免重复）。
  const removedTools = new Set<string>();
  const injectedTools = new Set<string>();

  return ({ steps, instructions }) => {
    const failures = new Map<FailureKey, { count: number; toolName: string }>();
    for (const step of steps) {
      for (const result of step.toolResults) {
        const isFailed = isFailedResult({
          type: result.type,
          error: 'error' in result ? result.error : undefined,
          output: 'output' in result ? result.output : undefined,
        });
        if (!isFailed) continue;
        const key = `${result.toolName}::${stableKey(result.input)}` as FailureKey;
        const entry = failures.get(key);
        if (entry) {
          entry.count += 1;
        } else {
          failures.set(key, { count: 1, toolName: result.toolName });
        }
      }
    }

    // 找到首个达阈值的失败键，剔除其工具。
    let triggerKey: FailureKey | undefined;
    for (const [key, entry] of failures) {
      if (entry.count >= REPEAT_FAILURE_THRESHOLD && !removedTools.has(entry.toolName)) {
        triggerKey = key;
        break;
      }
    }
    if (!triggerKey) return undefined;

    const failedTool = failures.get(triggerKey)!.toolName;
    removedTools.add(failedTool);
    const activeTools = toolNames.filter((name) => name !== failedTool);

    let newInstructions = instructions;
    if (typeof instructions === 'string' && !injectedTools.has(failedTool)) {
      injectedTools.add(failedTool);
      newInstructions = `${instructions}

工具循环提示：你已多次以完全相同参数调用同一工具且均失败。请停止重试该调用，向用户说明失败原因，或改用其它可行方式完成，不要继续重复。`;
    }

    console.info('[loop-guard] repeated tool failure', {
      toolName: failedTool,
      count: failures.get(triggerKey)!.count,
      removedFromActiveTools: true,
    });

    return { instructions: newInstructions, activeTools };
  };
}
