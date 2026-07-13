#!/usr/bin/env node
/**
 * Local dev backend: emulates the slice of the Supabase HTTP API that
 * supabase-js actually uses in this app (PostgREST REST + GoTrue auth +
 * storage upload), backed by a local Postgres loaded with ./migrations.
 *
 * Why: lets the full app (admin + public) run end-to-end on machines that
 * can't reach the live Supabase project. Business logic, RPC functions and
 * RLS-free service-role behavior all execute for real against local data.
 *
 * Usage:
 *   1. Load ./migrations into a local Postgres (see scripts/dev-backend.md)
 *   2. DATABASE_URL=postgres://postgres@127.0.0.1:5433/safari node scripts/dev-backend.mjs
 *   3. Point the app at it via .env.local:
 *        NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
 *        NEXT_PUBLIC_SUPABASE_ANON_KEY=dev-anon
 *        SUPABASE_SERVICE_ROLE_KEY=dev-service
 *
 * Any email/password logs in as the first admin_users row.
 */
import http from 'node:http'
import crypto from 'node:crypto'
import pg from 'pg'

const PORT = Number(process.env.PORT ?? 54321)
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://postgres@127.0.0.1:5433/safari'

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8 })

/* ── schema metadata (FKs for embeds, column types for casts) ─────────── */
const meta = { fks: [], cols: new Map(), fns: new Map() }

async function loadMeta() {
  const fkq = await pool.query(`
    select tc.table_name as child, kcu.column_name as col, ccu.table_name as parent
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
    where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'`)
  meta.fks = fkq.rows
  const colq = await pool.query(`
    select table_name, column_name, data_type
    from information_schema.columns where table_schema = 'public'`)
  for (const r of colq.rows) {
    if (!meta.cols.has(r.table_name)) meta.cols.set(r.table_name, new Map())
    meta.cols.get(r.table_name).set(r.column_name, r.data_type)
  }
  const fnq = await pool.query(`
    select p.proname, p.proretset, t.typname as rettype
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    join pg_type t on t.oid = p.prorettype
    where n.nspname = 'public'`)
  for (const r of fnq.rows) meta.fns.set(r.proname, r)
}

const fkChildToParent = (child, parent) =>
  meta.fks.filter((f) => f.child === child && f.parent === parent)

/**
 * Pick the embed direction between parent (the table being queried) and
 * child (the embedded name). When FKs exist in both directions (e.g.
 * quotes.accepted_version_id → quote_versions AND quote_versions.quote_id
 * → quotes), prefer the FK whose column follows the canonical
 * `<singular-table>_id` convention — that matches how the app's queries
 * expect these embeds to resolve.
 */
function chooseEmbed(parentTable, child) {
  const toChild = fkChildToParent(parentTable, child)  // many-to-one (object)
  const toParent = fkChildToParent(child, parentTable) // one-to-many (array)
  const singular = (t) => (t.endsWith('s') ? t.slice(0, -1) : t)
  if (toChild.length > 0 && toParent.length > 0) {
    const childCanonical = toChild.find((f) => f.col === `${singular(child)}_id`)
    const parentCanonical = toParent.find((f) => f.col === `${singular(parentTable)}_id`)
    if (parentCanonical && !childCanonical) return { dir: 'many', fk: parentCanonical }
    if (childCanonical && !parentCanonical) return { dir: 'one', fk: childCanonical }
  }
  if (toChild.length > 0) return { dir: 'one', fk: toChild[0] }
  if (toParent.length > 0) return { dir: 'many', fk: toParent[0] }
  return null
}

function colType(table, col) {
  return meta.cols.get(table)?.get(col) ?? 'text'
}
function castFor(type) {
  // cast text params to the column's type so uuid/date/numeric comparisons work
  if (type === 'USER-DEFINED' || type === 'ARRAY') return ''
  if (type.includes('timestamp')) return '::timestamptz'
  const map = {
    uuid: '::uuid', date: '::date', integer: '::int', bigint: '::bigint',
    numeric: '::numeric', boolean: '::boolean', 'double precision': '::float8',
    real: '::float4', smallint: '::int2', jsonb: '::jsonb', json: '::json',
  }
  return map[type] ?? ''
}

