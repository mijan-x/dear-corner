-- Dear Corner — admin functions
--
-- Every function here starts with private.require_admin(): the caller must
-- have the admin role AND a two-step (TOTP) verified session.

create or replace function private.require_admin()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception using
      message = 'This needs an admin account with two-step login.',
      detail = 'DC_ADMIN_REQUIRED',
      errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
-- The only way to change an order's status. Allowed moves are in
-- public.order_next_statuses(). Cancelled/returned put stock back exactly once
-- and cancelled releases the coupon use. Delivered marks Cash on Delivery paid.
create or replace function public.admin_update_order_status(
  p_order_id uuid,
  p_status public.order_status,
  p_note text default null,
  p_courier_name text default null,
  p_tracking_url text default null,
  p_tracking_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_old public.order_status;
  v_item record;
begin
  perform private.require_admin();
  if p_status is null then
    raise exception using message = 'Choose a status.', detail = 'DC_INVALID_STATUS';
  end if;

  select * into v_order from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception using message = 'Order not found.', detail = 'DC_NOT_FOUND';
  end if;
  v_old := v_order.status;

  if not (p_status = any (public.order_next_statuses(v_old))) then
    raise exception using
      message = format('Order %s can''t go from %s to %s.', v_order.order_number,
                       public.order_status_label(v_old), public.order_status_label(p_status)),
      detail = 'DC_INVALID_TRANSITION';
  end if;

  if p_status in ('cancelled', 'returned') and v_order.stock_restored_at is null then
    -- Same lock order as place_order: products, then variants.
    perform 1 from public.products p
    where p.id in (select oi.product_id from public.order_items oi where oi.order_id = v_order.id)
    order by p.id
    for share;
    perform 1 from public.product_variants v
    where v.id in (select oi.variant_id from public.order_items oi where oi.order_id = v_order.id)
    order by v.id
    for update;

    perform set_config('dc.stock_reason', p_status::text, true);
    perform set_config('dc.stock_order_id', v_order.id::text, true);
    for v_item in
      select oi.variant_id, sum(oi.quantity)::integer as qty
      from public.order_items oi
      where oi.order_id = v_order.id and oi.variant_id is not null
      group by oi.variant_id
      order by oi.variant_id
    loop
      update public.product_variants v set stock = v.stock + v_item.qty where v.id = v_item.variant_id;
    end loop;
    perform set_config('dc.stock_reason', '', true);
    perform set_config('dc.stock_order_id', '', true);

    v_order.stock_restored_at := now();
  end if;

  if p_status = 'cancelled' then
    update public.coupon_redemptions cr set released_at = now()
    where cr.order_id = v_order.id and cr.released_at is null;
  end if;

  update public.orders o
  set status = p_status,
      stock_restored_at = v_order.stock_restored_at,
      payment_status = case when p_status = 'delivered' then 'paid'::public.payment_status else o.payment_status end,
      courier_name = coalesce(nullif(btrim(coalesce(p_courier_name, '')), ''), o.courier_name),
      tracking_url = coalesce(nullif(btrim(coalesce(p_tracking_url, '')), ''), o.tracking_url),
      tracking_code = coalesce(nullif(btrim(coalesce(p_tracking_code, '')), ''), o.tracking_code)
  where o.id = v_order.id
  returning * into v_order;

  insert into public.order_status_history (order_id, status, note, actor_id)
  values (v_order.id, p_status, nullif(btrim(coalesce(p_note, '')), ''), (select auth.uid()));

  perform private.log_activity(
    'order.status', 'orders', v_order.id::text,
    format('%s: %s → %s', v_order.order_number, public.order_status_label(v_old), public.order_status_label(p_status)),
    jsonb_build_object('from', v_old, 'to', p_status, 'note', p_note)
  );

  return to_jsonb(v_order) || jsonb_build_object('next_statuses', to_jsonb(public.order_next_statuses(v_order.status)));
end;
$$;

-- Courier name and tracking link, any time after the order is placed.
create or replace function public.admin_update_order_courier(
  p_order_id uuid,
  p_courier_name text,
  p_tracking_url text,
  p_tracking_code text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_number text;
begin
  perform private.require_admin();
  if nullif(btrim(coalesce(p_tracking_url, '')), '') is not null and btrim(p_tracking_url) !~ '^https?://' then
    raise exception using message = 'The tracking link must start with https://', detail = 'DC_INVALID_URL';
  end if;
  update public.orders o
  set courier_name = nullif(btrim(coalesce(p_courier_name, '')), ''),
      tracking_url = nullif(btrim(coalesce(p_tracking_url, '')), ''),
      tracking_code = nullif(btrim(coalesce(p_tracking_code, '')), '')
  where o.id = p_order_id
  returning o.order_number into v_number;
  if v_number is null then
    raise exception using message = 'Order not found.', detail = 'DC_NOT_FOUND';
  end if;
  perform private.log_activity('order.courier', 'orders', p_order_id::text,
    format('%s: courier %s', v_number, coalesce(p_courier_name, '—')));
end;
$$;

-- Fix the customer's details after the confirmation call (typos, landmarks).
-- Only before the parcel leaves. The delivery fee is not recalculated.
create or replace function public.admin_update_order_details(p_order_id uuid, p_details jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_phone text;
begin
  perform private.require_admin();
  select * into v_order from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception using message = 'Order not found.', detail = 'DC_NOT_FOUND';
  end if;
  if v_order.status not in ('placed', 'confirmed', 'packed') then
    raise exception using message = 'Details can''t be changed after the parcel is handed to the courier.',
      detail = 'DC_LOCKED';
  end if;

  v_phone := coalesce(public.normalize_bd_phone(p_details ->> 'phone'), v_order.phone);
  v_order.customer_name := coalesce(nullif(btrim(p_details ->> 'name'), ''), v_order.customer_name);
  v_order.phone := v_phone;
  v_order.email := case when p_details ? 'email' then nullif(lower(btrim(p_details ->> 'email')), '') else v_order.email end;
  v_order.division := coalesce(nullif(btrim(p_details ->> 'division'), ''), v_order.division);
  v_order.district := coalesce(nullif(btrim(p_details ->> 'district'), ''), v_order.district);
  v_order.area := coalesce(nullif(btrim(p_details ->> 'area'), ''), v_order.area);
  v_order.address_line := coalesce(nullif(btrim(p_details ->> 'address_line'), ''), v_order.address_line);
  v_order.delivery_note := coalesce(p_details ->> 'delivery_note', v_order.delivery_note);

  if not exists (
    select 1 from public.geo_areas g
    where g.division = v_order.division and g.district = v_order.district and g.area = v_order.area
  ) then
    raise exception using message = 'Choose the division, district and area from the lists.', detail = 'DC_INVALID_AREA';
  end if;

  update public.orders o
  set customer_name = v_order.customer_name, phone = v_order.phone, email = v_order.email,
      division = v_order.division, district = v_order.district, area = v_order.area,
      address_line = v_order.address_line, delivery_note = v_order.delivery_note
  where o.id = p_order_id
  returning * into v_order;

  perform private.log_activity('order.details', 'orders', p_order_id::text,
    format('%s: customer details edited', v_order.order_number), p_details);
  return to_jsonb(v_order);
end;
$$;

-- Flat rows for the CSV export (one row per order).
create or replace function public.admin_export_orders(
  p_from date default null,
  p_to date default null,
  p_statuses public.order_status[] default null
)
returns table (
  order_number text, placed_at timestamptz, status text, customer_name text, phone text, email text,
  division text, district text, area text, address_line text, delivery_note text,
  items text, item_count integer, subtotal integer, discount integer, coupon_code text,
  delivery_fee integer, total integer, payment_method text, payment_status text,
  courier_name text, tracking_code text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  select
    o.order_number, o.created_at, public.order_status_label(o.status), o.customer_name, o.phone, o.email,
    o.division, o.district, o.area, o.address_line, o.delivery_note,
    (select string_agg(oi.product_name || case when oi.variant_title <> 'Default' then ' (' || oi.variant_title || ')' else '' end
                       || ' x' || oi.quantity, '; ' order by oi.product_name)
     from public.order_items oi where oi.order_id = o.id),
    (select sum(oi.quantity)::integer from public.order_items oi where oi.order_id = o.id),
    o.subtotal, o.discount, o.coupon_code, o.delivery_fee, o.total,
    'Cash on Delivery'::text, o.payment_status::text, o.courier_name, o.tracking_code
  from public.orders o
  where (p_from is null or (o.created_at at time zone 'Asia/Dhaka')::date >= p_from)
    and (p_to is null or (o.created_at at time zone 'Asia/Dhaka')::date <= p_to)
    and (p_statuses is null or o.status = any (p_statuses))
  order by o.created_at desc
  limit 10000;
end;
$$;

-- ---------------------------------------------------------------------------
-- Dashboard
-- ---------------------------------------------------------------------------
create or replace function public.admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today_start timestamptz := date_trunc('day', now() at time zone 'Asia/Dhaka') at time zone 'Asia/Dhaka';
begin
  perform private.require_admin();
  return jsonb_build_object(
    'today_orders', (select count(*) from public.orders o where o.created_at >= v_today_start),
    'today_revenue', (select coalesce(sum(o.total), 0) from public.orders o
                      where o.created_at >= v_today_start and o.status not in ('cancelled', 'returned')),
    'pending_orders', (select count(*) from public.orders o where o.status = 'placed'),
    'low_stock_count', (
      select count(*) from public.product_variants v join public.products p on p.id = v.product_id
      where v.is_active and p.status = 'active' and v.stock <= v.low_stock_threshold
    ),
    'new_messages', (select count(*) from public.contact_messages m where m.status = 'new'),
    'pending_reviews', (select count(*) from public.reviews r where r.status = 'pending'),
    'recent_orders', coalesce((
      select jsonb_agg(x order by x.created_at desc)
      from (
        select o.id, o.order_number, o.customer_name, o.phone, o.district, o.total, o.status, o.created_at,
               (select sum(oi.quantity) from public.order_items oi where oi.order_id = o.id) as item_count,
               to_jsonb(public.order_next_statuses(o.status)) as next_statuses
        from public.orders o
        order by o.created_at desc
        limit 10
      ) x
    ), '[]'::jsonb),
    'low_stock', coalesce((
      select jsonb_agg(x order by x.stock, x.product_name)
      from (
        select v.id as variant_id, p.id as product_id, p.name as product_name, v.title as variant_title,
               v.sku, v.stock, v.low_stock_threshold
        from public.product_variants v join public.products p on p.id = v.product_id
        where v.is_active and p.status = 'active' and v.stock <= v.low_stock_threshold
        order by v.stock, p.name
        limit 10
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
-- Signed-up customers and guest buyers (grouped by phone), with order totals.
create or replace function public.admin_customers(
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_term text := nullif(btrim(coalesce(p_search, '')), '');
  v_result jsonb;
begin
  perform private.require_admin();
  with people as (
    select 'account'::text as kind, pr.id::text as key, pr.full_name as name, pr.phone, pr.email,
           pr.created_at as since
    from public.profiles pr
    union all
    select 'guest', g.phone, g.name, g.phone, g.email, g.first_at
    from (
      select o.phone,
             (array_agg(o.customer_name order by o.created_at desc))[1] as name,
             (array_agg(o.email order by o.created_at desc) filter (where o.email is not null))[1] as email,
             min(o.created_at) as first_at
      from public.orders o
      where o.user_id is null
      group by o.phone
    ) g
  ),
  stats as (
    select pe.*,
      (select count(*) from public.orders o
        where (pe.kind = 'account' and o.user_id::text = pe.key)
           or (pe.kind = 'guest' and o.user_id is null and o.phone = pe.key)) as orders_count,
      (select coalesce(sum(o.total), 0) from public.orders o
        where o.status = 'delivered'
          and ((pe.kind = 'account' and o.user_id::text = pe.key)
               or (pe.kind = 'guest' and o.user_id is null and o.phone = pe.key))) as delivered_total,
      (select max(o.created_at) from public.orders o
        where (pe.kind = 'account' and o.user_id::text = pe.key)
           or (pe.kind = 'guest' and o.user_id is null and o.phone = pe.key)) as last_order_at
    from people pe
    where v_term is null
       or pe.name ilike '%' || v_term || '%'
       or pe.phone ilike '%' || regexp_replace(v_term, '[^0-9]', '', 'g') || '%'
       or pe.email ilike '%' || v_term || '%'
  )
  select jsonb_build_object(
    'total', (select count(*) from stats),
    'rows', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.last_order_at desc nulls last, s.since desc)
      from (
        select * from stats
        order by last_order_at desc nulls last, since desc
        limit least(greatest(coalesce(p_limit, 50), 1), 200)
        offset greatest(coalesce(p_offset, 0), 0)
      ) s
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
-- Saves a whole product in one transaction: fields, options with values, the
-- variant table, image order / alt text / color links, and manual collections.
-- Input (all keys optional on update except as noted):
--   { "id": uuid|null, "name": text (required), "slug": text, "category_id": uuid (required),
--     "short_description", "description", "details_and_care", "status",
--     "is_featured", "featured_rank", "is_bestseller", "is_gift", "new_until",
--     "seo_title", "seo_description", "is_sample",
--     "collection_ids": [uuid],
--     "options": [{ "id": uuid?, "name": "Color", "is_color": true,
--                   "values": [{ "key": "v1", "id": uuid?, "value": "Sage", "swatch_hex": "#9CAF88" }] }],
--     "variants": [{ "id": uuid?, "sku", "option_keys": ["v1", ...] (one per option, in option order),
--                    "price", "compare_at_price", "stock", "low_stock_threshold", "image_id", "is_active" }],
--     "images": [{ "id": uuid, "alt_text", "option_value_key": "v1"|null }]   -- in display order
--   }
-- A value's key can be its id. Images missing from "images" are deleted; their
-- file paths come back in deleted_image_paths so the admin page can remove the files.
create or replace function public.admin_save_product(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_slug text;
  v_base_slug text;
  v_n integer := 1;
  v_option jsonb;
  v_value jsonb;
  v_variant jsonb;
  v_image jsonb;
  v_pos integer;
  v_option_id uuid;
  v_value_id uuid;
  v_key_map jsonb := '{}'::jsonb;      -- value key -> value id
  v_kept_options uuid[] := array[]::uuid[];
  v_kept_values uuid[] := array[]::uuid[];
  v_kept_variants uuid[] := array[]::uuid[];
  v_kept_images uuid[] := array[]::uuid[];
  v_option_count integer;
  v_slots uuid[];
  v_variant_id uuid;
  v_deleted_paths jsonb;
  v_stock_before integer;
begin
  perform private.require_admin();
  perform set_config('dc.skip_summary', 'on', true);

  if coalesce(btrim(p ->> 'name'), '') = '' then
    raise exception using message = 'Give the product a name.', detail = 'DC_MISSING_NAME';
  end if;
  if nullif(p ->> 'category_id', '') is null then
    raise exception using message = 'Choose a category.', detail = 'DC_MISSING_CATEGORY';
  end if;
  if p -> 'variants' is null or jsonb_typeof(p -> 'variants') <> 'array' or jsonb_array_length(p -> 'variants') = 0 then
    raise exception using message = 'Add at least one variant with a SKU, price and stock.', detail = 'DC_NO_VARIANTS';
  end if;
  if jsonb_array_length(coalesce(p -> 'options', '[]'::jsonb)) > 3 then
    raise exception using message = 'A product can have up to 3 options (for example Color, Size).', detail = 'DC_TOO_MANY_OPTIONS';
  end if;

  -- Unique slug
  v_base_slug := private.slugify(coalesce(nullif(btrim(p ->> 'slug'), ''), p ->> 'name'));
  if v_base_slug = '' then
    v_base_slug := 'product';
  end if;
  v_slug := v_base_slug;
  while exists (select 1 from public.products x where x.slug = v_slug and x.id is distinct from v_id) loop
    v_n := v_n + 1;
    v_slug := v_base_slug || '-' || v_n;
  end loop;

  -- Product row (locked first, same order as place_order)
  if v_id is null then
    insert into public.products (
      category_id, name, slug, short_description, description, details_and_care, status,
      is_featured, featured_rank, is_bestseller, is_gift, new_until, seo_title, seo_description, is_sample
    ) values (
      (p ->> 'category_id')::uuid, btrim(p ->> 'name'), v_slug,
      coalesce(p ->> 'short_description', ''), coalesce(p ->> 'description', ''),
      coalesce(p ->> 'details_and_care', ''),
      coalesce(nullif(p ->> 'status', ''), 'draft')::public.product_status,
      coalesce((p ->> 'is_featured')::boolean, false), nullif(p ->> 'featured_rank', '')::integer,
      coalesce((p ->> 'is_bestseller')::boolean, false), coalesce((p ->> 'is_gift')::boolean, false),
      nullif(p ->> 'new_until', '')::timestamptz,
      nullif(p ->> 'seo_title', ''), nullif(p ->> 'seo_description', ''),
      coalesce((p ->> 'is_sample')::boolean, false)
    )
    returning id into v_id;
  else
    perform 1 from public.products x where x.id = v_id for update;
    if not found then
      raise exception using message = 'Product not found.', detail = 'DC_NOT_FOUND';
    end if;
    update public.products x
    set category_id = (p ->> 'category_id')::uuid,
        name = btrim(p ->> 'name'),
        slug = v_slug,
        short_description = coalesce(p ->> 'short_description', x.short_description),
        description = coalesce(p ->> 'description', x.description),
        details_and_care = coalesce(p ->> 'details_and_care', x.details_and_care),
        status = coalesce(nullif(p ->> 'status', ''), x.status::text)::public.product_status,
        is_featured = coalesce((p ->> 'is_featured')::boolean, x.is_featured),
        featured_rank = case when p ? 'featured_rank' then nullif(p ->> 'featured_rank', '')::integer else x.featured_rank end,
        is_bestseller = coalesce((p ->> 'is_bestseller')::boolean, x.is_bestseller),
        is_gift = coalesce((p ->> 'is_gift')::boolean, x.is_gift),
        new_until = case when p ? 'new_until' then nullif(p ->> 'new_until', '')::timestamptz else x.new_until end,
        seo_title = case when p ? 'seo_title' then nullif(p ->> 'seo_title', '') else x.seo_title end,
        seo_description = case when p ? 'seo_description' then nullif(p ->> 'seo_description', '') else x.seo_description end
    where x.id = v_id;
  end if;

  -- Options and values
  v_pos := 0;
  for v_option in select * from jsonb_array_elements(coalesce(p -> 'options', '[]'::jsonb)) loop
    v_pos := v_pos + 1;
    v_option_id := nullif(v_option ->> 'id', '')::uuid;
    if coalesce(btrim(v_option ->> 'name'), '') = '' then
      raise exception using message = 'Every option needs a name, like Color or Size.', detail = 'DC_OPTION_NAME';
    end if;
    if v_option_id is not null and exists (
      select 1 from public.product_options o where o.id = v_option_id and o.product_id = v_id
    ) then
      update public.product_options o
      set name = btrim(v_option ->> 'name'),
          is_color = coalesce((v_option ->> 'is_color')::boolean, false),
          position = v_pos
      where o.id = v_option_id;
    else
      insert into public.product_options (product_id, name, is_color, position)
      values (v_id, btrim(v_option ->> 'name'), coalesce((v_option ->> 'is_color')::boolean, false), v_pos)
      returning id into v_option_id;
    end if;
    v_kept_options := v_kept_options || v_option_id;

    if jsonb_array_length(coalesce(v_option -> 'values', '[]'::jsonb)) = 0 then
      raise exception using message = format('Add at least one value to %s.', v_option ->> 'name'), detail = 'DC_OPTION_VALUES';
    end if;
    for v_value in select * from jsonb_array_elements(v_option -> 'values') loop
      v_value_id := nullif(v_value ->> 'id', '')::uuid;
      if coalesce(btrim(v_value ->> 'value'), '') = '' then
        raise exception using message = 'Option values can''t be empty.', detail = 'DC_OPTION_VALUES';
      end if;
      if v_value_id is not null and exists (
        select 1 from public.product_option_values ov where ov.id = v_value_id and ov.product_id = v_id
      ) then
        update public.product_option_values ov
        set option_id = v_option_id, value = btrim(v_value ->> 'value'),
            swatch_hex = nullif(v_value ->> 'swatch_hex', ''),
            position = coalesce((v_value ->> 'position')::integer, ov.position)
        where ov.id = v_value_id;
      else
        insert into public.product_option_values (option_id, product_id, value, swatch_hex, position)
        values (v_option_id, v_id, btrim(v_value ->> 'value'), nullif(v_value ->> 'swatch_hex', ''),
                coalesce((v_value ->> 'position')::integer, 0))
        returning id into v_value_id;
      end if;
      v_kept_values := v_kept_values || v_value_id;
      v_key_map := v_key_map || jsonb_build_object(coalesce(nullif(v_value ->> 'key', ''), v_value_id::text), v_value_id);
      v_key_map := v_key_map || jsonb_build_object(v_value_id::text, v_value_id);
    end loop;
  end loop;
  v_option_count := v_pos;

  -- Variants
  for v_variant in select * from jsonb_array_elements(p -> 'variants') loop
    if jsonb_array_length(coalesce(v_variant -> 'option_keys', '[]'::jsonb)) <> v_option_count then
      raise exception using
        message = format('Variant %s needs one value for each option.', coalesce(v_variant ->> 'sku', '')),
        detail = 'DC_VARIANT_OPTIONS';
    end if;
    select array_agg((v_key_map ->> k)::uuid order by ord)
    into v_slots
    from jsonb_array_elements_text(coalesce(v_variant -> 'option_keys', '[]'::jsonb)) with ordinality as t(k, ord);
    if v_option_count > 0 and exists (select 1 from unnest(v_slots) s where s is null) then
      raise exception using message = 'A variant points to an option value that doesn''t exist.', detail = 'DC_VARIANT_OPTIONS';
    end if;
    if coalesce((v_variant ->> 'price')::integer, 0) <= 0 then
      raise exception using message = format('Give variant %s a price above ৳0.', coalesce(v_variant ->> 'sku', '')),
        detail = 'DC_VARIANT_PRICE';
    end if;

    v_variant_id := nullif(v_variant ->> 'id', '')::uuid;
    if v_variant_id is not null and not exists (
      select 1 from public.product_variants v where v.id = v_variant_id and v.product_id = v_id
    ) then
      v_variant_id := null;
    end if;

    begin
      if v_variant_id is not null then
        select v.stock into v_stock_before from public.product_variants v where v.id = v_variant_id for update;
        update public.product_variants v
        set sku = btrim(v_variant ->> 'sku'),
            option1 = v_slots[1], option2 = v_slots[2], option3 = v_slots[3],
            price = (v_variant ->> 'price')::integer,
            compare_at_price = nullif(v_variant ->> 'compare_at_price', '')::integer,
            stock = coalesce((v_variant ->> 'stock')::integer, v.stock),
            low_stock_threshold = coalesce((v_variant ->> 'low_stock_threshold')::integer, v.low_stock_threshold),
            image_id = nullif(v_variant ->> 'image_id', '')::uuid,
            position = coalesce((v_variant ->> 'position')::integer, v.position),
            is_active = coalesce((v_variant ->> 'is_active')::boolean, v.is_active)
        where v.id = v_variant_id;
      else
        insert into public.product_variants (
          product_id, sku, option1, option2, option3, price, compare_at_price, stock,
          low_stock_threshold, image_id, position, is_active
        ) values (
          v_id, btrim(v_variant ->> 'sku'), v_slots[1], v_slots[2], v_slots[3],
          (v_variant ->> 'price')::integer, nullif(v_variant ->> 'compare_at_price', '')::integer,
          coalesce((v_variant ->> 'stock')::integer, 0),
          coalesce((v_variant ->> 'low_stock_threshold')::integer, 3),
          nullif(v_variant ->> 'image_id', '')::uuid,
          coalesce((v_variant ->> 'position')::integer, 0),
          coalesce((v_variant ->> 'is_active')::boolean, true)
        )
        returning id into v_variant_id;
      end if;
    exception
      when unique_violation then
        raise exception using
          message = format('SKU %s is already used, or two variants have the same options.', v_variant ->> 'sku'),
          detail = 'DC_DUPLICATE_VARIANT';
      when check_violation then
        raise exception using
          message = format('Check variant %s: the SKU uses letters, numbers, dots, dashes; the old price must be higher than the price; stock can''t be negative.',
                           coalesce(v_variant ->> 'sku', '')),
          detail = 'DC_VARIANT_INVALID';
    end;
    v_kept_variants := v_kept_variants || v_variant_id;
  end loop;

  -- Variants, values and options no longer listed. Order lines keep their own
  -- snapshot, so deleting a variant never breaks order history.
  delete from public.product_variants v where v.product_id = v_id and not (v.id = any (v_kept_variants));
  delete from public.product_option_values ov where ov.product_id = v_id and not (ov.id = any (v_kept_values));
  delete from public.product_options o where o.product_id = v_id and not (o.id = any (v_kept_options));

  -- Images: order, alt text and color link; unlisted ones are deleted.
  if p ? 'images' then
    v_pos := 0;
    for v_image in select * from jsonb_array_elements(coalesce(p -> 'images', '[]'::jsonb)) loop
      update public.product_images i
      set position = v_pos,
          alt_text = coalesce(v_image ->> 'alt_text', i.alt_text),
          option_value_id = case
            when nullif(v_image ->> 'option_value_key', '') is null then null
            else (v_key_map ->> (v_image ->> 'option_value_key'))::uuid end
      where i.id = (v_image ->> 'id')::uuid and i.product_id = v_id;
      if found then
        v_kept_images := v_kept_images || (v_image ->> 'id')::uuid;
        v_pos := v_pos + 1;
      end if;
    end loop;
    select coalesce(jsonb_agg(jsonb_build_object('path', i.path, 'thumb', i.thumb_path)), '[]'::jsonb)
    into v_deleted_paths
    from public.product_images i
    where i.product_id = v_id and not (i.id = any (v_kept_images));
    delete from public.product_images i where i.product_id = v_id and not (i.id = any (v_kept_images));
  else
    v_deleted_paths := '[]'::jsonb;
  end if;

  -- A variant's image must belong to this product.
  update public.product_variants v set image_id = null
  where v.product_id = v_id and v.image_id is not null
    and not exists (select 1 from public.product_images i where i.id = v.image_id and i.product_id = v_id);

  -- Manual collections
  if p ? 'collection_ids' then
    delete from public.product_collections pc
    where pc.product_id = v_id
      and not (pc.collection_id = any (array(select jsonb_array_elements_text(p -> 'collection_ids'))::uuid[]));
    insert into public.product_collections (product_id, collection_id)
    select v_id, x::uuid
    from jsonb_array_elements_text(p -> 'collection_ids') x
    on conflict do nothing;
  end if;

  perform set_config('dc.skip_summary', '', true);
  perform private.refresh_product_summary(v_id);

  return jsonb_build_object(
    'id', v_id,
    'slug', v_slug,
    'deleted_image_paths', v_deleted_paths
  );
end;
$$;

-- Stock correction from the Inventory page (logged with the note).
create or replace function public.admin_set_stock(p_variant_id uuid, p_stock integer, p_note text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product uuid;
begin
  perform private.require_admin();
  if p_stock is null or p_stock < 0 then
    raise exception using message = 'Stock can''t be negative.', detail = 'DC_INVALID_STOCK';
  end if;
  select v.product_id into v_product from public.product_variants v where v.id = p_variant_id;
  if v_product is null then
    raise exception using message = 'Variant not found.', detail = 'DC_NOT_FOUND';
  end if;
  perform 1 from public.products x where x.id = v_product for share;
  perform 1 from public.product_variants v where v.id = p_variant_id for update;
  perform set_config('dc.stock_reason', 'correction', true);
  perform set_config('dc.stock_note', left(coalesce(p_note, ''), 200), true);
  update public.product_variants v set stock = p_stock where v.id = p_variant_id;
  perform set_config('dc.stock_reason', '', true);
  perform set_config('dc.stock_note', '', true);
  return p_stock;
end;
$$;

-- Removes the sample data: sample products without orders are deleted, those
-- with orders are archived; empty sample categories are deleted.
create or replace function public.admin_delete_sample_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
  v_archived integer;
  v_categories integer;
begin
  perform private.require_admin();
  update public.products p set status = 'archived'
  where p.is_sample and exists (select 1 from public.order_items oi where oi.product_id = p.id);
  get diagnostics v_archived = row_count;

  delete from public.products p
  where p.is_sample and not exists (select 1 from public.order_items oi where oi.product_id = p.id);
  get diagnostics v_deleted = row_count;

  delete from public.categories c
  where c.is_sample and not exists (select 1 from public.products p where p.category_id = c.id)
    and not exists (select 1 from public.categories ch where ch.parent_id = c.id);
  get diagnostics v_categories = row_count;

  perform private.log_activity('sample.delete', 'products', null,
    format('Sample data removed: %s deleted, %s archived, %s categories', v_deleted, v_archived, v_categories));
  return jsonb_build_object('deleted', v_deleted, 'archived', v_archived, 'categories', v_categories);
end;
$$;
