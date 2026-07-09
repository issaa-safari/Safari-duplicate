// Shared result envelope for server actions.
//
// Next.js masks `throw new Error(msg)` messages in production builds, so
// actions that want the UI to show a real message must RETURN it instead of
// throwing. `safeAction` wraps an action body: validation/DB errors become
// `{ error }`, while Next's own control-flow errors (redirect/notFound) are
// rethrown so the framework can handle them.

export type ActionResult<T = Record<never, never>> =
  | ({ error: null } & T)
  | { error: string }

/** True for the internal errors Next.js throws for redirect()/notFound() —
 *  these must propagate, never be shown as messages. */
export function isNextControlFlowError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const digest = (err as { digest?: unknown }).digest
  return typeof digest === 'string' &&
    (digest.startsWith('NEXT_REDIRECT') ||
      digest === 'NEXT_NOT_FOUND' ||
      digest.startsWith('NEXT_HTTP_ERROR_FALLBACK'))
}

export function safeAction<Args extends unknown[], T = Record<never, never>>(
  fn: (...args: Args) => Promise<({ error: null } & T) | void>,
): (...args: Args) => Promise<ActionResult<T>> {
  return async (...args: Args): Promise<ActionResult<T>> => {
    try {
      const result = await fn(...args)
      return (result ?? { error: null }) as ActionResult<T>
    } catch (err) {
      if (isNextControlFlowError(err)) throw err
      return { error: err instanceof Error ? err.message : 'Something went wrong.' }
    }
  }
}
