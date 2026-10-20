-- Write access to the shop's own tables (one policy per role and action).
\set QUIET on

-- ---------------- signed-in customer: no catalog writes ----------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1"}', false);
select t.fails($$insert into public.categories (name, slug) values ('Hack', 'hack')$$, 'any', 'customer cannot add categories');
update public.categories set name = 'Hacked' where slug = 'gifts';
update public.product_variants set price = 1 where sku = 'SAMPLE-PENPOT';
delete from public.shipping_zones;
delete from public.geo_areas;
reset role;
select t.ok((select name from public.categories where slug = 'gifts') <> 'Hacked', 'customer UPDATE changed no categories');
select t.ok((select price from public.product_variants where sku = 'SAMPLE-PENPOT') > 1, 'customer UPDATE changed no prices');
select t.ok((select count(*) from public.shipping_zones) = 2, 'customer DELETE removed no delivery zones');
select t.ok((select count(*) from public.geo_areas) = 612, 'customer DELETE removed no areas');

-- ---------------- admin role without two-step login ----------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated","aal":"aal1"}', false);
select t.fails($$insert into public.categories (name, slug) values ('Hack', 'hack')$$, 'any', 'aal1 admin cannot add categories');
update public.shipping_zones set fee = 1;
reset role;
select t.ok((select min(fee) from public.shipping_zones) = 80, 'aal1 admin UPDATE changed no delivery fees');

-- ---------------- admin with two-step login ----------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated","aal":"aal2"}', false);
insert into public.categories (name, slug, is_active) values ('Test shelf', 'test-shelf', false);
select t.ok((select count(*) from public.categories where slug = 'test-shelf') = 1, 'admin adds a category and still sees it while hidden');
with u as (update public.categories set name = 'Test shelves' where slug = 'test-shelf' returning 1)
select t.ok((select count(*) from u) = 1, 'admin edits a category');
with u as (update public.product_variants set low_stock_threshold = low_stock_threshold where sku = 'SAMPLE-PENPOT' returning 1)
select t.ok((select count(*) from u) = 1, 'admin edits a variant directly');
reset role;

set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
select t.ok((select count(*) from public.categories where slug = 'test-shelf') = 0, 'visitors do not see a hidden category');
reset role;

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated","aal":"aal2"}', false);
with d as (delete from public.categories where slug = 'test-shelf' returning 1)
select t.ok((select count(*) from d) = 1, 'admin deletes a category');
reset role;

-- ---------------- addresses ----------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1"}', false);
insert into public.addresses (full_name, phone, division, district, area, address_line)
values ('Rima Akter', '01712345678', 'Dhaka', 'Dhaka', 'Dhanmondi', 'House 1, Road 2');
select t.ok((select count(*) from public.addresses) = 1, 'customer adds and reads their own address');
reset role;

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal1"}', false);
select t.ok((select count(*) from public.addresses) = 0, 'another customer cannot read it');
update public.addresses set address_line = 'Changed';
delete from public.addresses;
select t.fails($$insert into public.addresses (user_id, full_name, phone, division, district, area, address_line)
  values ('11111111-1111-1111-1111-111111111111', 'X', '01712345678', 'Dhaka', 'Dhaka', 'Dhanmondi', 'x')$$,
  'any', 'a customer cannot add an address to someone else');
reset role;
select t.ok((select address_line from public.addresses where user_id = '11111111-1111-1111-1111-111111111111') = 'House 1, Road 2',
  'another customer cannot change or delete it');

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated","aal":"aal2"}', false);
select t.ok((select count(*) from public.addresses) = 1, 'admin reads customer addresses');
reset role;

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1"}', false);
with d as (delete from public.addresses returning 1)
select t.ok((select count(*) from d) = 1, 'customer deletes their own address');
reset role;
select set_config('request.jwt.claims', '', false);
