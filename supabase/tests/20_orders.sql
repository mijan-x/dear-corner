-- Cart pricing, coupons, delivery, placing orders, tracking, status workflow,
-- stock, reviews and admin tools.
\set QUIET on

-- Coupons (created as the database owner)
insert into public.coupons (code, type, value, min_subtotal, per_customer_limit, usage_limit, starts_at, expires_at) values
  ('WELCOME10', 'percent', 10, 0, 1, null, null, null),
  ('FLAT100', 'fixed', 100, 800, null, null, null, null),
  ('ONCE50', 'fixed', 50, 0, null, 1, null, null),
  ('OLD20', 'percent', 20, 0, null, null, now() - interval '10 days', now() - interval '1 day');
insert into public.coupons (code, type, value, max_discount) values ('LAMPS15', 'percent', 15, 1000);
insert into public.coupon_categories (coupon_id, category_id)
select c.id, cat.id from public.coupons c, public.categories cat where c.code = 'LAMPS15' and cat.slug = 'lighting';

create or replace function t.v(p_sku text) returns uuid language sql stable as
$$ select id from public.product_variants where sku = p_sku $$;
create or replace function t.items(variadic p text[]) returns jsonb language sql stable as $$
  -- t.items('SKU', '2', 'SKU2', '1') -> [{"variant_id":..., "quantity": 2}, ...]
  select jsonb_agg(jsonb_build_object('variant_id', t.v(p[i]), 'quantity', p[i + 1]::integer))
  from generate_series(1, array_length(p, 1), 2) i
$$;
create or replace function t.customer(p_phone text, p_district text default 'Dhaka', p_area text default 'Dhanmondi')
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'name', 'Rima Akter', 'phone', p_phone,
    'division', (select division from public.geo_areas where district = p_district limit 1),
    'district', p_district, 'area', p_area, 'address_line', 'House 12, Road 5', 'delivery_note', 'Call before coming'
  )
$$;
grant execute on all functions in schema t to anon, authenticated;
create or replace function t.order_row(p_number text) returns public.orders language sql security definer as
$$ select * from public.orders where order_number = p_number $$;
grant execute on function t.order_row(text) to anon, authenticated;
create or replace function t.clear_limits() returns void language sql security definer as
$$ delete from private.rate_limit_hits $$;
grant execute on function t.clear_limits() to anon, authenticated;

-- ---------------------------------------------------------------- quotes
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);

select t.ok((public.quote_cart(t.items('SAMPLE-PENPOT', '1')) -> 'delivery' ->> 'known')::boolean = false,
  'quote without an address: delivery not known yet');
select t.ok((public.quote_cart(t.items('SAMPLE-PENPOT', '1'), null, 'Dhaka', 'Dhanmondi') ->> 'total')::integer = 560,
  'inside Dhaka: ৳480 + ৳80 = ৳560');
select t.ok((public.quote_cart(t.items('SAMPLE-PENPOT', '1'), null, 'Sylhet', 'Sylhet Sadar') ->> 'total')::integer = 610,
  'outside Dhaka: ৳480 + ৳130 = ৳610');
select t.ok((public.quote_cart(t.items('SAMPLE-PENPOT', '1'), null, 'Dhaka', 'Savar') -> 'delivery' ->> 'fee')::integer = 130,
  'Savar is outside Dhaka');
select t.ok((public.quote_cart(t.items('SAMPLE-TOTE-NATURA', '1', 'SAMPLE-NOTEBOOK-SAGE', '1'), null, 'Sylhet', 'Sylhet Sadar') -> 'delivery' ->> 'fee')::integer = 0,
  'exactly ৳1,000 gets free delivery');
select t.ok((public.quote_cart(t.items('SAMPLE-TOTE-NATURA', '1', 'SAMPLE-CLIP', '1'), null, 'Dhaka', 'Dhanmondi') -> 'delivery' ->> 'amount_to_free')::integer = 60,
  'progress line: ৳60 more for free delivery');
