'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Drop-in replacement for `useTransition` when invoking a server action that
 * calls `revalidatePath`/`revalidateTag` or `router.refresh()`.
 *
 * Why not `useTransition`? Its `isPending` stays true until the revalidation's
 * fresh RSC payload has been received AND reconciled — so on a slow or flaky
 * connection (e.g. a phone on LTE running the installed PWA) a "Saving…" /
 * "Creating…" button can sit stuck long after the write itself succeeded, and
 * optimistic UI updates render *underneath* a button that still looks busy.
 *
 * `run` instead reflects only the action promise: `pending` clears the moment
 * the action settles (in a `finally`, so errors clear it too). Revalidation
 * still happens in the background and reconciles the server state; the button
 * is usable again immediately. Pair it with an optimistic local state update
 * for instant feedback, exactly as you would with `startTransition`.
 *
 *   const { pending, run } = useAction()
 *   run(async () => { const r = await save(fd); if (!r.error) setRows(...) })
 */
export function useAction() {
  const [pending, setPending] = useState(false)
  const mounted = useRef(true)
  useEffect(() => () => { mounted.current = false }, [])

  const run = useCallback((fn: () => Promise<void>) => {
    setPending(true)
    void Promise.resolve()
      .then(fn)
      .finally(() => { if (mounted.current) setPending(false) })
  }, [])

  return { pending, run }
}
