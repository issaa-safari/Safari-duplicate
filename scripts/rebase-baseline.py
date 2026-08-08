"""Rebuild migrations/baseline/002_schema.sql from a fresh pg_dump.

Keeps the hand-written header, and re-applies the two patches recorded in
docs/current/schema-drift.md: a bare CREATE SCHEMA collides with the schema
Supabase already provides, and pg_dump's \\restrict guards are rejected by
older psql builds.
"""
import sys

dump_path = sys.argv[1]
baseline_path = 'migrations/baseline/002_schema.sql'
expected = sys.argv[2:]

old = open(baseline_path).read()
new = open(dump_path).read()

MARKER = 'SET statement_timeout'
header = old[:old.index(MARKER)]
body = new[new.index(MARKER):]

body = body.replace(
    "CREATE SCHEMA public;\n\n\n--\n-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -\n--\n\n"
    "COMMENT ON SCHEMA public IS 'standard public schema';\n",
    "CREATE SCHEMA IF NOT EXISTS public;\n")

guard = chr(92)  # backslash, kept out of the literal below for clarity
body = '\n'.join(
    line for line in body.split('\n')
    if not (line.startswith(guard + 'restrict ') or line.startswith(guard + 'unrestrict '))
)

assert 'CREATE SCHEMA IF NOT EXISTS public;' in body, 'schema patch did not apply'
assert 'COMMENT ON SCHEMA public' not in body, 'schema comment survived'
assert guard + 'restrict' not in body, 'psql guard survived'
for table in expected:
    assert f'CREATE TABLE public.{table}' in body, f'missing {table}'

open(baseline_path, 'w').write(header + body)
print(f'baseline rebuilt; verified {len(expected)} table(s):', ', '.join(expected))