/* ── select-clause parser: "a, b, alias:tbl!inner(c, nested(d)), *" ───── */
function parseSelect(sel) {
  const s = (sel ?? '*').replace(/\s+/g, '')
  const items = []
  let depth = 0, cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) { items.push(cur); cur = '' } else cur += ch
  }
  if (cur) items.push(cur)
  return items.filter(Boolean).map(parseItem)
}
function parseItem(item) {
  const open = item.indexOf('(')
  if (open === -1) {
    let alias = null, name = item
    const colon = item.indexOf(':')
    if (colon !== -1) { alias = item.slice(0, colon); name = item.slice(colon + 1) }
    return { kind: 'col', name, alias }
  }
  let head = item.slice(0, open)
  const inner = item.slice(open + 1, item.lastIndexOf(')'))
  let alias = null
  const colon = head.indexOf(':')
  if (colon !== -1) { alias = head.slice(0, colon); head = head.slice(colon + 1) }
  let innerJoin = false
  const bang = head.indexOf('!')
  let name = head
  if (bang !== -1) {
    name = head.slice(0, bang)
    innerJoin = head.slice(bang + 1) === 'inner' || head.includes('inner')
  }
  return { kind: 'embed', name, alias, innerJoin, children: parseSelect(inner) }
}

/* ── embed SQL: lateral subqueries via FK direction ───────────────────── */
function embedSql(parentTable, node, params) {
  const child = node.name
  const rel = chooseEmbed(parentTable, child)
  if (!rel) throw Object.assign(new Error(`no relationship between ${parentTable} and ${child}`), { status: 400 })
  const cols = selectListSql(child, node.children, params)
  if (rel.dir === 'one') {
    return {
      dir: 'one',
      sql: `(select ${cols.jsonPairs} from ${q(child)} __e where __e.id = ${q(parentTable)}.${q(rel.fk.col)})`,
      existsSql: `${q(parentTable)}.${q(rel.fk.col)} is not null`,
    }
  }
  return {
    dir: 'many',
    sql: `(select coalesce(jsonb_agg(${cols.jsonPairs}), '[]'::jsonb) from ${q(child)} __e where __e.${q(rel.fk.col)} = ${q(parentTable)}.id)`,
    existsSql: `exists (select 1 from ${q(child)} __e where __e.${q(rel.fk.col)} = ${q(parentTable)}.id)`,
  }
}

// builds jsonb_build_object over the requested columns of an embedded table
function selectListSql(table, children, params) {
  const pairs = []
  for (const c of children) {
    if (c.kind === 'col') {
      if (c.name === '*') {
        pairs.push(`to_jsonb(__e)`)
      } else {
        pairs.push(`jsonb_build_object('${c.alias ?? c.name}', __e.${q(c.name)})`)
      }
    } else {
      const sub = embedSqlInner(table, c, params)
      pairs.push(`jsonb_build_object('${c.alias ?? c.name}', ${sub})`)
    }
  }
  if (pairs.length === 0) pairs.push(`to_jsonb(__e)`)
  return { jsonPairs: pairs.reduce((a, b) => `${a} || ${b}`) }
}

// nested embeds relative to alias __e (one extra depth level is all the app uses,
// but recursion handles arbitrary depth)
function embedSqlInner(parentTable, node, params) {
  const child = node.name
  const rel = chooseEmbed(parentTable, child)
  if (!rel) throw Object.assign(new Error(`no relationship between ${parentTable} and ${child}`), { status: 400 })
  const inner = selectListSqlNested(child, node.children, params)
  if (rel.dir === 'one') {
    return `(select ${inner} from ${q(child)} __e2 where __e2.id = __e.${q(rel.fk.col)})`
  }
  return `(select coalesce(jsonb_agg(${inner}), '[]'::jsonb) from ${q(child)} __e2 where __e2.${q(rel.fk.col)} = __e.id)`
}
function selectListSqlNested(table, children) {
  const pairs = []
  for (const c of children) {
    if (c.kind === 'col') {
      if (c.name === '*') pairs.push(`to_jsonb(__e2)`)
      else pairs.push(`jsonb_build_object('${c.alias ?? c.name}', __e2.${q(c.name)})`)
    }
  }
  if (pairs.length === 0) pairs.push(`to_jsonb(__e2)`)
  return pairs.reduce((a, b) => `${a} || ${b}`)
}

const q = (ident) => '"' + ident.replaceAll('"', '""') + '"'

/* ── filters: eq./neq./in./is./not./gte./lte./gt./lt./ilike./or=() ────── */
function parseInList(v) {
  // in.("a","b") or in.(1,2)
  const inner = v.replace(/^\(/, '').replace(/\)$/, '')
  const out = []
  let cur = '', quoted = false
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (ch === '"') { quoted = !quoted; continue }
    if (ch === ',' && !quoted) { out.push(cur); cur = '' } else cur += ch
  }
  if (cur !== '') out.push(cur)
  return out
}

