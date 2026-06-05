/** 构建 annotations 对象 */
export function buildAnnotations(input?: { audience?: ('user' | 'assistant')[]; priority?: number }) {
  if (!input) return undefined;
  const result: Record<string, any> = {};
  if (input.audience) result.audience = input.audience;
  if (input.priority !== undefined) result.priority = input.priority;
  return Object.keys(result).length > 0 ? result : undefined;
}
