# Safari Intake — Cowork plugin

Chat a client enquiry into a **draft quote + request** in your Safari admin, without opening the
app. Claude runs a short step-by-step interview (client → dates → travellers → day-by-day
itinerary), then creates an unpriced draft and hands you a link to finish pricing and sending.

It never prices and never sends — that stays in the app, in code.

## What it needs

The plugin bundles a connector to your app's `/api/mcp` endpoint. Two environment values wire it up:

| Where | Variable | Value |
|---|---|---|
| Your app (Vercel) | `MCP_INTAKE_TOKEN` | A long random secret. The endpoint rejects any request without it. |
| Your app (Vercel) | `APP_BASE_URL` | Your admin URL, e.g. `https://app.safariadventureriders.com` (used to build the review link). |
| Where Cowork runs | `SAFARI_APP_URL` | Same admin URL. |
| Where Cowork runs | `MCP_INTAKE_TOKEN` | The **same** secret as in your app. |

Generate a token once (e.g. `openssl rand -hex 32`) and put the identical value in both places.

## Install

1. Deploy the app with `MCP_INTAKE_TOKEN` and `APP_BASE_URL` set.
2. In Cowork, set `SAFARI_APP_URL` and `MCP_INTAKE_TOKEN` in the environment.
3. Add the marketplace and install:
   ```
   /plugin marketplace add issaa-safari/Safari-duplicate
   /plugin install safari-intake@safari-adventure
   ```
4. Approve the bundled `safari-intake` MCP server when prompted.

## Use

Run `/new-enquiry` (optionally paste the client's message after it), then answer the questions.
At the end Claude creates the draft and gives you the quote number, a review link, and any names
that didn't match your content library (fix those in the app).

## Notes

- **Draft only.** The quote and request are created as drafts; open the link to price and send.
- **Names are free text.** You don't need exact spelling — the app matches destinations, lodges
  and activities to your library and lists anything it couldn't match.
- **Security.** `/api/mcp` is a token-protected write endpoint using the service role. Keep
  `MCP_INTAKE_TOKEN` secret and rotate it if exposed.
