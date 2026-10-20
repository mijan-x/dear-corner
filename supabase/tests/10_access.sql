-- Who can see and do what (Row Level Security + function grants).
\set QUIET on

-- ---------------- visitors (anon) ----------------
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);

select t.ok((select count(*) from public.products) = 12, 'anon sees the 12 active sample products');
select t.ok((select count(*) from public.product_variants) > 0, 'anon sees active variants');
select t.ok((select count(*) from public.shipping_zones) = 2, 'anon sees delivery zones');
select t.ok((select count(*) from public.store_settings) = 1, 'anon sees store settings');
select t.ok((select count(*) from public.orders) = 0, 'anon cannot read orders (no public SELECT)');
select t.ok((select count(*) from public.order_items) = 0, 'anon cannot read order items');
select t.ok((select count(*) from public.coupons) = 0, 'anon cannot read coupons');
select t.ok((select count(*) from public.profiles) = 0, 'anon cannot read profiles');
select t.ok((select count(*) from public.contact_messages) = 0, 'anon cannot read contact messages');
select t.ok((select count(*) from public.inventory_movements) = 0, 'anon cannot read stock movements');
select t.ok((select count(*) from public.admin_activity) = 0, 'anon cannot read the activity log');
select t.fails($$select count(*) from private.rate_limit_hits$$, 'any', 'anon cannot read private tables');
select t.fails($$insert into public.categories (name, slug) values ('Hack', 'hack')$$, 'any', 'anon cannot insert categories');
-- An RLS-blocked UPDATE silently changes 0 rows; checked as postgres below.
update public.product_variants set price = 1;
reset role;
select t.ok((select min(price) from public.product_variants) > 1, 'anon UPDATE changed no prices');
set role anon;
select t.fails($$select public.admin_dashboard()$$, 'any', 'anon cannot call admin functions');
select t.fails($$select public.cart_count()$$, 'any', 'anon cannot call signed-in cart functions');
select t.fails($$select private.price_cart('[]'::jsonb)$$, 'any', 'anon cannot call internal pricing directly');
select t.ok(jsonb_array_length(public.home_feed() -> 'categories') = 6, 'home feed has 6 category cards (5 + New arrivals)');
select t.ok((public.home_feed() ->> 'has_reviews')::boolean = false, 'home feed: no reviews block yet');

-- ---------------- signed-in customer ----------------
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1"}', false);
select t.ok((select count(*) from public.profiles) = 1, 'customer sees only their own profile');
select t.ok((select full_name from public.profiles) = 'Rima Akter', 'profile created from sign-up name');
select t.ok(public.cart_count() = 0, 'empty cart count is 0');
select t.ok(public.cart_add((select id from public.product_variants where sku = 'SAMPLE-PENPOT'), 2) = 2, 'cart_add adds 2');
select t.ok(public.cart_add((select id from public.product_variants where sku = 'SAMPLE-PENPOT'), 20) = 10, 'cart caps a line at 10');
select t.ok(public.cart_set_quantity((select id from public.product_variants where sku = 'SAMPLE-PENPOT'), 0) = 0, 'quantity 0 removes the line');
select t.fails($$select public.admin_dashboard()$$, 'DC_ADMIN_REQUIRED', 'customer cannot use admin functions');
update public.profiles set email = 'other@example.com';
select t.ok((select email from public.profiles) = 'rima@example.com', 'customer cannot change the email copy');
update public.user_roles set role = 'admin';
reset role;
select t.ok((select role::text from public.user_roles where user_id = '11111111-1111-1111-1111-111111111111') = 'customer',
  'role UPDATE by a customer changed nothing');

-- ---------------- admin without two-step login ----------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated","aal":"aal1"}', false);
select t.ok(public.is_admin() = false, 'admin role without TOTP (aal1) is not admin');
select t.ok((public.my_access() ->> 'is_admin_role')::boolean, 'my_access reports the admin role');
select t.fails($$select public.admin_dashboard()$$, 'DC_ADMIN_REQUIRED', 'aal1 admin cannot open the dashboard');
select t.ok((select count(*) from public.coupons) = 0, 'aal1 admin cannot read coupons');

-- ---------------- admin with two-step login ----------------
select set_config('request.jwt.claims', '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated","aal":"aal2"}', false);
select t.ok(public.is_admin(), 'admin with aal2 is admin');
select t.ok((public.admin_dashboard() ->> 'pending_orders')::integer = 0, 'admin dashboard works');
insert into public.coupons (code, type, value) values ('test10', 'percent', 10);
select t.ok((select code from public.coupons where code = 'TEST10') = 'TEST10', 'admin creates coupons (code upper-cased)');
select t.ok((select count(*) from public.admin_activity where entity = 'coupons') = 1, 'admin change is in the activity log');
delete from public.coupons where code = 'TEST10';
reset role;
select set_config('request.jwt.claims', '', false);
