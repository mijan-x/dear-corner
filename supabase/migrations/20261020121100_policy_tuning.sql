-- Dear Corner — one policy per table, role and action
--
-- The public read policies already include "or is_admin()", so the admins'
-- FOR ALL policies only need to cover insert, update and delete. Keeping a
-- second SELECT policy made Postgres check both on every read (Supabase
-- performance advisor: multiple_permissive_policies). Access is unchanged.

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('categories', 'Admins can manage categories', 'categories'),
      ('collections', 'Admins can manage collections', 'collections'),
      ('products', 'Admins can manage products', 'products'),
      ('product_options', 'Admins can manage options', 'options'),
      ('product_option_values', 'Admins can manage option values', 'option values'),
      ('product_images', 'Admins can manage images', 'images'),
      ('product_variants', 'Admins can manage variants', 'variants'),
      ('product_collections', 'Admins can manage collection membership', 'collection membership'),
      ('geo_areas', 'Admins can manage areas', 'areas'),
      ('shipping_zones', 'Admins can manage delivery zones', 'delivery zones'),
      ('shipping_zone_areas', 'Admins can manage delivery zone areas', 'delivery zone areas')
    ) as t (tbl, old_policy, label)
  loop
    execute format('drop policy if exists %I on public.%I', r.old_policy, r.tbl);
    execute format('drop policy if exists %I on public.%I', 'Admins can add ' || r.label, r.tbl);
    execute format('drop policy if exists %I on public.%I', 'Admins can edit ' || r.label, r.tbl);
    execute format('drop policy if exists %I on public.%I', 'Admins can delete ' || r.label, r.tbl);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select public.is_admin()))',
      'Admins can add ' || r.label, r.tbl);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
      'Admins can edit ' || r.label, r.tbl);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select public.is_admin()))',
      'Admins can delete ' || r.label, r.tbl);
  end loop;
end;
$$;

-- Addresses: customers manage their own, admins can read all (one SELECT policy).
drop policy if exists "Customers manage their own addresses" on public.addresses;
drop policy if exists "Admins can read addresses" on public.addresses;
drop policy if exists "Customers read their own addresses" on public.addresses;
drop policy if exists "Customers add their own addresses" on public.addresses;
drop policy if exists "Customers edit their own addresses" on public.addresses;
drop policy if exists "Customers delete their own addresses" on public.addresses;

create policy "Customers read their own addresses"
  on public.addresses for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Customers add their own addresses"
  on public.addresses for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Customers edit their own addresses"
  on public.addresses for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Customers delete their own addresses"
  on public.addresses for delete to authenticated
  using (user_id = (select auth.uid()));