function filterSql(table, col, rawOp, params, ref = null) {
  const target = `${ref ?? q(table)}.${q(col)}`
  const cast = castFor(colType(table, col))
  const dot = rawOp.indexOf('.')
  const op = dot === -1 ? rawOp : rawOp.slice(0, dot)
  const val = dot === -1 ? '' : rawOp.slice(dot + 1)
  const push = (v) => { params.push(v); return `$${params.length}${cast}` }
  switch (op) {
    case 'eq': return `${target} = ${push(val)}`
    case 'neq': return `${target} is distinct from ${push(val)}`
    case 'gt': return `${target} > ${push(val)}`
    case 'gte': return `${target} >= ${push(val)}`
    case 'lt': return `${target} < ${push(val)}`
    case 'lte': return `${target} <= ${push(val)}`
    case 'like': return `${target} like ${push(val.replaceAll('*', '%'))}`
    case 'ilike': { params.push(val.replaceAll('*', '%')); return `${target}::text ilike $${params.length}` }
    case 'is': return val === 'null' ? `${target} is null` : `${target} is ${val === 'true' ? 'true' : 'false'}`
    case 'in': {
      const list = parseInList(val)
      if (list.length === 0) return 'false'
      const ph = list.map((v) => { params.push(v); return `$${params.length}${cast}` })
      return `${target} in (${ph.join(',')})`
    }
    case 'not': {
      const rest = val
      const inner = filterSql(table, col, rest, params, ref)
      return `not (${inner})`
    }
    default:
      throw Object.assign(new Error(`unsupported filter op: ${op}`), { status: 400 })
  }
}

function orSql(table, expr, params) {
  // or=(a.ilike.*x*,b.eq.1)
  const inner = expr.replace(/^\(/, '').replace(/\)$/, '')
  const parts = []
  let cur = '', depth = 0
  for (const ch of inner) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) { parts.push(cur); cur = '' } else cur += ch
  }
  if (cur) parts.push(cur)
  const clauses = parts.map((p) => {
    const dot = p.indexOf('.')
    const col = p.slice(0, dot)
    return filterSql(table, col, p.slice(dot + 1), params)
  })
  return `(${clauses.join(' or ')})`
}

const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'or', 'and', 'on_conflict', 'columns'])

function whereSql(table, url, params) {
  const clauses = []
  for (const [key, value] of url.searchParams) {
    if (RESERVED.has(key)) {
      if (key === 'or') clauses.push(orSql(table, value, params))
      continue
    }
    clauses.push(filterSql(table, key, value, params))
  }
  return clauses
}

function orderSql(table, url) {
  const raw = url.searchParams.get('order')
  if (!raw) return ''
  const parts = raw.split(',').map((p) => {
    const bits = p.split('.')
    const col = bits[0]
    const dir = bits.includes('desc') ? 'desc' : 'asc'
    const nulls = bits.includes('nullsfirst') ? ' nulls first' : bits.includes('nullslast') ? ' nulls last' : ''
    return `${q(table)}.${q(col)} ${dir}${nulls}`
  })
  return ` order by ${parts.join(', ')}`
}

/* ── GET/HEAD: select ─────────────────────────────────────────────────── */
async function handleSelect(table, url, req) {
  const params = []
  const nodes = parseSelect(url.searchParams.get('select'))
  const outputs = []
  const innerFilters = []
  for (const n of nodes) {
    if (n.kind === 'col') {
      if (n.name === '*') outputs.push(`to_jsonb(${q(table)}) as __row`)
      else outputs.push(`jsonb_build_object('${n.alias ?? n.name}', ${q(table)}.${q(n.name)}) as __c${outputs.length}`)
    } else {
      const e = embedSql(table, n, params)
      outputs.push(`jsonb_build_object('${n.alias ?? n.name}', ${e.sql}) as __c${outputs.length}`)
      if (n.innerJoin) innerFilters.push(e.existsSql)
    }
  }
  const where = whereSql(table, url, params).concat(innerFilters)
  const whereClause = where.length ? ` where ${where.join(' and ')}` : ''
  const limit = url.searchParams.get('limit')
  const offset = url.searchParams.get('offset')
  const wantCount = /count=exact/.test(req.headers.prefer ?? '')
  const head = req.method === 'HEAD'

  let count = null
  if (wantCount) {
    const cr = await pool.query(`select count(*)::int as n from ${q(table)}${whereClause}`, params)
    count = cr.rows[0].n
  }
  if (head) return { rows: [], count }

  const selectExpr = outputs
    .map((o) => o.split(' as ')[0])
    .reduce((a, b) => `${a} || ${b}`)
  let sql = `select ${selectExpr} as row from ${q(table)}${whereClause}${orderSql(table, url)}`
  if (limit) sql += ` limit ${Number(limit)}`
  if (offset) sql += ` offset ${Number(offset)}`
  const r = await pool.query(sql, params)
  return { rows: r.rows.map((x) => x.row), count }
}

