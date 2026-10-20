#!/usr/bin/env bash
# Runs every migration (and optionally seeds and tests) against a throwaway
# local PostgreSQL with a Supabase stand-in. Used during development only.
#
# Usage: supabase/tests/run_local.sh [--seed] [--test]
#   PGBIN   PostgreSQL bin dir (default /usr/lib/postgresql/16/bin)
#   PGDATA_DIR  scratch data dir (default /tmp/dc-pg)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
DATA="${PGDATA_DIR:-/tmp/dc-pg}"
PORT="${PGPORT:-54329}"
RUN_AS="${RUN_AS:-}"
run() { if [ -n "$RUN_AS" ]; then runuser -u "$RUN_AS" -- "$@"; else "$@"; fi; }

if [ -f "$DATA/postmaster.pid" ]; then run "$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; fi
rm -rf "$DATA"; mkdir -p "$DATA"; [ -n "$RUN_AS" ] && chown "$RUN_AS" "$DATA"
run "$PGBIN/initdb" -D "$DATA" -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null
run "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp -c max_connections=50" -l "$DATA/server.log" -w start >/dev/null

PSQL=(psql -X -q -v ON_ERROR_STOP=1 -h /tmp -p "$PORT" -U postgres -d postgres)
"${PSQL[@]}" -f "$ROOT/supabase/local/00_supabase_shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "migrate  $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
if [[ " $* " == *" --seed "* ]]; then
  for f in "$ROOT"/supabase/seeds/*.sql; do
    case "$(basename "$f")" in delete_*) continue;; esac
    echo "seed     $(basename "$f")"
    "${PSQL[@]}" -f "$f"
  done
fi
if [[ " $* " == *" --test "* ]]; then
  for f in "$ROOT"/supabase/tests/*.sql; do
    echo "test     $(basename "$f")"
    "${PSQL[@]}" -f "$f"
  done
  for f in "$ROOT"/supabase/tests/*.sh; do
    [ "$(basename "$f")" = "run_local.sh" ] && continue
    echo "test     $(basename "$f")"
    PGHOST=/tmp PGPORT="$PORT" PGUSER=postgres PGDATABASE=postgres bash "$f"
  done
fi
echo "ok: local database on port $PORT (data in $DATA)"
