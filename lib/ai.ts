// AI drafting via the Anthropic Messages API (no SDK dependency — same HTTP
// pattern as lib/email.ts, so the app has one less package to carry).
//
// This module is a DRAFTING aid only. It never prices anything: it maps a
// free-text enquiry onto the existing content library (destinations,
// accommodations, vehicles, parks) and proposes a trip skeleton for the
// operator to review. Pricing stays entirely in code (lib/rate-resolution.ts +
// the save_trip RPC). See app/admin/trip-builder/actions.ts → draftTripFromEnquiry.
//
// Configuration (optional — the feature reports "not configured" when unset, so
// nothing else breaks):
//   ANTHROPIC_API_KEY — Anthropic API key (server-only)

// Pin the model here so it lives in exactly one place.
const AI_MODEL = 'claude-opus-4-8'
const ANTHROPIC_VERSION = '2023-06-01'

export interface AiJsonRequest {
  system: string
  user: string
  /** JSON Schema the response is constrained to (structured outputs). */
  schema: Record<string, unknown>
  maxTokens?: number
}

export type AiResult =
  | { ok: true; data: unknown }
  | { ok: false; reason: 'not_configured' | 'error'; message: string }

export function aiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

/**
 * One structured-output call: returns JSON guaranteed to match `schema`.
 * Adaptive thinking is on (the mapping is a small reasoning task). The caller
 * is responsible for validating the parsed data against real database IDs —
 * this function only guarantees the shape, never that the model's IDs exist.
 */
export async function aiJson(req: AiJsonRequest): Promise<AiResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { ok: false, reason: 'not_configured', message: 'AI drafting is not configured (ANTHROPIC_API_KEY is unset).' }
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: req.maxTokens ?? 8000,
        thinking: { type: 'adaptive' },
        // Structured outputs: the response text is constrained to the schema,
        // so JSON.parse below cannot throw on a malformed shape.
        output_config: { format: { type: 'json_schema', schema: req.schema } },
        system: req.system,
        messages: [{ role: 'user', content: req.user }],
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`[ai] request failed (${res.status})`, body)
      return { ok: false, reason: 'error', message: `AI request failed (${res.status}).` }
    }

    const payload = (await res.json()) as {
      stop_reason?: string
      content?: Array<{ type: string; text?: string }>
    }

    if (payload.stop_reason === 'refusal') {
      return { ok: false, reason: 'error', message: 'The model declined to draft this enquiry.' }
    }

    const text = (payload.content ?? []).find(b => b.type === 'text')?.text
    if (!text) {
      return { ok: false, reason: 'error', message: 'The model returned no draft.' }
    }

    return { ok: true, data: JSON.parse(text) }
  } catch (err) {
    console.error('[ai] request threw', err)
    return { ok: false, reason: 'error', message: err instanceof Error ? err.message : 'AI request failed.' }
  }
}
