# WhatsApp Flow — Safari intake

`safari-intake.flow.json` is the starter Flow definition for the WhatsApp
lead-capture form. Paste it into **WhatsApp Manager → Flows → Create flow →
Edit → `</>` (JSON editor)**.

## Screen / field contract

The JSON, the encrypted endpoint (`app/api/flows/data-exchange/route.ts`), and
the webhook (`app/api/webhooks/whatsapp/route.ts`) must agree on these names:

| Screen            | Fields                                                                 |
| ----------------- | ---------------------------------------------------------------------- |
| `CLIENT_DETAILS`  | `full_name`, `email`, `preferred_language`                             |
| `REQUEST_DETAILS` | `tour_type`, `travel_dates`, `group_size`, `budget_range`, `special_requests` |
| `SUCCESS`         | terminal confirmation                                                  |

`phone_number` is not collected in the form — it comes from the sender of the
WhatsApp message. On final submit the endpoint returns the collected fields in
`extension_message_response.params`; that object is delivered to the business as
the `nfm_reply.response_json`, which the webhook turns into a `leads` row.

## Wiring it up in WhatsApp Manager

1. Paste this JSON into the Flow's JSON editor and save.
2. Set the Flow's **Endpoint URI** to `https://<your-domain>/api/flows/data-exchange`.
3. Complete **Flows encryption** for the phone number (public key from
   `scripts/generate-flow-keys.ts`; private key in `WHATSAPP_FLOW_PRIVATE_KEY`).
4. Publish the Flow, then send it (e.g. from an interactive Flow message).

The endpoint answers the health-check `ping` and returns `421` on decrypt
failure so Meta refreshes the public key.
