#!/usr/bin/env node
/**
 * Screenshot every screen of the app (admin + public) at desktop and mobile
 * widths, logging console errors and failed requests per page.
 *
 * Requires: app on :3000, dev backend on :54321 (see scripts/dev-backend.mjs)
 * Usage: node scripts/inspect-screens.mjs <outdir> [--only <substr>] [--viewport desktop|mobile|both]
 */
import { chromium } from 'playwright-core'
import { createServerClient } from '@supabase/ssr'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3000'
const outDir = process.argv[2] ?? 'screens'
const onlyIdx = process.argv.indexOf('--only')
const only = onlyIdx !== -1 ? process.argv[onlyIdx + 1] : null
const vpIdx = process.argv.indexOf('--viewport')
const vpChoice = vpIdx !== -1 ? process.argv[vpIdx + 1] : 'both'

const IDS = {
  request: 'aaaa1111-0000-4000-8000-000000000013',
  quote: '6614fca7-3cad-43fb-97c1-9e90bdd605cf',
  booking: 'aaaa1111-0000-4000-8000-00000000000e',
  client: 'aaaa1111-0000-4000-8000-000000000001',
  tour: 'b1746c09-2bb1-41b9-b041-95f4b75f0aa0',
  departure: 'aaaa1111-0000-4000-8000-00000000000b',
  quoteToken: 'da111dd7-a29b-48e3-8b17-003a9fa5a4ef',
}

const ADMIN = [
  '/admin/dashboard', '/admin/requests', '/admin/requests/new', `/admin/requests/${IDS.request}`,
  '/admin/quotes', '/admin/quotes/new', `/admin/quotes/${IDS.quote}`,
  '/admin/trip-builder', `/admin/trip-builder/${IDS.quote}`,
  '/admin/bookings', `/admin/bookings/${IDS.booking}`,
  '/admin/clients', `/admin/clients/${IDS.client}`,
  '/admin/finance', '/admin/finance/expenses', '/admin/finance/payables', '/admin/finance/pnl', '/admin/finance/receipts',
  '/admin/content', '/admin/content/accommodations', '/admin/content/activities', '/admin/content/destinations',
  '/admin/content/parks', '/admin/content/rates', '/admin/content/staff', '/admin/content/tour-staff', '/admin/content/vehicles',
  '/admin/departures', '/admin/departures/new', `/admin/departures/${IDS.departure}`,
  '/admin/suppliers', '/admin/tours', '/admin/tours/new', `/admin/tours/${IDS.tour}`,
  '/admin/tour-templates', '/admin/analytics', '/admin/settings', '/admin/settings/default-tasks',
]
const PUBLIC = [
  '/', '/tours', `/tours/${IDS.tour}`, '/departures', `/departures/${IDS.departure}`,
  '/gallery', '/about', '/contact', '/quote-request', '/login', '/register',
  `/quote/${IDS.quoteToken}`,
]

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
}

const slug = (p) => (p === '/' ? 'home' : p.replace(/^\//, '').replaceAll('/', '_').replace(/[^a-z0-9_-]/gi, '').slice(0, 80))

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
fs.mkdirSync(outDir, { recursive: true })
const report = []

// Sign in through @supabase/ssr against the dev backend and inject the
// session cookies it produces — avoids depending on form interactivity.
async function authCookies() {
  const jar = new Map()
  const client = createServerClient('http://127.0.0.1:54321', 'dev-anon', {
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (cs) => cs.forEach((c) => jar.set(c.name, c.value)),
    },
  })
  const { error } = await client.auth.signInWithPassword({
    email: 'safariadventureriders@gmail.com', password: 'dev',
  })
  if (error) throw new Error(`dev sign-in failed: ${error.message}`)
  return [...jar.entries()].map(([name, value]) => ({
    name, value, domain: '127.0.0.1', path: '/',
  }))
}

async function loginContext(viewport) {
  const ctx = await browser.newContext({ viewport })
  await ctx.addCookies(await authCookies())
  return ctx
}

async function shoot(ctx, route, vpName) {
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)) })
  page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 300)}`))
  page.on('requestfailed', (r) => { if (!r.url().includes('favicon')) errors.push(`reqfail: ${r.url().slice(0, 120)}`) })
  let status = null
  try {
    const resp = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 })
    status = resp?.status() ?? null
    await page.waitForTimeout(600)
    const file = path.join(outDir, `${slug(route)}.${vpName}.png`)
    await page.screenshot({ path: file, fullPage: true })
    report.push({ route, vp: vpName, status, finalUrl: page.url().replace(BASE, ''), errors: [...new Set(errors)].slice(0, 6) })
  } catch (e) {
    report.push({ route, vp: vpName, status, errors: [`NAV FAIL: ${String(e).slice(0, 200)}`] })
  }
  await page.close()
}

const vps = vpChoice === 'both' ? ['desktop', 'mobile'] : [vpChoice]
for (const vpName of vps) {
  const ctx = await loginContext(VIEWPORTS[vpName])
  const routes = [...ADMIN, ...PUBLIC, '/admin-login-page' /* placeholder replaced below */]
  routes.pop()
  for (const r of routes) {
    if (only && !r.includes(only)) continue
    await shoot(ctx, r, vpName)
  }
  // login page without session
  const anon = await browser.newContext({ viewport: VIEWPORTS[vpName] })
  if (!only || '/admin/login'.includes(only)) {
    const page = await anon.newPage()
    await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' }).catch(() => {})
    await page.screenshot({ path: path.join(outDir, `admin_login.${vpName}.png`), fullPage: true }).catch(() => {})
    await page.close()
  }
  await anon.close()
  await ctx.close()
}

await browser.close()
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2))
const bad = report.filter((r) => (r.status && r.status >= 400) || r.errors.length)
console.log(`captured ${report.length} shots → ${outDir}`)
console.log(`pages with errors: ${bad.length}`)
for (const b of bad) console.log(` !! ${b.vp} ${b.route} [${b.status}] ${b.errors[0] ?? ''}`)
