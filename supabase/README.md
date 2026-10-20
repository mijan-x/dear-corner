# Dear Corner — database

Supabase project **Dear-Corner-SG** (ref `elyntthbaoczxgjeadft`, Singapore).
Everything is in SQL migrations in `supabase/migrations/`, applied in file-name order.

## What's where

| Migration                      | Contents                                                                                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `…120000_foundation`           | Enums, `private` schema, roles + `is_admin()` (admin role **and** two-step login), profiles, store settings, rate limits, admin activity log |
| `…120100_geo_and_shipping`     | 8 divisions / 64 districts / 612 areas (incl. 51 Dhaka city thanas), delivery zones (Inside Dhaka ৳80 2–3 days, Outside Dhaka ৳130 3–5 days) |
| `…120200_catalog`              | Categories, collections, products, options, variants (one per SKU), images, stock log, product summary triggers                              |
| `…120300_customers`            | Addresses, signed-in cart, wishlist, newsletter, contact messages                                                                            |
| `…120400_orders`               | Orders (DC-10001…), order lines with snapshots, status history, admin notes, coupons                                                         |
| `…120500_reviews`              | Reviews (buyers of delivered orders only, moderated), review reports                                                                         |
| `…120600_storefront_functions` | Catalog, search, product page, home feed, cart pricing, `place_order`, `track_order`, reviews                                                |
| `…120700_admin_functions`      | Order status workflow, courier, CSV export, dashboard, customers, product save, stock, sample removal                                        |
| `…120800_storage`              | `product-images` and `site-media` buckets (public read, admin-only write)                                                                    |
| `…120900_grants`               | Explicit function permissions (Supabase's "anyone can call any function" default removed)                                                    |

## Rules the database enforces

- **Prices are whole taka** (`integer`). The browser never sends prices: `place_order` recalculates
  line prices, coupon discount, delivery fee and total with `private.price_cart`, the same function
  the cart and checkout previews use (`quote_cart`). If the total the shopper saw differs, the order
  is refused with `DC_PRICE_CHANGED` and a fresh quote.
- **Stock is per SKU** and taken inside `place_order` with row locks in a fixed order
  (products, then variants, then the coupon), so the last item can never be sold twice and
  orders can't deadlock. Cancelled/returned orders put stock back exactly once. Every change is in
  `inventory_movements` with its reason.
- **No public read on orders.** Guests look up an order only with `track_order(order_number, phone)`,
  which never returns the street address. Signed-in customers read their own orders.
- **Admin** = `user_roles.role = 'admin'` **and** a session that passed two-step login (`aal2`).
  Admin policies and functions use `public.is_admin()`.
- **Reviews** start as `pending`; only approved ones are public. Never add invented reviews.
- **Products with orders are never broken by deletes**: archive them (`status = 'archived'`);
  order lines keep name, variant, SKU, price and image.
- **Abuse limits** (Cash on Delivery): 3 open orders per phone, 10 orders per 10 min per connection,
  20 order lookups per 10 min, 5 contact messages per hour, 30 failed coupon codes per hour.
  Change the first one in `store_settings`.

Errors raised for shoppers carry a friendly message and a code in `DETAIL` (`DC_…`).

## Make an account an admin

1. Create the account: Supabase dashboard → Authentication → Users → **Add user** → email
   `dearcorner.bd@gmail.com`, a strong password, tick **Auto Confirm User**. (Or sign up on the site
   once the sign-up page exists.)
2. Run in the SQL editor:

   ```sql
   update public.user_roles set role = 'admin'
   where user_id = (select id from auth.users where email = 'dearcorner.bd@gmail.com');
   ```

3. Sign in to the site's admin and set up the authenticator app (two-step login) when asked.
   Until then the account has no admin access.

If the authenticator phone is lost: dashboard → Authentication → Users → the user → remove the
MFA factor, then set it up again.

## Sample data

`supabase/seeds/sample_products.sql` adds 12 products named `[SAMPLE] …` (SKUs `SAMPLE-…`,
`is_sample = true`) plus 6 sample sub-categories. Remove them with the admin's
**Delete sample data** button or `supabase/seeds/delete_sample_products.sql`. Sample products that
appear in orders are archived instead of deleted.

## Tests

`supabase/tests/run_local.sh --seed --test` builds a throwaway local PostgreSQL with a Supabase
stand-in (`supabase/local/00_supabase_shim.sql`), applies every migration and the seed, then runs:

- `10_access.sql` — what visitors, customers, admins without and with two-step login can read and do
- `20_orders.sql` — pricing, coupons, delivery fees, placing and tracking orders, the status
  workflow, stock, reviews, contact form, addresses, admin tools
- `30_concurrency.sh` — two shoppers buying the last item at the same moment, and ten shoppers
  for three items, on real separate connections

CI runs the same on every push (`.github/workflows/ci.yml`, "Database tests").

## Adding a migration later

New file `supabase/migrations/<timestamp>_<name>.sql`. Supabase normally lets visitors call every new
function; after `…120900_grants` that default is off, so grant each new function explicitly:

```sql
grant execute on function public.my_function(text) to anon, authenticated;
```

Keep migrations additive (the Supabase connector refuses some destructive statements).

## Ready for later (not in this build)

- **Online payment**: add values to `payment_method` (`alter type … add value 'bkash'`) and a
  `payments` table; `orders.payment_status` already exists.
- **SMS / email notifications**: a Database Webhook on `order_status_history` inserts.
- **Courier API**: `orders.courier_name`, `tracking_url`, `tracking_code` already exist.