select t.ok((public.quote_cart(t.items('SAMPLE-TOTE-NATURA', '1', 'SAMPLE-NOTEBOOK-SAGE', '1'), 'WELCOME10', 'Dhaka', 'Dhanmondi') -> 'delivery' ->> 'fee')::integer = 80,
  'free delivery is checked after the coupon (৳1,000 - ৳100 = ৳900)');
select t.ok(public.quote_cart(t.items('SAMPLE-PENPOT', '1'), 'nope') -> 'coupon' ->> 'message' = 'That code isn''t valid or has expired.',
  'unknown code: doc error message');
select t.ok(public.quote_cart(t.items('SAMPLE-PENPOT', '1'), 'OLD20') -> 'coupon' ->> 'status' = 'invalid', 'expired code is invalid');
select t.ok(public.quote_cart(t.items('SAMPLE-PENPOT', '1'), 'FLAT100') -> 'coupon' ->> 'message' = 'Add ৳320 more to use this code.',
  'minimum not met: tells how much more');
select t.ok(public.quote_cart(t.items('SAMPLE-PENPOT', '1'), 'LAMPS15') -> 'coupon' ->> 'status' = 'not_eligible',
  'category-limited code does not apply to a pen holder');
select t.ok((public.quote_cart(t.items('SAMPLE-LAMP-IVORY', '1', 'SAMPLE-PENPOT', '1'), 'LAMPS15', 'Dhaka', 'Dhanmondi') ->> 'discount')::integer = 284,
  'category code: 15% of the lamp only (৳1,890 -> ৳284)');
select t.ok((public.quote_cart(t.items('SAMPLE-PENPOT', '2', 'SAMPLE-PENPOT', '1'), null) -> 'lines' -> 0 ->> 'quantity')::integer = 3,
  'duplicate lines are merged');
select t.ok(public.quote_cart(t.items('SAMPLE-VASE-SAGE', '1')) -> 'lines' -> 0 ->> 'status' = 'sold_out', 'sold-out variant flagged');
select t.ok(public.quote_cart(t.items('SAMPLE-VASE-CLAY', '5')) -> 'lines' -> 0 ->> 'status' = 'limited', 'more than in stock flagged');
select t.ok((public.quote_cart(t.items('SAMPLE-VASE-CLAY', '5')) -> 'lines' -> 0 ->> 'quantity')::integer = 3, 'limited line counts what is in stock');
select t.fails($$select public.quote_cart('[{"variant_id":"not-a-uuid","quantity":1}]'::jsonb)$$, 'DC_INVALID_CART', 'garbage item rejected');

-- ---------------------------------------------------------------- placing orders
select t.fails($$select public.place_order(t.items('SAMPLE-PENPOT', '1'), t.customer('0171234'))$$, 'DC_INVALID_PHONE', 'bad phone rejected');
select t.fails($$select public.place_order(t.items('SAMPLE-PENPOT', '1'), t.customer('01712345678', 'Dhaka', 'Narnia'))$$, 'DC_INVALID_AREA', 'unknown area rejected');
select t.fails($$select public.place_order('[]'::jsonb, t.customer('01712345678'))$$, 'DC_EMPTY_CART', 'empty cart rejected');
select t.fails($$select public.place_order(t.items('SAMPLE-PENPOT', '11'), t.customer('01712345678'))$$, 'DC_QUANTITY_LIMIT', 'more than 10 of one item rejected');
select t.fails($$select public.place_order(t.items('SAMPLE-VASE-SAGE', '1'), t.customer('01712345678'))$$, 'DC_ITEMS_UNAVAILABLE', 'sold-out item cannot be ordered');
select t.fails($$select public.place_order(t.items('SAMPLE-VASE-CLAY', '4'), t.customer('01712345678'))$$, 'DC_ITEMS_UNAVAILABLE', 'cannot order more than stock');
select t.fails($$select public.place_order(t.items('SAMPLE-PENPOT', '1'), t.customer('01712345678'), null, 999)$$, 'DC_PRICE_CHANGED', 'shown total must match the server total');
select t.fails($$select public.place_order(t.items('SAMPLE-PENPOT', '1'), t.customer('01712345678'), 'OLD20')$$, 'DC_COUPON_INVALID', 'expired coupon blocks the order');

