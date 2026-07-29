import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

/**
 * WhatsApp Flows encrypted data-exchange endpoint.
 *
 * Meta POSTs an encrypted envelope; we decrypt it, decide which screen to show
 * next, and return an encrypted response. Docs:
 * https://developers.facebook.com/docs/whatsapp/flows/reference/dataexchange
 *
 * Screen flow (a two-step intake):
 *   INIT                          → CLIENT_DETAILS  (name, email, language)
 *   data_exchange @ CLIENT_DETAILS → REQUEST_DETAILS (tour, dates, size, budget…)
 *   data_exchange @ REQUEST_DETAILS → SUCCESS        (terminal confirmation)
 *
 * The completed submission is delivered separately to the business as an
 * `nfm_reply` message, which the WhatsApp webhook turns into a `leads` row.
 * This endpoint only drives navigation + final validation.
 */

// Meta requires an encrypted, well-formed reply. When we cannot decrypt (usually
// a stale public key on their side), respond 421 so Meta refreshes the key.
const HTTP_KEY_REFRESH = 421

interface FlowRequest {
  version: string
  action: 'INIT' | 'BACK' | 'data_exchange' | 'ping'
  screen?: string
  data?: Record<string, unknown>
  flow_token?: string
}

// What we send back: either a screen to render or a bare data payload
// (health-check / acknowledgement). No `action` — that's request-only.
interface FlowResponse {
  version: string
  screen?: string
  data: Record<string, unknown>
}

function getPrivateKey(): crypto.KeyObject {
  const raw = process.env.WHATSAPP_FLOW_PRIVATE_KEY
  if (!raw) throw new Error('WHATSAPP_FLOW_PRIVATE_KEY is not set')
  // Accept both real newlines and the escaped "\n" form that single-line env
  // vars often carry.
  const pem = raw.includes('-----BEGIN') && raw.includes('\n') ? raw : raw.replace(/\\n/g, '\n')
  const passphrase = process.env.WHATSAPP_FLOW_KEY_PASSPHRASE || undefined
  return crypto.createPrivateKey({ key: pem, format: 'pem', passphrase })
}

interface Decrypted {
  request: FlowRequest
  aesKey: Buffer
  iv: Buffer
}

function decryptRequest(body: {
  encrypted_flow_data: string
  encrypted_aes_key: string
  initial_vector: string
}): Decrypted {
  const privateKey = getPrivateKey()

  // 1. Recover the one-time AES key: it was encrypted with our RSA public key
  //    using RSA-OAEP / SHA-256.
  const aesKey = crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(body.encrypted_aes_key, 'base64')
  )

  // 2. Decrypt the flow payload with AES-GCM. Key length (16/24/32 bytes) picks
  //    the variant; the GCM auth tag is the trailing 16 bytes of the ciphertext.
  const iv = Buffer.from(body.initial_vector, 'base64')
  const encrypted = Buffer.from(body.encrypted_flow_data, 'base64')
  const TAG_LEN = 16
  const tag = encrypted.subarray(encrypted.length - TAG_LEN)
  const ciphertext = encrypted.subarray(0, encrypted.length - TAG_LEN)

  const decipher = crypto.createDecipheriv(
    `aes-${aesKey.length * 8}-gcm` as crypto.CipherGCMTypes,
    aesKey,
    iv
  )
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf-8')

  return { request: JSON.parse(decrypted) as FlowRequest, aesKey, iv }
}

/**
 * Encrypt a response with the same AES key but a *flipped* IV (bitwise NOT of
 * every byte), per the Flow spec, and return it base64-encoded as the raw body.
 */
function encryptResponse(response: unknown, aesKey: Buffer, iv: Buffer): string {
  const flippedIv = Buffer.from(iv.map((b) => ~b & 0xff))
  const cipher = crypto.createCipheriv(
    `aes-${aesKey.length * 8}-gcm` as crypto.CipherGCMTypes,
    aesKey,
    flippedIv
  )
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(response), 'utf-8'),
    cipher.final(),
    cipher.getAuthTag(),
  ])
  return encrypted.toString('base64')
}