/* ── writes ───────────────────────────────────────────────────────────── */
async function handleInsert(table, url, body) {
  const rows = Array.isArray(body) ? body : [body]
  if (rows.length === 0) return { rows: [] }
  const cols = Object.keys(rows[0])
  const params = []
  const tuples = rows.map((r) => `(${cols.map((c) => {
    params.push(toParam(r[c], colType(table, c)))
    return `$${params.length}${castFor(colType(table, c))}`
  }).join(',')})`)
  const returning = url.searchParams.get('select') ? ` returning to_jsonb(${q(table)}) as row` : ` returning to_jsonb(${q(table)}) as row`
  const sql = `insert into ${q(table)} (${cols.map(q).join(',')}) values ${tuples.join(',')}${returning}`
  const r = await pool.query(sql, params)
  return { rows: r.rows.map((x) => x.row) }
}

async function handleUpdate(table, url, body) {
  const params = []
  const sets = Object.keys(body).map((c) => {
    params.push(toParam(body[c], colType(table, c)))
    return `${q(c)} = $${params.length}${castFor(colType(table, c))}`
  })
  const where = whereSql(table, url, params)
  if (where.length === 0) throw Object.assign(new Error('update requires filters'), { status: 400 })
  const sql = `update ${q(table)} set ${sets.join(', ')} where ${where.join(' and ')} returning to_jsonb(${q(table)}) as row`
  const r = await pool.query(sql, params)
  return { rows: r.rows.map((x) => x.row) }
}

async function handleDelete(table, url) {
  const params = []
  const where = whereSql(table, url, params)
  if (where.length === 0) throw Object.assign(new Error('delete requires filters'), { status: 400 })
  const sql = `delete from ${q(table)} where ${where.join(' and ')} returning to_jsonb(${q(table)}) as row`
  const r = await pool.query(sql, params)
  return { rows: r.rows.map((x) => x.row) }
}

function toParam(v, type = null) {
  // JS arrays going into Postgres array columns are serialized natively by
  // node-postgres; JSON-stringifying them ("[\"a\"]") is a malformed literal.
  if (Array.isArray(v) && type === 'ARRAY') return v
  if (v !== null && typeof v === 'object') return JSON.stringify(v)
  return v
}

/* ── rpc ──────────────────────────────────────────────────────────────── */
async function handleRpc(fn, body) {
  const info = meta.fns.get(fn)
  if (!info) throw Object.assign(new Error(`function ${fn} not found`), { status: 404 })
  const args = body && typeof body === 'object' ? body : {}
  const keys = Object.keys(args)
  const params = keys.map((k) => toParam(args[k]))
  const argSql = keys.map((k, i) => `${q(k)} := $${i + 1}${args[k] !== null && typeof args[k] === 'object' ? '::jsonb' : ''}`).join(', ')
  const call = `${q(fn)}(${argSql})`
  if (info.proretset || info.rettype === 'record') {
    const r = await pool.query(`select to_jsonb(__f) as row from ${call} __f`, params)
    return { rows: r.rows.map((x) => x.row) }
  }
  const r = await pool.query(`select ${call} as v`, params)
  return { scalar: r.rows[0]?.v ?? null }
}