select public.place_order(t.items('SAMPLE-PENPOT', '1'), t.customer('+880 1712-345678'), null, 560) ->> 'order_number' as order_a \gset
select t.ok(:'order_a' = 'DC-10001', 'first order number is DC-10001');
select t.ok((select stock from public.product_variants where sku = 'SAMPLE-PENPOT') = 14, 'stock taken: pen holder 15 -> 14');

select t.ok((public.track_order(:'order_a', '01712345678') ->> 'status') = 'placed', 'track order by number + phone');
select t.ok(public.track_order('10001', '+8801712345678') is not null, 'track accepts 10001 and +880 phone');
select t.ok(public.track_order(:'order_a', '01799999999') is null, 'wrong phone finds nothing');
select t.ok(public.track_order(:'order_a', '01712345678') -> 'customer' ->> 'address_line' is null, 'track order never returns the street address');
select t.ok(public.track_order(:'order_a', '01712345678') -> 'customer' ->> 'phone' = '017••••5678', 'track order masks the phone');

-- Coupon once per customer (by phone)
select public.place_order(t.items('SAMPLE-CLIP', '1'), t.customer('01811111111'), 'WELCOME10') ->> 'order_number' as order_b \gset
select t.ok((t.order_row(:'order_b')).discount = 29, 'WELCOME10: 10% of ৳290 = ৳29');
select t.fails($$select public.place_order(t.items('SAMPLE-CLIP', '1'), t.customer('01811111111'), 'WELCOME10')$$, 'DC_COUPON_INVALID', 'same phone cannot reuse a once-per-customer code');

-- Usage limit 1
select public.place_order(t.items('SAMPLE-CLIP', '1'), t.customer('01822222222'), 'ONCE50') ->> 'order_number' as order_c \gset
select t.fails($$select public.place_order(t.items('SAMPLE-CLIP', '1'), t.customer('01833333333'), 'ONCE50')$$, 'DC_COUPON_INVALID', 'usage limit reached');

-- Open orders per phone (3)
select t.clear_limits();
select public.place_order(t.items('SAMPLE-CLIP', '1'), t.customer('01844444444'));
select public.place_order(t.items('SAMPLE-CLIP', '1'), t.customer('01844444444'));
select public.place_order(t.items('SAMPLE-CLIP', '1'), t.customer('01844444444'));
select t.fails($$select public.place_order(t.items('SAMPLE-CLIP', '1'), t.customer('01844444444'))$$, 'DC_TOO_MANY_OPEN_ORDERS', 'fourth open order from one phone refused');

-- Rate limit per connection (10 orders / 10 min)
select t.clear_limits();
select set_config('request.headers', '{"x-forwarded-for": "203.0.113.7"}', false);
select count(public.place_order(t.items('SAMPLE-CLIP', '1'), t.customer('0185555555' || g::text))) from generate_series(0, 9) g;
select t.fails($$select public.place_order(t.items('SAMPLE-CLIP', '1'), t.customer('01866666666'))$$, 'DC_RATE_LIMITED', '11th order in 10 minutes from one connection refused');
select set_config('request.headers', '', false);
select t.clear_limits();

-- ---------------------------------------------------------------- signed-in customer
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1"}', false);
select public.cart_add(t.v('SAMPLE-TRAY'), 2);
select public.cart_add(t.v('SAMPLE-NOTEBOOK-ROSEWO'), 1);
select t.ok((public.quote_my_cart(null, 'Dhaka', 'Gulshan') ->> 'subtotal')::integer = 2330, 'signed-in cart quote: ৳1,980 + ৳350 = ৳2,330');
select t.ok((public.quote_my_cart(null, 'Dhaka', 'Gulshan') -> 'delivery' ->> 'fee')::integer = 0, 'over ৳1,000: free delivery');
select public.place_order(t.items('SAMPLE-TRAY', '2'), t.customer('01912345678', 'Dhaka', 'Gulshan'), null, 1980) ->> 'order_number' as order_d \gset
select t.ok(public.cart_count() = 1, 'ordered line removed from the saved cart, the other stays');
select t.ok((select count(*) from public.orders) = 1, 'customer sees only their own order');
select t.ok(public.my_order(:'order_d') -> 'customer' ->> 'address_line' = 'House 12, Road 5', 'my_order includes the full address');
select t.ok((select count(*) from public.order_items) = 1, 'customer sees their order lines');
select t.ok((select stock from public.product_variants where sku = 'SAMPLE-TRAY') = 1, 'tray stock 3 -> 1');
select t.ok((select phone from public.profiles) = '01912345678', 'empty profile phone filled from the order');