// ── Screen definitions ──────────────────────────────────────────────────────
// `data` is merged into the screen's data model on the client; the screen
// layouts themselves live in the Flow JSON configured in WhatsApp Manager.

function clientDetailsScreen(): FlowResponse {
  return {
    version: '3.0',
    screen: 'CLIENT_DETAILS',
    data: {},
  }
}

function requestDetailsScreen(clientData: Record<string, unknown>): FlowResponse {
  return {
    version: '3.0',
    screen: 'REQUEST_DETAILS',
    // Carry the screen-1 answers forward so the final submit payload is complete.
    data: {
      full_name: clientData.full_name ?? '',
      email: clientData.email ?? '',
      preferred_language: clientData.preferred_language ?? 'en',
    },
  }
}

function successScreen(request: FlowRequest, data: Record<string, unknown>): FlowResponse {
  const pick = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : '')
  // `params` becomes the completion message's response_json, which the WhatsApp
  // webhook parses into a `leads` row — so every field we want captured must be
  // here, not just the flow_token.
  return {
    version: request.version,
    screen: 'SUCCESS',
    data: {
      extension_message_response: {
        params: {
          flow_token: request.flow_token ?? '',
          full_name: pick('full_name'),
          email: pick('email'),
          preferred_language: pick('preferred_language') || 'en',
          tour_type: pick('tour_type'),
          travel_dates: pick('travel_dates'),
          group_size: pick('group_size'),
          budget_range: pick('budget_range'),
          special_requests: pick('special_requests'),
        },
      },
    },
  }
}

/** Validate the fields collected across both screens on final submit. */
function validateSubmission(data: Record<string, unknown>): string[] {
  const errors: string[] = []
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

  if (!str(data.full_name)) errors.push('full_name')
  const email = str(data.email)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email')
  if (!str(data.tour_type)) errors.push('tour_type')
  if (!str(data.travel_dates)) errors.push('travel_dates')

  return errors
}

function routeAction(request: FlowRequest): FlowResponse {
  const data = request.data ?? {}

  // Health check — Meta pings the endpoint to confirm it's alive.
  if (request.action === 'ping') {
    return { version: request.version, data: { status: 'active' } }
  }

  // Client-reported error notification — acknowledge it.
  if (data.error_message || data.error) {
    return { version: request.version, data: { acknowledged: true } }
  }

  // First open — show screen 1.
  if (request.action === 'INIT') {
    return clientDetailsScreen()
  }

  if (request.action === 'data_exchange') {
    switch (request.screen) {
      case 'CLIENT_DETAILS':
        // Screen 1 submitted → advance to screen 2, carrying the answers.
        return requestDetailsScreen(data)

      case 'REQUEST_DETAILS': {
        // Final submit — validate everything, then terminate on SUCCESS.
        const errors = validateSubmission(data)
        if (errors.length > 0) {
          return {
            version: request.version,
            screen: 'REQUEST_DETAILS',
            data: {
              ...data,
              error_message: `Please complete: ${errors.join(', ')}`,
            },
          }
        }
        return successScreen(request, data)
      }
    }
  }

  // BACK or anything unrecognised — fall back to screen 1.
  return clientDetailsScreen()
}

export async function POST(request: NextRequest) {
  let body: {
    encrypted_flow_data?: string
    encrypted_aes_key?: string
    initial_vector?: string
  }
  try {
    body = await request.json()
  } catch {
    return new NextResponse('Bad Request', { status: 400 })
  }

  if (!body.encrypted_flow_data || !body.encrypted_aes_key || !body.initial_vector) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  let decrypted: Decrypted
  try {
    decrypted = decryptRequest(
      body as { encrypted_flow_data: string; encrypted_aes_key: string; initial_vector: string }
    )
  } catch {
    // Decryption failed — most often a stale public key on Meta's side. 421
    // asks Meta to re-fetch our public key and retry.
    return new NextResponse('Failed to decrypt request', { status: HTTP_KEY_REFRESH })
  }

  const responseObject = routeAction(decrypted.request)
  const encrypted = encryptResponse(responseObject, decrypted.aesKey, decrypted.iv)

  // The body is the raw base64 string (not JSON), returned as text.
  return new NextResponse(encrypted, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })
}
