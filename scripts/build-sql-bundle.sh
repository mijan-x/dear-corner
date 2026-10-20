#!/usr/bin/env bash
# Builds supabase/manual/finish-phase-b.sql: the migrations below in one
# transaction, for pasting into the Supabase SQL editor.
# Usage: scripts/build-sql-bundle.sh            (writes the file)
#        scripts/build-sql-bundle.sh --check    (fails if the file is out of date)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
M="$ROOT/supabase/migrations"
OUT="$ROOT/supabase/manual/finish-phase-b.sql"
PARTS=(20261020120700_admin_functions 20261020120900_grants 20261020121100_policy_tuning)

build() {
  cat <<'SQL'
-- Dear Corner — finish the Phase B database setup (Dear-Corner-SG only)
--
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It is exactly these three migration files, in order, inside one transaction
-- (all or nothing), and it records them in the migration history:
--   20261020120700_admin_functions.sql
--   20261020120900_grants.sql
--   20261020121100_policy_tuning.sql
-- Safe to run twice. It deletes no data: the "delete" lines inside the admin
-- functions only run later, when an admin presses a button in the admin pages.

begin;

do $$
begin
  if to_regclass('public.store_settings') is null or to_regprocedure('public.place_order(jsonb, jsonb, text, integer)') is null then
    raise exception 'This is not the Dear Corner database (or the earlier parts are missing). Nothing was changed.';
  end if;
end;
$$;

SQL
  for f in "${PARTS[@]}"; do
    printf -- '-- ===========================================================================\n-- %s.sql\n-- ===========================================================================\n\n' "$f"
    cat "$M/$f.sql"
    printf '\n\n'
  done
  cat <<'SQL'
-- ===========================================================================
-- Migration history
-- ===========================================================================
insert into supabase_migrations.schema_migrations (version, name)
values
  ('20261020120700', 'admin_functions'),
  ('20261020120900', 'grants'),
  ('20261020121100', 'policy_tuning')
on conflict (version) do nothing;

commit;
SQL
}

if [ "${1:-}" = "--check" ]; then
  diff -q <(build) "$OUT" >/dev/null || { echo "supabase/manual/finish-phase-b.sql is out of date: run scripts/build-sql-bundle.sh"; exit 1; }
  echo "bundle up to date"
else
  mkdir -p "$(dirname "$OUT")"
  build > "$OUT"
  echo "wrote $OUT"
fi