select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal1"}', false);
select t.ok((select count(*) from public.orders) = 0, 'another customer cannot see it');
select t.ok(public.my_order(:'order_d') is null, 'my_order refuses someone else''s order');

-- ---------------------------------------------------------------- admin workflow
select set_config('request.jwt.claims', '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated","aal":"aal2"}', false);
select t.ok((select count(*) from public.orders) = 17, 'admin sees every order (17)');
select t.fails(format($$select public.admin_update_order_status((select id from public.orders where order_number = %L), 'packed')$$, :'order_a'),
  'DC_INVALID_TRANSITION', 'placed cannot jump to packed');
select public.admin_update_order_status((select id from public.orders where order_number = :'order_a'), 'confirmed', 'Called, confirmed');
select public.admin_update_order_status((select id from public.orders where order_number = :'order_a'), 'packed');
select public.admin_update_order_status((select id from public.orders where order_number = :'order_a'), 'handed_to_courier', null, 'Pathao', 'https://example.com/track/123');
select public.admin_update_order_status((select id from public.orders where order_number = :'order_a'), 'delivered');
select t.ok((select payment_status::text from public.orders where order_number = :'order_a') = 'paid', 'delivered marks Cash on Delivery paid');
reset role;
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
select t.ok((select count(*) from jsonb_array_elements(public.track_order(:'order_a', '01712345678') -> 'timeline') s
             where (s ->> 'done')::boolean) = 6, 'timeline: all 6 steps done');
select t.ok((select count(*) from jsonb_array_elements(public.track_order(:'order_a', '01712345678') -> 'timeline') s
             where s ->> 'at' is null and (s ->> 'done')::boolean) = 1, 'skipped step (out for delivery) is done without a time');
select t.ok(public.track_order(:'order_a', '01712345678') -> 'courier' ->> 'name' = 'Pathao', 'courier name shown on tracking');

-- Cancel puts stock back exactly once and releases the coupon
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated","aal":"aal2"}', false);
select public.admin_update_order_status((select id from public.orders where order_number = :'order_d'), 'cancelled', 'Customer changed mind on the call');
select t.ok((select stock from public.product_variants where sku = 'SAMPLE-TRAY') = 3, 'cancel restores stock 1 -> 3');
select t.fails(format($$select public.admin_update_order_status((select id from public.orders where order_number = %L), 'confirmed')$$, :'order_d'),
  'DC_INVALID_TRANSITION', 'cancelled is final');
select t.ok((select stock from public.product_variants where sku = 'SAMPLE-TRAY') = 3, 'stock still 3 (restored once)');
select public.admin_update_order_status((select id from public.orders where order_number = :'order_b'), 'cancelled');
select t.ok((select released_at is not null from public.coupon_redemptions cr join public.orders o on o.id = cr.order_id
             where o.order_number = :'order_b'), 'cancel releases the coupon use');
select t.ok((select count(*) from public.inventory_movements where reason = 'cancelled') >= 2, 'stock log has the cancellations');
select t.ok((select count(*) from public.inventory_movements where reason = 'order') = 17, 'stock log has the orders');
select t.ok((select count(*) from public.admin_activity where action = 'order.status') >= 6, 'status changes are in the activity log');

-- ---------------------------------------------------------------- reviews
reset role;
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
select t.fails(format($$select public.submit_review((select (public.track_order(%L, '01811111111') -> 'items' -> 0 ->> 'id')::uuid), 5, 'Lovely')$$, :'order_b'),
  'any', 'cannot review a cancelled order');