/* ── auth (GoTrue-lite): any credentials log in as the first admin ────── */
let mockUser = null
async function loadMockUser() {
  const r = await pool.query(
    `select u.id, u.email from auth.users u join admin_users a on a.email = u.email limit 1`)
  if (r.rows.length === 0) {
    const a = await pool.query(`select email from admin_users limit 1`)
    const email = a.rows[0]?.email ?? 'dev@example.com'
    const ins = await pool.query(
      `insert into auth.users (email) values ($1) on conflict (email) do update set email = excluded.email returning id, email`,
      [email])
    mockUser = ins.rows[0]
  } else {
    mockUser = r.rows[0]
  }
}
function b64url(objOrStr) {
  const s = typeof objOrStr === 'string' ? objOrStr : JSON.stringify(objOrStr)
  return Buffer.from(s).toString('base64url')
}
function makeSession() {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + 60 * 60 * 24 * 30
  const user = {
    id: mockUser.id, aud: 'authenticated', role: 'authenticated', email: mockUser.email,
    email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email' },
    user_metadata: {}, created_at: new Date().toISOString(),
  }
  const jwt = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ sub: mockUser.id, email: mockUser.email, role: 'authenticated', aud: 'authenticated', exp, iat: now, session_id: crypto.randomUUID() })}.${b64url('dev')}`
  return {
    access_token: jwt, token_type: 'bearer', expires_in: exp - now, expires_at: exp,
    refresh_token: crypto.randomUUID(), user,
  }
}

/* ── http server ──────────────────────────────────────────────────────── */
function send(res, status, body, headers = {}) {
  const payload = body === undefined ? '' : JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json', ...headers })
  res.end(payload)
}

async function readBody(req) {
  const chunks = []
  for await (const c of req) chunks.push(c)
  if (chunks.length === 0) return null
  const raw = Buffer.concat(chunks)
  const ct = req.headers['content-type'] ?? ''
  if (ct.includes('application/json')) {
    const text = raw.toString('utf8')
    return text ? JSON.parse(text) : null
  }
  return raw
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
  const path = url.pathname
  try {
    /* auth */
    if (path === '/auth/v1/token') {
      await readBody(req)
      return send(res, 200, makeSession())
    }
    if (path === '/auth/v1/user') {
      if (req.method === 'GET') return send(res, 200, makeSession().user)
      // PUT = updateUser (password change etc.) — accept and echo
      await readBody(req)
      return send(res, 200, makeSession().user)
    }
    if (path === '/auth/v1/logout') { await readBody(req); return send(res, 204) }
    if (path === '/auth/v1/signup') { await readBody(req); return send(res, 200, { ...makeSession(), user: makeSession().user }) }
    if (path.startsWith('/auth/v1/')) { await readBody(req); return send(res, 200, {}) }

    /* storage: accept uploads, return the object key */
    if (path.startsWith('/storage/v1/object/')) {
      await readBody(req)
      const key = path.replace('/storage/v1/object/', '')
      return send(res, 200, { Key: key, Id: crypto.randomUUID() })
    }

    /* postgrest */
    if (path.startsWith('/rest/v1/rpc/')) {
      const fn = decodeURIComponent(path.slice('/rest/v1/rpc/'.length))
      const body = await readBody(req)
      const out = await handleRpc(fn, body)
      if ('scalar' in out) return send(res, 200, out.scalar)
      return send(res, 200, out.rows)
    }
    if (path.startsWith('/rest/v1/')) {
      const table = decodeURIComponent(path.slice('/rest/v1/'.length))
      if (!/^[a-z_][a-z0-9_]*$/.test(table)) return send(res, 404, { message: 'not found' })
      const accept = req.headers.accept ?? ''
      const wantObject = accept.includes('vnd.pgrst.object')
      const finish = (out, status = 200) => {
        const headers = {}
        if (out.count !== null && out.count !== undefined) {
          headers['content-range'] = `0-${Math.max(out.rows.length - 1, 0)}/${out.count}`
        }
        if (req.method === 'HEAD') { res.writeHead(status, headers); return res.end() }
        if (wantObject) {
          if (out.rows.length === 0) {
            return send(res, 406, { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116', details: '0 rows' }, headers)
          }
          if (out.rows.length > 1) {
            return send(res, 406, { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116', details: `${out.rows.length} rows` }, headers)
          }
          return send(res, status, out.rows[0], headers)
        }
        return send(res, status, out.rows, headers)
      }
      if (req.method === 'GET' || req.method === 'HEAD') {
        return finish(await handleSelect(table, url, req))
      }
      if (req.method === 'POST') {
        const body = await readBody(req)
        return finish(await handleInsert(table, url, body), 201)
      }
      if (req.method === 'PATCH') {
        const body = await readBody(req)
        return finish(await handleUpdate(table, url, body))
      }
      if (req.method === 'DELETE') {
        return finish(await handleDelete(table, url))
      }
    }
    send(res, 404, { message: `no route for ${req.method} ${path}` })
  } catch (err) {
    const status = err.status ?? 500
    if (status === 500) console.error(`[dev-backend] ${req.method} ${req.url}\n  ${err.message}`)
    send(res, status, { message: err.message, code: err.code ?? 'DEV500', details: null, hint: null })
  }
})

await loadMeta()
await loadMockUser()
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[dev-backend] Supabase emulator on http://127.0.0.1:${PORT}`)
  console.log(`[dev-backend] signing in any credentials as ${mockUser.email}`)
})
