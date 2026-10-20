#!/usr/bin/env bash
# Concurrency: the last item can never be sold twice.
# Uses real separate connections. Needs PGHOST/PGPORT/PGUSER/PGDATABASE.
set -euo pipefail
PSQL=(psql -X -q -At -v ON_ERROR_STOP=1)
OUT="$(mktemp -d)"
fail() { echo "FAIL: $*"; exit 1; }

"${PSQL[@]}" <<'SQL'
delete from private.rate_limit_hits;
insert into public.products (category_id, name, slug, status)
values ((select id from public.categories where slug = 'gifts'), 'Race lamp', 'race-lamp', 'active'),
       ((select id from public.categories where slug = 'gifts'), 'Race candle', 'race-candle', 'active');
insert into public.product_variants (product_id, sku, price, stock)
values ((select id from public.products where slug = 'race-lamp'), 'RACE-LAST', 990, 1),
       ((select id from public.products where slug = 'race-candle'), 'RACE-THREE', 500, 3);
SQL

ITEMS_LAST="[{\"variant_id\": \"$("${PSQL[@]}" -c "select id from public.product_variants where sku = 'RACE-LAST'")\", \"quantity\": 1}]"
customer() { echo "{\"name\":\"Buyer $1\",\"phone\":\"$1\",\"division\":\"Dhaka\",\"district\":\"Dhaka\",\"area\":\"Banani\",\"address_line\":\"Road $1\"}"; }

# 1) Two shoppers, last item. A holds its transaction open for 2 s after placing;
#    B starts 0.5 s later and has to wait for A's row lock, then sees stock 0.
( "${PSQL[@]}" > "$OUT/a.txt" 2>&1 <<SQL
begin;
set role anon;
select set_config('request.headers', '{"x-forwarded-for": "198.51.100.1"}', true);
select public.place_order('$ITEMS_LAST'::jsonb, '$(customer 01711111111)'::jsonb) ->> 'order_number';
select pg_sleep(2);
commit;
SQL
) &
PID_A=$!
sleep 0.5
START=$(date +%s.%N)
( "${PSQL[@]}" > "$OUT/b.txt" 2>&1 <<SQL || true
set role anon;
select set_config('request.headers', '{"x-forwarded-for": "198.51.100.2"}', false);
select public.place_order('$ITEMS_LAST'::jsonb, '$(customer 01722222222)'::jsonb) ->> 'order_number';
SQL
)
END=$(date +%s.%N)
wait $PID_A

grep -q '^DC-' "$OUT/a.txt" || fail "shopper A should get the item: $(cat "$OUT/a.txt")"
grep -q 'sold out or changed' "$OUT/b.txt" || fail "shopper B should be told it sold out: $(cat "$OUT/b.txt")"
WAITED=$(echo "$END - $START" | bc)
(( $(echo "$WAITED > 1.0" | bc) )) || fail "shopper B should have waited for A's lock (waited ${WAITED}s)"
echo "ok   last item: A got $(grep '^DC-' "$OUT/a.txt"), B waited ${WAITED}s for the lock and was told it sold out"

STOCK=$("${PSQL[@]}" -c "select stock from public.product_variants where sku = 'RACE-LAST'")
[ "$STOCK" = "0" ] || fail "stock should be 0, is $STOCK"
SOLD=$("${PSQL[@]}" -c "select count(*) from public.order_items where sku = 'RACE-LAST'")
[ "$SOLD" = "1" ] || fail "exactly one order line expected, found $SOLD"
echo "ok   stock is 0 and exactly one order holds the last item"

# 2) Ten shoppers at once, three in stock: exactly three orders succeed.
ITEMS_THREE="[{\"variant_id\": \"$("${PSQL[@]}" -c "select id from public.product_variants where sku = 'RACE-THREE'")\", \"quantity\": 1}]"
for i in $(seq 0 9); do
  ( "${PSQL[@]}" > "$OUT/r$i.txt" 2>&1 <<SQL || true
set role anon;
select set_config('request.headers', '{"x-forwarded-for": "192.0.2.$i"}', false);
select public.place_order('$ITEMS_THREE'::jsonb, '$(customer 0193333333$i)'::jsonb) ->> 'order_number';
SQL
  ) &
done
wait
OK_COUNT=$(cat "$OUT"/r*.txt | grep -c '^DC-' || true)
[ "$OK_COUNT" = "3" ] || fail "expected exactly 3 successful orders, got $OK_COUNT"
STOCK=$("${PSQL[@]}" -c "select stock from public.product_variants where sku = 'RACE-THREE'")
[ "$STOCK" = "0" ] || fail "stock should be 0, is $STOCK"
DEADLOCKS=$(cat "$OUT"/r*.txt | grep -ci deadlock || true)
[ "$DEADLOCKS" = "0" ] || fail "deadlock detected"
echo "ok   10 simultaneous shoppers, 3 in stock: exactly 3 orders, stock 0, no deadlocks"
rm -rf "$OUT"