select t.fails(format($$select public.submit_review((public.track_order(%L, '01712345678') -> 'items' -> 0 ->> 'id')::uuid, 5, 'Lovely', null, null, %L, '01799999999')$$, :'order_a', :'order_a'),
  'DC_NOT_FOUND', 'wrong phone cannot review');
select public.submit_review((public.track_order(:'order_a', '01712345678') -> 'items' -> 0 ->> 'id')::uuid, 5,
  'Sturdy and the color is exactly like the photo.', 'Love it', null, :'order_a', '01712345678') as review_id \gset
select t.fails(format($$select public.submit_review((public.track_order(%L, '01712345678') -> 'items' -> 0 ->> 'id')::uuid, 4, 'Again', null, null, %L, '01712345678')$$, :'order_a', :'order_a'),
  'DC_ALREADY_REVIEWED', 'one review per order line');
select t.ok((select count(*) from public.reviews) = 0, 'pending review is not public');
select t.ok((select rating_count from public.products where slug = 'sample-ceramic-pen-holder') = 0, 'pending review does not count in the rating');

reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated","aal":"aal2"}', false);
update public.reviews set status = 'approved', rating = 1, body = 'edited by admin' where id = :'review_id';
reset role;
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
select t.ok((select count(*) from public.reviews) = 1, 'approved review is public');
select t.ok((select rating from public.reviews) = 5 and (select body from public.reviews) like 'Sturdy%', 'moderation cannot change what the customer wrote');
select t.ok((select rating_count from public.products where slug = 'sample-ceramic-pen-holder') = 1
            and (select rating_avg from public.products where slug = 'sample-ceramic-pen-holder') = 5, 'approved review counts in the rating');
select t.ok((public.home_feed() ->> 'has_reviews')::boolean, 'home feed shows the reviews block now');

-- ---------------------------------------------------------------- contact, newsletter, addresses
select t.clear_limits();
select t.fails($$select public.submit_contact_message('Rima', '123', 'Hello')$$, 'DC_INVALID_PHONE', 'contact form validates the phone');
select public.submit_contact_message('Rima', '01712345678', 'Hello, is the lamp available in sage?', null, 'dc-10001') from generate_series(1, 5);
select t.fails($$select public.submit_contact_message('Rima', '01712345678', 'Again')$$, 'DC_RATE_LIMITED', '6th message in an hour refused');
select public.subscribe_newsletter('Rima@Example.com');
select public.subscribe_newsletter('rima@example.com');
reset role;
select t.ok((select count(*) from public.newsletter_subscribers) = 1, 'repeat newsletter sign-up is silent and stored once');
select t.ok((select order_number from public.contact_messages limit 1) = 'DC-10001', 'contact order number upper-cased');

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1"}', false);
select t.fails($$insert into public.addresses (full_name, phone, division, district, area, address_line) values ('Rima', '01712345678', 'Dhaka', 'Dhaka', 'Narnia', 'x')$$,
  'DC_INVALID_AREA', 'address area must be from the list');
insert into public.addresses (full_name, phone, division, district, area, address_line)
values ('Rima', '+8801712345678', 'Dhaka', 'Dhaka', 'Mirpur', 'House 1, Road 2');
insert into public.addresses (label, full_name, phone, division, district, area, address_line, is_default)
values ('Office', 'Rima', '01712345678', 'Dhaka', 'Dhaka', 'Gulshan', 'Level 5', true);
select t.ok((select count(*) from public.addresses where is_default) = 1, 'only one default address');
select t.ok((select label from public.addresses where is_default) = 'Office', 'new default replaces the old one');
select t.ok((select phone from public.addresses limit 1) = '01712345678', 'address phone normalised');

