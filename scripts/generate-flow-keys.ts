/**
 * Generate the RSA keypair WhatsApp Flows uses for its encrypted data-exchange.
 *
 * Meta encrypts the per-request AES key with your RSA *public* key; our
 * endpoint (app/api/flows/data-exchange/route.ts) decrypts it with the
 * matching *private* key. This script mints that pair.
 *
 * Run it once (Node 22.6+ can execute TypeScript directly):
 *
 *   node --experimental-strip-types scripts/generate-flow-keys.ts
 *   # or, if you have it:  npx tsx scripts/generate-flow-keys.ts
 *
 * Optionally protect the private key with a passphrase:
 *
 *   FLOW_KEY_PASSPHRASE='some-secret' node --experimental-strip-types scripts/generate-flow-keys.ts
 *
 * It writes the private key to whatsapp-flow-private.pem (gitignored by the
 * repo's `*.pem` rule — never commit it) and prints the public key to paste
 * into Meta → WhatsApp Manager → your phone number → "Set up encryption".
 *
 * Then set WHATSAPP_FLOW_PRIVATE_KEY in your deployment to the file's contents
 * (and FLOW_KEY_PASSPHRASE if you used one). See the printed instructions.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const OUT_FILE = path.join(process.cwd(), 'whatsapp-flow-private.pem')
const passphrase = process.env.FLOW_KEY_PASSPHRASE?.trim() || undefined

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: passphrase
    ? { type: 'pkcs8', format: 'pem', cipher: 'aes-256-cbc', passphrase }
    : { type: 'pkcs8', format: 'pem' },
})

// Refuse to clobber an existing key — regenerating invalidates the public key
// already registered with Meta, silently breaking a live Flow.
if (fs.existsSync(OUT_FILE)) {
  console.error(
    `\n✗ ${path.basename(OUT_FILE)} already exists.\n` +
      `  Delete it first if you really mean to replace the keypair — note that\n` +
      `  regenerating invalidates the public key currently registered with Meta.\n`
  )
  process.exit(1)
}

fs.writeFileSync(OUT_FILE, privateKey, { mode: 0o600 })

console.log('\n✓ Private key written to', OUT_FILE, '(gitignored — do NOT commit)')
if (passphrase) {
  console.log('  Encrypted with your FLOW_KEY_PASSPHRASE.')
}

console.log('\n── PUBLIC KEY — paste into Meta → WhatsApp Manager → Encryption ──\n')
console.log(publicKey.trim())

console.log('\n── Then set these in your deployment (Vercel env vars) ──\n')
console.log('WHATSAPP_FLOW_PRIVATE_KEY  = the full contents of the .pem file above')
if (passphrase) {
  console.log('WHATSAPP_FLOW_KEY_PASSPHRASE = the passphrase you just used')
}
console.log(
  '\nTip: env vars are single-line. Either keep the real newlines (most\n' +
    'dashboards allow multi-line values) or replace each newline with the two\n' +
    'characters \\n — the route accepts both.\n'
)
