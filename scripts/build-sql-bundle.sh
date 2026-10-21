#!/usr/bin/env bash
# Builds the files in supabase/manual/ for pasting into the Supabase SQL
# editor, each in one transaction:
#   finish-phase-b.sql      the migrations listed in PARTS
#   phase-d-demo-photos.sql supabase/seeds/sample_products_images.sql
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

OUT_D="$ROOT/supabase/manual/phase-d-demo-photos.sql"

build_d() {
  cat <<'SQL'
-- Dear Corner — Phase D demo photos (Dear-Corner-SG only)
--
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It links the demo photos that ship with the website (/samples/…) to the
-- [SAMPLE] products, the five categories, the New arrivals and Gifts under
-- ৳999 collections, and the homepage hero and banners. All or nothing, and
-- safe to run again. It never overwrites a photo you uploaded yourself.
-- Same content as supabase/seeds/sample_products_images.sql.

begin;

do $$
begin
  if to_regprocedure('public.home_feed()') is null
     or not exists (select 1 from public.products where slug = 'sample-pleated-table-lamp') then
    raise exception 'This is not the Dear Corner database, or the sample products are missing. Nothing was changed.';
  end if;
end;
$$;

SQL
  cat "$ROOT/supabase/seeds/sample_products_images.sql"
  printf '\ncommit;\n'
}

if [ "${1:-}" = "--check" ]; then
  diff -q <(build) "$OUT" >/dev/null || { echo "supabase/manual/finish-phase-b.sql is out of date: run scripts/build-sql-bundle.sh"; exit 1; }
  diff -q <(build_d) "$OUT_D" >/dev/null || { echo "supabase/manual/phase-d-demo-photos.sql is out of date: run scripts/build-sql-bundle.sh"; exit 1; }
  echo "bundles up to date"
else
  mkdir -p "$(dirname "$OUT")"
  build > "$OUT"
  build_d > "$OUT_D"
  echo "wrote $OUT and $OUT_D"
fi
