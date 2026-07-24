import { createMcpHandler } from 'mcp-handler'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSafariDraft, type IntakePayload } from '@/lib/server/ai-intake'

// Remote MCP endpoint for the Cowork "safari-intake" plugin. Claude conducts the
// enquiry interview, then calls create_safari_draft with the assembled trip. This
// endpoint only persists a DRAFT (client + request + quote + itinerary) and returns
// a link — no pricing, no sending, no server-side model call. Gated by a bearer
// token so only the operator's connector can write.

// Absolute base URL for the review link (e.g. https://app.example.com). When unset
// the tool returns the relative path, which still works once prefixed with the host.
const APP_BASE_URL = (process.env.APP_BASE_URL ?? '').replace(/\/$/, '')

const dayShape = z.object({
  destination: z.string().describe('Destination name for the stop, e.g. "Masai Mara".'),
  accommodation: z.string().optional().describe('Lodge/camp/hotel name for the night, if any.'),
  activities: z.array(z.string()).optional().describe('Activity names, e.g. ["Game drive"].'),
  meals: z.array(z.string()).optional().describe('Meal codes included: any of "B","L","D".'),
  nights: z.number().int().optional().describe('Nights at this stop (default 1); >1 becomes a multi-night day span.'),
  notes: z.string().optional().describe('Free-text notes for this day.'),
})

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'create_safari_draft',
      {
        title: 'Create safari draft quote',
        description:
          'Create a DRAFT quote + request in the Safari admin from an assembled enquiry. ' +
          'Destinations, lodges and activities are given as plain names and matched to the ' +
          "operator's content library server-side; unmatched names are recorded for the operator. " +
          'Never prices or sends — the operator finishes in the app via the returned link. ' +
          'Call this only after the interview is complete and confirmed.',
        inputSchema: {
          guest: z.object({
            name: z.string().describe('Lead guest full name.'),
            email: z.string().optional(),
            phone: z.string().optional(),
            whatsapp: z.string().optional(),
            country: z.string().optional(),
            language: z.string().optional().describe('"English"/"en" or "Arabic"/"ar".'),
            notes: z.string().optional().describe('Notes about the client.'),
          }),
          adults: z.number().int().min(1),
          childAges: z.array(z.number().int()).optional().describe('One age per child (0–17).'),
          startDate: z.string().optional().describe('Trip start, YYYY-MM-DD.'),
          endDate: z.string().optional().describe('Trip end, YYYY-MM-DD (else derived from nights).'),
          nights: z.number().int().optional().describe('Whole-trip nights, if stated.'),
          title: z.string().optional().describe('Short quote title.'),
          tripType: z.string().optional().describe('Wildlife safari / Honeymoon / Family / Beach / Bike tour / Private.'),
          roomType: z.string().optional().describe('Sharing/Twin, Single, Triple, Extra bed, No bed.'),
          residency: z.string().optional().describe('Non-resident (default GCC) / Resident / Citizen.'),
          heardAboutUs: z.string().optional().describe('Instagram / WhatsApp referral / Returning client / Travel agent / Website / Other.'),
          priority: z.string().optional().describe('Normal / High.'),
          budgetNote: z.string().optional().describe('Budget/style/special requests noted for the operator.'),
          days: z.array(dayShape).min(1).describe('One entry per stop, in order.'),
        },
      },
      async (args) => {
        const admin = createAdminClient()
        const result = await createSafariDraft(admin, args as unknown as IntakePayload)

        if (!result.ok) {
          return { content: [{ type: 'text' as const, text: `Could not create the draft: ${result.message}` }], isError: true }
        }

        const link = APP_BASE_URL ? `${APP_BASE_URL}${result.url}` : result.url
        const lines = [
          `Draft created — quote ${result.quoteNumber ?? '(number pending)'}${result.requestRef ? `, request ${result.requestRef}` : ''}.`,
          `Open to review and price: ${link}`,
          result.unmatched.length > 0
            ? `Not matched to the library (kept as typed — fix in the app): ${result.unmatched.join(', ')}.`
            : 'All destinations, lodges and activities matched the content library.',
        ]
        return { content: [{ type: 'text' as const, text: lines.join('\n') }] }
      },
    )
  },
  {},
  { basePath: '/api', maxDuration: 60 },
)

// Token gate. Two ways to present the token, so both surfaces work:
//   • Cowork plugin — Authorization: Bearer <MCP_INTAKE_TOKEN> header (.mcp.json).
//   • Claude app custom connector — the connector UI can't set a header, so the
//     token rides in the URL as ?token=<MCP_INTAKE_TOKEN>. Give the operator a
//     connector URL of the form  https://<app>/api/mcp?token=<MCP_INTAKE_TOKEN>.
function extractToken(req: Request): string {
  const header = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (header) return header
  try {
    return new URL(req.url).searchParams.get('token')?.trim() ?? ''
  } catch {
    return ''
  }
}

async function authed(req: Request): Promise<Response> {
  const expected = process.env.MCP_INTAKE_TOKEN
  const token = extractToken(req)
  if (!expected || token !== expected) {
    return new Response('Unauthorized', { status: 401 })
  }
  return handler(req)
}

export { authed as GET, authed as POST, authed as DELETE }