-- ---------------------------------------------------------------- admin tools
select set_config('request.jwt.claims', '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated","aal":"aal2"}', false);
select (public.admin_save_product(jsonb_build_object(
  'name', 'Test mug', 'category_id', (select id from public.categories where slug = 'room-decor'), 'status', 'active',
  'options', jsonb_build_array(jsonb_build_object('name', 'Color', 'is_color', true, 'values', jsonb_build_array(
    jsonb_build_object('key', 'a', 'value', 'Rose', 'swatch_hex', '#E8C4B8'),
    jsonb_build_object('key', 'b', 'value', 'Moss', 'swatch_hex', '#8A9A5B')))),
  'variants', jsonb_build_array(
    jsonb_build_object('sku', 'mug-rose', 'option_keys', jsonb_build_array('a'), 'price', 550, 'stock', 4),
    jsonb_build_object('sku', 'mug-moss', 'option_keys', jsonb_build_array('b'), 'price', 600, 'compare_at_price', 750, 'stock', 2))
)) ->> 'id') as mug_id \gset
select t.ok((select price_min = 550 and price_max = 600 and variant_count = 2 and colors = array['rose', 'moss'] from public.products where id = :'mug_id'),
  'admin_save_product: summary computed once at the end');
select t.ok((select string_agg(sku, ',' order by sku) from public.product_variants where product_id = :'mug_id') = 'MUG-MOSS,MUG-ROSE', 'SKUs upper-cased');
select t.ok((select count(*) from public.inventory_movements where sku like 'MUG-%' and reason = 'initial') = 2, 'initial stock logged');
select t.fails(format($$select public.admin_save_product(jsonb_build_object('name', 'Copy', 'category_id', (select id from public.categories where slug = 'room-decor'),
  'variants', jsonb_build_array(jsonb_build_object('sku', 'MUG-ROSE', 'price', 100))))$$), 'DC_DUPLICATE_VARIANT', 'duplicate SKU refused with a clear message');
select public.admin_save_product(jsonb_build_object(
  'id', :'mug_id', 'name', 'Test mug', 'category_id', (select id from public.categories where slug = 'room-decor'),
  'options', jsonb_build_array(jsonb_build_object(
    'id', (select id from public.product_options where product_id = :'mug_id'), 'name', 'Color', 'is_color', true,
    'values', jsonb_build_array(jsonb_build_object(
      'id', (select id from public.product_option_values where product_id = :'mug_id' and value = 'Moss'), 'value', 'Moss', 'swatch_hex', '#8A9A5B')))),
  'variants', jsonb_build_array(jsonb_build_object(
    'id', (select id from public.product_variants where sku = 'MUG-MOSS'), 'sku', 'MUG-MOSS',
    'option_keys', jsonb_build_array((select id from public.product_option_values where product_id = :'mug_id' and value = 'Moss')::text),
    'price', 600, 'compare_at_price', 750, 'stock', 5))
));
select t.ok((select variant_count = 1 and on_sale and discount_percent = 20 and default_variant_id is not null from public.products where id = :'mug_id'),
  'edit: removed a color, summary shows one variant on sale (-20%)');
select t.ok((select count(*) from public.product_option_values where product_id = :'mug_id') = 1, 'removed value deleted');
select t.ok((select delta from public.inventory_movements where sku = 'MUG-MOSS' order by id desc limit 1) = 3, 'stock edit logged as +3');
select public.admin_set_stock(t.v('MUG-MOSS'), 1, 'Counted shelf');
select t.ok((select reason::text || ':' || note from public.inventory_movements where sku = 'MUG-MOSS' order by id desc limit 1) = 'correction:Counted shelf', 'stock correction logged with note');
select t.ok((public.admin_customers() ->> 'total')::integer >= 10, 'customers list includes accounts and guest phones');
select t.ok((select count(*) from public.admin_export_orders()) = 17, 'CSV export rows');
select t.ok(jsonb_array_length(public.admin_dashboard() -> 'recent_orders') = 10, 'dashboard recent orders');
select t.ok((public.admin_dashboard() ->> 'low_stock_count')::integer >= 1, 'dashboard low stock count');
select t.ok((public.admin_delete_sample_data() ->> 'archived')::integer >= 1, 'sample data: ordered samples are archived, not deleted');
reset role;
select t.ok((select count(*) from public.products where is_sample and status = 'active') = 0, 'no sample product left on sale');
select t.ok((select count(*) from public.order_items where product_name like '[SAMPLE]%') = 17, 'order history keeps its snapshots');
select set_config('request.jwt.claims', '', false);
