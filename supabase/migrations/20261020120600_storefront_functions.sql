-- Dear Corner — storefront functions (called from the website)
--
-- Pricing: private.price_cart() is the only place prices, coupon discounts,
-- delivery fees and totals are worked out. quote_cart() (cart and checkout
-- previews) and place_order() both use it, so what the shopper sees is what
-- the order records. Nothing the browser sends is trusted except variant ids,
-- quantities, the coupon code and the delivery address.
--
-- Errors are raised with a shopper-facing message and a machine code in
-- DETAIL (DC_...). Some include JSON in HINT (for example the fresh quote when
-- prices changed).

-- ---------------------------------------------------------------------------
-- Small helpers
-- ---------------------------------------------------------------------------
create or replace function private.format_taka(p_amount integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select '৳' || to_char(coalesce(p_amount, 0), 'FM999,999,999,990');
$$;

-- "DC-10482", "dc 10482", "#DC-10482" and "10482" all mean DC-10482.
create or replace function private.normalize_order_number(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when d ~ '^[0-9]{5,9}$' then 'DC-' || d
    else null
  end
  from (select regexp_replace(upper(coalesce(p_value, '')), '[^0-9]', '', 'g') as d) s;
$$;

create or replace function private.rate_limited(p_bucket text, p_key text, p_max_hits integer, p_per interval)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) >= p_max_hits
  from private.rate_limit_hits h
  where h.bucket = p_bucket and h.key = p_key and h.created_at > now() - p_per;
$$;

create or replace function private.record_hit(p_bucket text, p_key text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.rate_limit_hits (bucket, key) values (p_bucket, p_key);
$$;

-- Prefix search query: "led lam" -> 'led':* & 'lam':* (English stemming).
create or replace function private.search_tsquery(p_term text)
returns tsquery
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_parts text[];
  v_query text;
begin
  v_parts := array(
    select t from regexp_split_to_table(
      lower(regexp_replace(coalesce(p_term, ''), '[^[:alnum:][:space:]]+', ' ', 'g')), '\s+'
    ) t
    where t <> ''
    limit 8
  );
  if coalesce(array_length(v_parts, 1), 0) = 0 then
    return null;
  end if;
  select string_agg(quote_literal(p) || ':*', ' & ') into v_query from unnest(v_parts) p;
  return to_tsquery('english'::regconfig, v_query);
end;
$$;

-- ---------------------------------------------------------------------------
-- Product cards (lists, search, home)
-- ---------------------------------------------------------------------------
create type public.product_card as (
  id uuid,
  slug text,
  name text,
  category_id uuid,
  price_min integer,
  price_max integer,
  compare_at_price integer,
  discount_percent integer,
  card_images jsonb,
  swatches jsonb,
  variant_count integer,
  default_variant_id uuid,
  is_new boolean,
  is_bestseller boolean,
  is_gift boolean,
  on_sale boolean,
  stock_total integer,
  low_stock boolean,
  sold_out boolean,
  rating_avg numeric,
  rating_count integer,
  total_count bigint
);

-- Every active product matching the listing filters (no paging). Shared by
-- catalog_products (sorted pages) and catalog_facets (filter counts).
-- p_flag: 'bestseller', 'gift', 'new', 'featured' or 'sale'.
create or replace function private.catalog_matches(
  p_category text default null,
  p_collection text default null,
  p_search text default null,
  p_min_price integer default null,
  p_max_price integer default null,
  p_colors text[] default null,
  p_in_stock boolean default false,
  p_on_sale boolean default false,
  p_exclude uuid default null,
  p_flag text default null
)
returns table (
  id uuid, slug text, name text, category_id uuid,
  price_min integer, price_max integer, compare_at_price integer,
  discount_percent integer, max_discount_percent integer,
  card_images jsonb, swatches jsonb, variant_count integer, default_variant_id uuid,
  new_until timestamptz, is_bestseller boolean, is_gift boolean, is_featured boolean,
  featured_rank integer, on_sale boolean, published_at timestamptz,
  rating_avg numeric, rating_count integer,
  stock_total integer, low_threshold integer, relevance real
)
language sql
stable
set search_path = ''
as $$
  with
  term as (
    select nullif(btrim(coalesce(p_search, '')), '') as text,
           private.search_tsquery(p_search) as tsq
  ),
  cat as (
    select array_agg(c.id) as ids
    from public.categories c
    where p_category is not null
      and c.is_active
      and (c.slug = p_category
           or c.parent_id = (select c2.id from public.categories c2 where c2.slug = p_category))
  ),
  col as (
    select c.id, c.rule, c.rule_value
    from public.collections c
    where p_collection is not null and c.slug = p_collection and c.is_active
  )
  select
    p.id, p.slug, p.name, p.category_id,
    p.price_min, p.price_max, p.compare_at_price,
    p.discount_percent, p.max_discount_percent,
    p.card_images, p.swatches, p.variant_count, p.default_variant_id,
    p.new_until, p.is_bestseller, p.is_gift, p.is_featured,
    p.featured_rank, p.on_sale, p.published_at,
    p.rating_avg, p.rating_count,
    coalesce(s.stock_total, 0) as stock_total,
    coalesce(s.low_threshold, 3) as low_threshold,
    case when (select t.text from term t) is null then 0::real
      else coalesce(ts_rank(p.search_vector, (select t.tsq from term t)), 0)
           + extensions.similarity(lower(p.name), lower((select t.text from term t)))
    end as relevance
  from public.products p
  left join lateral (
    select sum(v.stock)::integer as stock_total, max(v.low_stock_threshold) as low_threshold
    from public.product_variants v
    where v.product_id = p.id and v.is_active
  ) s on true
  where p.status = 'active'
    and p.price_min is not null
    and (p_exclude is null or p.id <> p_exclude)
    and (p_category is null or p.category_id = any (coalesce((select cat.ids from cat), array[]::uuid[])))
    and (
      p_collection is null
      or exists (
        select 1 from col
        where (col.rule = 'manual' and exists (
                select 1 from public.product_collections pc
                where pc.collection_id = col.id and pc.product_id = p.id))
           or (col.rule = 'new_arrivals' and p.new_until > now())
           or (col.rule = 'max_price' and p.price_min <= col.rule_value)
           or (col.rule = 'on_sale' and p.on_sale)
           or (col.rule = 'bestsellers' and p.is_bestseller)
           or (col.rule = 'gifts' and p.is_gift)
      )
    )
    and (
      p_flag is null
      or (p_flag = 'bestseller' and p.is_bestseller)
      or (p_flag = 'gift' and p.is_gift)
      or (p_flag = 'new' and p.new_until > now())
      or (p_flag = 'featured' and p.is_featured)
      or (p_flag = 'sale' and p.on_sale)
    )
    and (
      (select t.text from term t) is null
      or p.search_vector @@ (select t.tsq from term t)
      or p.name ilike '%' || replace(replace(replace((select t.text from term t), '\', '\\'), '%', '\%'), '_', '\_') || '%'
      or extensions.word_similarity(lower((select t.text from term t)), lower(p.name)) >= 0.45
    )
    and (p_min_price is null or p.price_max >= p_min_price)
    and (p_max_price is null or p.price_min <= p_max_price)
    and (p_colors is null or cardinality(p_colors) = 0
         or p.colors && array(select lower(x) from unnest(p_colors) x))
    and (not coalesce(p_on_sale, false) or p.on_sale)
    and (not coalesce(p_in_stock, false) or coalesce(s.stock_total, 0) > 0);
$$;

-- Product list with filters, sorting and paging (24 per load).
-- Sorts: featured (default), newest, price_asc, price_desc, discount, relevance.
-- Sold-out products always come last.
create or replace function public.catalog_products(
  p_category text default null,
  p_collection text default null,
  p_search text default null,
  p_min_price integer default null,
  p_max_price integer default null,
  p_colors text[] default null,
  p_in_stock boolean default false,
  p_on_sale boolean default false,
  p_sort text default 'featured',
  p_limit integer default 24,
  p_offset integer default 0,
  p_exclude uuid default null,
  p_flag text default null
)
returns setof public.product_card
language sql
stable
set search_path = ''
as $$
  select
    f.id, f.slug, f.name, f.category_id,
    f.price_min, f.price_max, f.compare_at_price, f.discount_percent,
    f.card_images, f.swatches, f.variant_count, f.default_variant_id,
    coalesce(f.new_until > now(), false) as is_new,
    f.is_bestseller, f.is_gift, f.on_sale,
    f.stock_total,
    (f.stock_total > 0 and f.stock_total <= f.low_threshold) as low_stock,
    (f.stock_total <= 0) as sold_out,
    f.rating_avg, f.rating_count,
    count(*) over () as total_count
  from private.catalog_matches(
    p_category, p_collection, p_search, p_min_price, p_max_price, p_colors,
    p_in_stock, p_on_sale, p_exclude, p_flag
  ) f
  order by
    (f.stock_total <= 0),
    case when p_sort = 'price_asc' then f.price_min end asc nulls last,
    case when p_sort = 'price_desc' then f.price_max end desc nulls last,
    case when p_sort = 'discount' then f.max_discount_percent end desc nulls last,
    case when p_sort = 'relevance' then f.relevance end desc nulls last,
    case when p_sort = 'newest' then f.published_at end desc nulls last,
    case when coalesce(p_sort, 'featured') not in ('price_asc', 'price_desc', 'discount', 'relevance', 'newest')
      then coalesce(f.featured_rank, 2147483647) end asc,
    case when coalesce(p_sort, 'featured') not in ('price_asc', 'price_desc', 'discount', 'relevance', 'newest')
      then f.is_featured end desc,
    f.published_at desc nulls last,
    f.id
  limit least(greatest(coalesce(p_limit, 24), 1), 48)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- Filter options for a listing: price range, colors, categories, counts.
create or replace function public.catalog_facets(
  p_category text default null,
  p_collection text default null,
  p_search text default null
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with m as (
    select * from private.catalog_matches(p_category => p_category, p_collection => p_collection, p_search => p_search)
  )
  select jsonb_build_object(
    'total', (select count(*) from m),
    'price_min', (select min(price_min) from m),
    'price_max', (select max(price_max) from m),
    'in_stock', (select count(*) from m where stock_total > 0),
    'on_sale', (select count(*) from m where on_sale),
    'colors', coalesce((
      select jsonb_agg(jsonb_build_object('value', x.value, 'hex', x.hex, 'count', x.cnt) order by x.cnt desc, x.value)
      from (
        select min(s ->> 'value') as value, min(s ->> 'hex') as hex, count(distinct m.id) as cnt
        from m, jsonb_array_elements(m.swatches) s
        group by lower(s ->> 'value')
      ) x
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('slug', x.slug, 'name', x.name, 'count', x.cnt) order by x.position)
      from (
        select main.slug, main.name, main.position, count(*) as cnt
        from m
        join public.categories c on c.id = m.category_id
        join public.categories main on main.id = coalesce(c.parent_id, c.id)
        group by main.slug, main.name, main.position
      ) x
    ), '[]'::jsonb)
  );
$$;

-- Search-as-you-type: up to 5 products and 3 categories.
create or replace function public.search_suggestions(p_query text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with term as (select nullif(btrim(coalesce(p_query, '')), '') as text)
  select case when (select text from term) is null or char_length((select text from term)) < 2
    then jsonb_build_object('products', '[]'::jsonb, 'categories', '[]'::jsonb)
    else jsonb_build_object(
      'products', coalesce((
        select jsonb_agg(jsonb_build_object(
          'slug', c.slug, 'name', c.name, 'price_min', c.price_min, 'price_max', c.price_max,
          'compare_at_price', c.compare_at_price, 'image', c.card_images -> 0, 'sold_out', c.sold_out
        ))
        from public.catalog_products(p_search => p_query, p_sort => 'relevance', p_limit => 5) c
      ), '[]'::jsonb),
      'categories', coalesce((
        select jsonb_agg(jsonb_build_object('slug', x.slug, 'name', x.name, 'parent_slug', x.parent_slug))
        from (
          select c.slug, c.name, parent.slug as parent_slug
          from public.categories c
          left join public.categories parent on parent.id = c.parent_id
          where c.is_active
            and (c.name ilike '%' || (select text from term) || '%'
                 or extensions.word_similarity(lower((select text from term)), lower(c.name)) >= 0.4)
          order by extensions.word_similarity(lower((select text from term)), lower(c.name)) desc, c.position
          limit 3
        ) x
      ), '[]'::jsonb)
    )
  end;
$$;

-- Everything the product page needs, in one call. Null when not on sale.
create or replace function public.get_product(p_slug text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'slug', p.slug,
    'name', p.name,
    'short_description', p.short_description,
    'description', p.description,
    'details_and_care', p.details_and_care,
    'seo_title', p.seo_title,
    'seo_description', p.seo_description,
    'is_new', coalesce(p.new_until > now(), false),
    'is_bestseller', p.is_bestseller,
    'is_gift', p.is_gift,
    'price_min', p.price_min,
    'price_max', p.price_max,
    'compare_at_price', p.compare_at_price,
    'discount_percent', p.discount_percent,
    'rating_avg', p.rating_avg,
    'rating_count', p.rating_count,
    'category', (
      select jsonb_build_object(
        'id', c.id, 'slug', c.slug, 'name', c.name,
        'parent', (select jsonb_build_object('slug', pc.slug, 'name', pc.name)
                   from public.categories pc where pc.id = c.parent_id)
      )
      from public.categories c where c.id = p.category_id
    ),
    'options', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'name', o.name, 'is_color', o.is_color, 'position', o.position,
        'values', coalesce((
          select jsonb_agg(jsonb_build_object('id', ov.id, 'value', ov.value, 'swatch_hex', ov.swatch_hex)
                           order by ov.position, ov.value)
          from public.product_option_values ov where ov.option_id = o.id
        ), '[]'::jsonb)
      ) order by o.position)
      from public.product_options o where o.product_id = p.id
    ), '[]'::jsonb),
    'variants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', v.id, 'sku', v.sku, 'title', v.title,
        'option_value_ids', to_jsonb(array_remove(array[v.option1, v.option2, v.option3], null)),
        'price', v.price, 'compare_at_price', v.compare_at_price,
        'stock', v.stock, 'low_stock_threshold', v.low_stock_threshold,
        'image_id', v.image_id
      ) order by v.position, v.price)
      from public.product_variants v where v.product_id = p.id and v.is_active
    ), '[]'::jsonb),
    'images', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'path', i.path, 'thumb', coalesce(i.thumb_path, i.path), 'alt', i.alt_text,
        'width', i.width, 'height', i.height, 'option_value_id', i.option_value_id
      ) order by i.position)
      from public.product_images i where i.product_id = p.id
    ), '[]'::jsonb)
  )
  from public.products p
  where p.slug = p_slug and p.status = 'active';
$$;

-- "You may also like": same main category first, then other in-stock picks.
create or replace function public.related_products(p_product_id uuid, p_limit integer default 4)
returns setof public.product_card
language sql
stable
set search_path = ''
as $$
  with me as (
    select coalesce(c.parent_id, c.id) as main_id
    from public.products p join public.categories c on c.id = p.category_id
    where p.id = p_product_id
  ),
  main_slug as (select c.slug from public.categories c where c.id = (select main_id from me)),
  same as (
    select * from public.catalog_products(
      p_category => (select slug from main_slug), p_exclude => p_product_id,
      p_in_stock => true, p_limit => p_limit
    )
  ),
  others as (
    select * from public.catalog_products(p_in_stock => true, p_exclude => p_product_id, p_limit => p_limit * 2)
    where id not in (select id from same)
  )
  select (x.card).* from (
    select s as card, 0 as grp from same s
    union all
    select o as card, 1 as grp from others o
  ) x
  order by x.grp
  limit least(greatest(coalesce(p_limit, 4), 1), 12);
$$;

-- Category or collection page header: name, intro, banners, sub-category chips.
create or replace function public.get_listing(p_kind text, p_slug text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case
    when p_kind = 'category' then (
      select jsonb_build_object(
        'kind', 'category', 'id', c.id, 'slug', c.slug, 'name', c.name, 'intro', c.intro,
        'description', c.description, 'card_image', c.card_image_path,
        'banner_desktop', c.banner_desktop_path, 'banner_mobile', c.banner_mobile_path,
        'seo_title', c.seo_title, 'seo_description', c.seo_description,
        'parent', (select jsonb_build_object('slug', pc.slug, 'name', pc.name)
                   from public.categories pc where pc.id = c.parent_id),
        'children', coalesce((
          select jsonb_agg(jsonb_build_object('slug', ch.slug, 'name', ch.name) order by ch.position, ch.name)
          from public.categories ch
          where ch.parent_id = coalesce(c.parent_id, c.id) and ch.is_active
        ), '[]'::jsonb)
      )
      from public.categories c where c.slug = p_slug and c.is_active
    )
    when p_kind = 'collection' then (
      select jsonb_build_object(
        'kind', 'collection', 'id', c.id, 'slug', c.slug, 'name', c.name, 'intro', c.intro,
        'description', c.description, 'card_image', c.card_image_path,
        'banner_desktop', c.banner_desktop_path, 'banner_mobile', c.banner_mobile_path,
        'seo_title', c.seo_title, 'seo_description', c.seo_description,
        'parent', null, 'children', '[]'::jsonb
      )
      from public.collections c where c.slug = p_slug and c.is_active
    )
  end;
$$;

-- Header menu: main categories with their sub-categories, and nav collections.
create or replace function public.storefront_nav()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', c.slug, 'name', c.name, 'card_image', c.card_image_path,
        'children', coalesce((
          select jsonb_agg(jsonb_build_object('slug', ch.slug, 'name', ch.name) order by ch.position, ch.name)
          from public.categories ch where ch.parent_id = c.id and ch.is_active
        ), '[]'::jsonb)
      ) order by c.position, c.name)
      from public.categories c
      where c.parent_id is null and c.is_active and c.show_in_nav
    ), '[]'::jsonb),
    'collections', coalesce((
      select jsonb_agg(jsonb_build_object('slug', c.slug, 'name', c.name) order by c.position)
      from public.collections c where c.is_active and c.show_in_nav
    ), '[]'::jsonb)
  );
$$;

-- Homepage data in one call: the six category cards (five categories plus
-- New arrivals) with item counts, the New arrivals row and Best sellers.
create or replace function public.home_feed()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with counts as (
    select coalesce(c.parent_id, c.id) as main_id, count(*) as cnt
    from public.products p
    join public.categories c on c.id = p.category_id
    where p.status = 'active' and p.price_min is not null
    group by 1
  )
  select jsonb_build_object(
    'categories', coalesce((
      select jsonb_agg(x.card order by x.ord)
      from (
        select c.position as ord, jsonb_build_object(
          'kind', 'category', 'slug', c.slug, 'name', c.name, 'image', c.card_image_path,
          'count', coalesce((select counts.cnt from counts where counts.main_id = c.id), 0)
        ) as card
        from public.categories c
        where c.parent_id is null and c.is_active and c.show_in_nav
        union all
        select 1000 + col.position, jsonb_build_object(
          'kind', 'collection', 'slug', col.slug, 'name', col.name, 'image', col.card_image_path,
          'count', (select count(*) from public.products p
                    where p.status = 'active' and p.price_min is not null and p.new_until > now())
        )
        from public.collections col
        where col.slug = 'new-arrivals' and col.is_active
      ) x
    ), '[]'::jsonb),
    'new_arrivals', coalesce((
      select jsonb_agg(to_jsonb(c))
      from public.catalog_products(p_collection => 'new-arrivals', p_sort => 'newest', p_limit => 8) c
    ), '[]'::jsonb),
    'bestsellers', coalesce((
      select jsonb_agg(to_jsonb(c))
      from public.catalog_products(p_flag => 'bestseller', p_limit => 8) c
    ), '[]'::jsonb),
    'has_reviews', exists (select 1 from public.reviews r where r.status = 'approved')
  );
$$;

-- ---------------------------------------------------------------------------
-- Pricing
-- ---------------------------------------------------------------------------
-- p_items: [{"variant_id": "<uuid>", "quantity": 2}, ...]
-- Returns lines (with status ok / limited / sold_out / unavailable), subtotal,
-- coupon result, discount, delivery and total.
create or replace function private.price_cart(
  p_items jsonb,
  p_coupon_code text default null,
  p_district text default null,
  p_area text default null,
  p_phone text default null,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_settings public.store_settings;
  v_lines jsonb := '[]'::jsonb;
  v_subtotal integer := 0;
  v_count integer := 0;
  v_issues boolean := false;
  r record;
  v_status text;
  v_qty integer;
  v_coupon public.coupons;
  v_coupon_code text := nullif(upper(btrim(coalesce(p_coupon_code, ''))), '');
  v_coupon_status text := 'none';
  v_coupon_message text := null;
  v_has_categories boolean := false;
  v_eligible integer := 0;
  v_discount integer := 0;
  v_uses integer;
  v_customer_uses integer;
  v_phone text := public.normalize_bd_phone(p_phone);
  v_zone public.shipping_zones;
  v_fee integer := null;
  v_base_fee integer := null;
  v_free boolean := false;
  v_threshold integer;
begin
  select * into v_settings from public.store_settings s where s.id = 1;
  v_threshold := v_settings.free_delivery_threshold;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception using message = 'Your cart is empty.', detail = 'DC_EMPTY_CART';
  end if;

  begin
    for r in
      with req as (
        select (e ->> 'variant_id')::uuid as variant_id,
               sum(greatest(coalesce((e ->> 'quantity')::integer, 0), 0))::integer as qty,
               min(t.ord) as ord
        from jsonb_array_elements(p_items) with ordinality as t(e, ord)
        group by 1
      )
      select
        req.variant_id, req.qty, req.ord,
        v.id as vid, v.sku, v.title, v.price, v.compare_at_price, v.stock, v.is_active as v_active,
        p.id as product_id, p.name, p.slug, p.status as p_status, p.category_id,
        c.parent_id as category_parent,
        coalesce(img.thumb_path, img.path, p.card_images -> 0 ->> 'thumb') as image
      from req
      left join public.product_variants v on v.id = req.variant_id
      left join public.products p on p.id = v.product_id
      left join public.categories c on c.id = p.category_id
      left join public.product_images img on img.id = v.image_id
      order by req.ord
    loop
      if r.qty <= 0 then
        continue;
      end if;
      if r.vid is null or r.p_status is distinct from 'active' or not r.v_active then
        v_status := 'unavailable'; v_qty := 0;
      elsif r.stock <= 0 then
        v_status := 'sold_out'; v_qty := 0;
      elsif r.qty > least(r.stock, v_settings.max_quantity_per_item) then
        v_status := 'limited'; v_qty := least(r.stock, v_settings.max_quantity_per_item);
      else
        v_status := 'ok'; v_qty := r.qty;
      end if;
      if v_status <> 'ok' then
        v_issues := true;
      end if;

      v_subtotal := v_subtotal + v_qty * coalesce(r.price, 0);
      v_count := v_count + v_qty;
      v_lines := v_lines || jsonb_build_array(jsonb_build_object(
        'variant_id', r.variant_id,
        'product_id', r.product_id,
        'category_id', r.category_id,
        'category_parent_id', r.category_parent,
        'product_name', r.name,
        'product_slug', r.slug,
        'variant_title', coalesce(r.title, 'Default'),
        'sku', r.sku,
        'image', r.image,
        'unit_price', r.price,
        'compare_at_price', case when r.compare_at_price > r.price then r.compare_at_price end,
        'requested_quantity', r.qty,
        'quantity', v_qty,
        'max_quantity', case when r.stock is null then 0 else least(r.stock, v_settings.max_quantity_per_item) end,
        'stock', r.stock,
        'line_total', v_qty * coalesce(r.price, 0),
        'status', v_status
      ));
    end loop;
  exception
    when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value then
      raise exception using message = 'Your cart has an item we couldn''t read. Please refresh the page.',
        detail = 'DC_INVALID_CART';
  end;

  -- Coupon
  if v_coupon_code is not null then
    select * into v_coupon from public.coupons c where c.code = v_coupon_code;
    if not found or not v_coupon.is_active
       or (v_coupon.starts_at is not null and v_coupon.starts_at > now())
       or (v_coupon.expires_at is not null and v_coupon.expires_at <= now()) then
      v_coupon_status := 'invalid';
    else
      select count(*) into v_uses
      from public.coupon_redemptions cr
      where cr.coupon_id = v_coupon.id and cr.released_at is null;
      if v_coupon.usage_limit is not null and v_uses >= v_coupon.usage_limit then
        v_coupon_status := 'invalid';
      end if;
    end if;

    if v_coupon_status = 'none' then
      select exists (select 1 from public.coupon_categories cc where cc.coupon_id = v_coupon.id)
      into v_has_categories;

      select coalesce(sum((l ->> 'line_total')::integer), 0) into v_eligible
      from jsonb_array_elements(v_lines) l
      where (l ->> 'quantity')::integer > 0
        and (
          not v_has_categories
          or exists (
            select 1 from public.coupon_categories cc
            where cc.coupon_id = v_coupon.id
              and (cc.category_id = (l ->> 'category_id')::uuid
                   or cc.category_id = (l ->> 'category_parent_id')::uuid)
          )
        );

      if v_customer_uses is null and (v_phone is not null or p_user_id is not null) then
        select count(*) into v_customer_uses
        from public.coupon_redemptions cr
        where cr.coupon_id = v_coupon.id and cr.released_at is null
          and ((v_phone is not null and cr.phone = v_phone)
               or (p_user_id is not null and cr.user_id = p_user_id));
      end if;

      if v_eligible = 0 then
        v_coupon_status := 'not_eligible';
        v_coupon_message := 'This code doesn''t apply to the items in your cart.';
      elsif v_subtotal < v_coupon.min_subtotal then
        v_coupon_status := 'min_not_met';
        v_coupon_message := 'Add ' || private.format_taka(v_coupon.min_subtotal - v_subtotal)
          || ' more to use this code.';
      elsif v_coupon.per_customer_limit is not null and coalesce(v_customer_uses, 0) >= v_coupon.per_customer_limit then
        v_coupon_status := 'used';
        v_coupon_message := 'You''ve already used this code.';
      else
        v_coupon_status := 'applied';
        if v_coupon.type = 'percent' then
          v_discount := round(v_eligible * v_coupon.value / 100.0)::integer;
        else
          v_discount := v_coupon.value;
        end if;
        if v_coupon.max_discount is not null then
          v_discount := least(v_discount, v_coupon.max_discount);
        end if;
        v_discount := least(v_discount, v_eligible);
      end if;
    end if;

    if v_coupon_status = 'invalid' then
      v_coupon_message := 'That code isn''t valid or has expired.';
    end if;
  end if;

  -- Delivery
  if nullif(btrim(coalesce(p_district, '')), '') is not null then
    v_zone := public.shipping_zone_for(p_district, p_area);
    v_base_fee := v_zone.fee;
    v_fee := v_zone.fee;
    if v_threshold is not null and v_subtotal > 0 and v_subtotal - v_discount >= v_threshold then
      v_fee := 0;
      v_free := true;
    end if;
  end if;

  return jsonb_build_object(
    'lines', v_lines,
    'item_count', v_count,
    'has_issues', v_issues,
    'subtotal', v_subtotal,
    'coupon', case when v_coupon_code is null then null else jsonb_build_object(
      'code', v_coupon_code,
      'status', v_coupon_status,
      'message', v_coupon_message,
      'discount', v_discount,
      'id', case when v_coupon_status = 'applied' then v_coupon.id end
    ) end,
    'discount', v_discount,
    'delivery', jsonb_build_object(
      'known', v_zone.id is not null,
      'zone_id', v_zone.id,
      'zone_name', v_zone.name,
      'fee', v_fee,
      'base_fee', v_base_fee,
      'min_days', v_zone.min_days,
      'max_days', v_zone.max_days,
      'free_applied', v_free,
      'free_threshold', v_threshold,
      'amount_to_free', case when v_threshold is null then null
        else greatest(v_threshold - (v_subtotal - v_discount), 0) end
    ),
    'zones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', z.name, 'fee', z.fee, 'min_days', z.min_days, 'max_days', z.max_days, 'is_default', z.is_default
      ) order by z.position)
      from public.shipping_zones z where z.is_active
    ), '[]'::jsonb),
    'total', v_subtotal - v_discount + coalesce(v_fee, 0)
  );
end;
$$;

-- Cart / checkout preview. Read-only. Failed coupon tries are rate limited.
create or replace function public.quote_cart(
  p_items jsonb,
  p_coupon_code text default null,
  p_district text default null,
  p_area text default null,
  p_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text := private.request_key();
  v_quote jsonb;
begin
  if nullif(btrim(coalesce(p_coupon_code, '')), '') is not null
     and private.rate_limited('coupon_fail', v_key, 30, interval '1 hour') then
    v_quote := private.price_cart(p_items, null, p_district, p_area, p_phone, (select auth.uid()));
    return v_quote || jsonb_build_object('coupon', jsonb_build_object(
      'code', upper(btrim(p_coupon_code)), 'status', 'rate_limited', 'discount', 0,
      'message', 'Too many codes tried. Please wait a while and try again.'
    ));
  end if;

  v_quote := private.price_cart(p_items, p_coupon_code, p_district, p_area, p_phone, (select auth.uid()));
  if v_quote -> 'coupon' ->> 'status' = 'invalid' then
    perform private.record_hit('coupon_fail', v_key);
  end if;
  return v_quote;
end;
$$;

-- Same as quote_cart for the signed-in cart (no need to send the items).
create or replace function public.quote_my_cart(
  p_coupon_code text default null,
  p_district text default null,
  p_area text default null,
  p_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_items jsonb;
begin
  if (select auth.uid()) is null then
    raise exception using message = 'Please sign in first.', detail = 'DC_AUTH_REQUIRED';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('variant_id', c.variant_id, 'quantity', c.quantity)
                            order by c.created_at), '[]'::jsonb)
  into v_items
  from public.cart_items c where c.user_id = (select auth.uid());
  return public.quote_cart(v_items, p_coupon_code, p_district, p_area, p_phone);
end;
$$;

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
-- Customer-facing view of an order: status timeline with a time per step,
-- items (with review state once delivered), totals and delivery window.
-- p_full_address = false hides the street address (used by Track order).
create or replace function private.order_public_json(p_order_id uuid, p_full_address boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with o as (select * from public.orders where id = p_order_id),
  steps as (
    select s.status, s.ord
    from unnest(array['placed', 'confirmed', 'packed', 'handed_to_courier', 'out_for_delivery', 'delivered']::public.order_status[])
      with ordinality as s(status, ord)
  ),
  reached as (
    select h.status, min(h.created_at) as at
    from public.order_status_history h
    where h.order_id = p_order_id
    group by h.status
  ),
  last_normal as (
    select coalesce(max(st.ord), 1) as ord
    from steps st
    join reached r on r.status = st.status
  ),
  current_ord as (
    select case when o.status in ('cancelled', 'returned') then (select ord from last_normal)
                else (select st.ord from steps st where st.status = o.status) end as ord
    from o
  )
  select jsonb_build_object(
    'order_number', o.order_number,
    'status', o.status,
    'status_label', public.order_status_label(o.status),
    'placed_at', o.created_at,
    'customer', jsonb_build_object(
      'name', case when p_full_address then o.customer_name else split_part(o.customer_name, ' ', 1) end,
      'phone', case when p_full_address then o.phone
                    else substr(o.phone, 1, 3) || '••••' || substr(o.phone, 8, 4) end,
      'email', case when p_full_address then o.email end,
      'division', o.division,
      'district', o.district,
      'area', o.area,
      'address_line', case when p_full_address then o.address_line end,
      'delivery_note', case when p_full_address then o.delivery_note end
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', oi.id,
        'product_name', oi.product_name,
        'product_slug', oi.product_slug,
        'variant_id', oi.variant_id,
        'variant_title', oi.variant_title,
        'sku', oi.sku,
        'image', oi.image_path,
        'unit_price', oi.unit_price,
        'compare_at_price', oi.compare_at_price,
        'quantity', oi.quantity,
        'line_total', oi.line_total,
        'review_status', (select rv.status from public.reviews rv where rv.order_item_id = oi.id),
        'can_review', o.status = 'delivered' and oi.product_id is not null
                      and not exists (select 1 from public.reviews rv where rv.order_item_id = oi.id)
      ) order by oi.product_name)
      from public.order_items oi where oi.order_id = o.id
    ), '[]'::jsonb),
    'subtotal', o.subtotal,
    'discount', o.discount,
    'coupon_code', o.coupon_code,
    'delivery_fee', o.delivery_fee,
    'total', o.total,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'delivery', jsonb_build_object(
      'zone_name', o.shipping_zone_name,
      'min_days', o.delivery_min_days,
      'max_days', o.delivery_max_days,
      'expected_from', (o.created_at at time zone 'Asia/Dhaka')::date + o.delivery_min_days,
      'expected_to', (o.created_at at time zone 'Asia/Dhaka')::date + o.delivery_max_days
    ),
    'courier', case when o.courier_name is null and o.tracking_url is null then null
      else jsonb_build_object('name', o.courier_name, 'tracking_url', o.tracking_url, 'tracking_code', o.tracking_code) end,
    'timeline', (
      select jsonb_agg(jsonb_build_object(
        'status', st.status,
        'label', public.order_status_label(st.status),
        'done', st.ord <= (select ord from current_ord),
        'current', o.status = st.status,
        'at', (select r.at from reached r where r.status = st.status)
      ) order by st.ord)
      from steps st
    ),
    'closed', case when o.status in ('cancelled', 'returned') then jsonb_build_object(
      'status', o.status,
      'label', public.order_status_label(o.status),
      'at', (select r.at from reached r where r.status = o.status),
      'note', (select h.note from public.order_status_history h
               where h.order_id = o.id and h.status = o.status order by h.created_at desc limit 1)
    ) end
  )
  from o;
$$;

-- Places a Cash on Delivery order. Guests and signed-in customers alike.
--   p_items: [{"variant_id": "<uuid>", "quantity": 1}, ...]
--   p_customer: {"name", "phone", "email"?, "division", "district", "area",
--                "address_line", "delivery_note"?}
--   p_expected_total: the total the shopper saw; if the server total differs,
--     the order is not placed (DC_PRICE_CHANGED, fresh quote in HINT).
-- Stock is checked and taken inside this transaction with row locks taken in
-- a fixed order, so the last item can never be sold twice.
create or replace function public.place_order(
  p_items jsonb,
  p_customer jsonb,
  p_coupon_code text default null,
  p_expected_total integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.store_settings;
  v_user uuid := (select auth.uid());
  v_name text := left(btrim(coalesce(p_customer ->> 'name', '')), 120);
  v_phone text := public.normalize_bd_phone(p_customer ->> 'phone');
  v_email text := nullif(lower(btrim(coalesce(p_customer ->> 'email', ''))), '');
  v_division text := btrim(coalesce(p_customer ->> 'division', ''));
  v_district text := btrim(coalesce(p_customer ->> 'district', ''));
  v_area text := btrim(coalesce(p_customer ->> 'area', ''));
  v_address text := btrim(coalesce(p_customer ->> 'address_line', ''));
  v_note text := left(btrim(coalesce(p_customer ->> 'delivery_note', '')), 300);
  v_variant_ids uuid[];
  v_line_count integer;
  v_open integer;
  v_quote jsonb;
  v_bad jsonb;
  v_order_id uuid;
  v_order_number text;
  v_line jsonb;
  v_zone_id uuid;
  v_coupon_id uuid;
begin
  select * into v_settings from public.store_settings s where s.id = 1;

  -- 1. Delivery details
  if v_name = '' then
    raise exception using message = 'Enter your full name.', detail = 'DC_MISSING_NAME';
  end if;
  if v_phone is null then
    raise exception using message = 'Enter an 11-digit mobile number, like 01712345678.', detail = 'DC_INVALID_PHONE';
  end if;
  if v_email is not null and (v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or char_length(v_email) > 254) then
    raise exception using message = 'Enter an email address, like name@example.com, or leave it empty.',
      detail = 'DC_INVALID_EMAIL';
  end if;
  if not exists (
    select 1 from public.geo_areas g
    where g.division = v_division and g.district = v_district and g.area = v_area
  ) then
    raise exception using message = 'Choose your division, district and area from the lists.', detail = 'DC_INVALID_AREA';
  end if;
  if v_address = '' then
    raise exception using message = 'Enter your house, road and area details.', detail = 'DC_MISSING_ADDRESS';
  end if;
  if char_length(v_address) > 300 then
    raise exception using message = 'Please keep the address under 300 characters.', detail = 'DC_TOO_LONG';
  end if;

  -- 2. Items
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using message = 'Your cart is empty.', detail = 'DC_EMPTY_CART';
  end if;
  begin
    select array_agg(distinct (e ->> 'variant_id')::uuid), count(distinct e ->> 'variant_id')
    into v_variant_ids, v_line_count
    from jsonb_array_elements(p_items) e;
  exception when invalid_text_representation then
    raise exception using message = 'Your cart has an item we couldn''t read. Please refresh the page.',
      detail = 'DC_INVALID_CART';
  end;
  if v_line_count > v_settings.max_items_per_order then
    raise exception using message = format('You can order up to %s different items at once.', v_settings.max_items_per_order),
      detail = 'DC_TOO_MANY_ITEMS';
  end if;
  if exists (
    select 1 from (
      select sum((e ->> 'quantity')::integer) as q
      from jsonb_array_elements(p_items) e group by e ->> 'variant_id'
    ) x where x.q is null or x.q < 1 or x.q > v_settings.max_quantity_per_item
  ) then
    raise exception using message = format('You can order between 1 and %s of each item.', v_settings.max_quantity_per_item),
      detail = 'DC_QUANTITY_LIMIT';
  end if;

  -- 3. Abuse limits: per connection, and open orders per phone number. The
  --    advisory lock makes two orders from one number wait for each other.
  perform private.hit_rate_limit('order', private.request_key(), 10, interval '10 minutes');
  perform pg_advisory_xact_lock(hashtextextended('dc_order_phone:' || v_phone, 0));
  select count(*) into v_open
  from public.orders o
  where o.phone = v_phone and o.status in ('placed', 'confirmed');
  if v_open >= v_settings.max_open_orders_per_phone then
    raise exception using
      message = format('This number already has %s open orders. We''ll call to confirm them first, or contact us if you need help.', v_open),
      detail = 'DC_TOO_MANY_OPEN_ORDERS';
  end if;

  -- 4. Locks, always in the same order (products, then variants, then coupon)
  --    so concurrent orders and admin changes can't deadlock.
  perform 1 from public.products p
  where p.id in (select v.product_id from public.product_variants v where v.id = any (v_variant_ids))
  order by p.id
  for share;
  perform 1 from public.product_variants v
  where v.id = any (v_variant_ids)
  order by v.id
  for update;
  if nullif(btrim(coalesce(p_coupon_code, '')), '') is not null then
    perform 1 from public.coupons c where c.code = upper(btrim(p_coupon_code)) for update;
  end if;

  -- 5. Price everything from the database
  v_quote := private.price_cart(p_items, p_coupon_code, v_district, v_area, v_phone, v_user);

  select jsonb_agg(l) into v_bad
  from jsonb_array_elements(v_quote -> 'lines') l
  where l ->> 'status' <> 'ok';
  if v_bad is not null then
    raise exception using
      message = 'Some items just sold out or changed. We''ve updated your cart, please check it.',
      detail = 'DC_ITEMS_UNAVAILABLE',
      hint = v_bad::text;
  end if;
  if (v_quote ->> 'item_count')::integer = 0 then
    raise exception using message = 'Your cart is empty.', detail = 'DC_EMPTY_CART';
  end if;
  if v_quote -> 'coupon' is not null and v_quote -> 'coupon' <> 'null'::jsonb
     and v_quote -> 'coupon' ->> 'status' <> 'applied' then
    raise exception using
      message = coalesce(v_quote -> 'coupon' ->> 'message', 'That code isn''t valid or has expired.'),
      detail = 'DC_COUPON_INVALID';
  end if;
  if p_expected_total is not null and p_expected_total <> (v_quote ->> 'total')::integer then
    raise exception using
      message = 'Prices changed since you opened checkout. Please check your order and place it again.',
      detail = 'DC_PRICE_CHANGED',
      hint = v_quote::text;
  end if;

  -- 6. Create the order
  v_order_number := 'DC-' || nextval('private.order_number_seq');
  v_zone_id := (v_quote -> 'delivery' ->> 'zone_id')::uuid;
  v_coupon_id := (v_quote -> 'coupon' ->> 'id')::uuid;

  insert into public.orders (
    order_number, user_id, customer_name, phone, email,
    division, district, area, address_line, delivery_note,
    shipping_zone_id, shipping_zone_name, delivery_min_days, delivery_max_days,
    subtotal, discount, delivery_fee, total, coupon_id, coupon_code
  ) values (
    v_order_number, v_user, v_name, v_phone, v_email,
    v_division, v_district, v_area, v_address, v_note,
    v_zone_id,
    v_quote -> 'delivery' ->> 'zone_name',
    (v_quote -> 'delivery' ->> 'min_days')::integer,
    (v_quote -> 'delivery' ->> 'max_days')::integer,
    (v_quote ->> 'subtotal')::integer,
    (v_quote ->> 'discount')::integer,
    (v_quote -> 'delivery' ->> 'fee')::integer,
    (v_quote ->> 'total')::integer,
    v_coupon_id,
    case when v_coupon_id is not null then v_quote -> 'coupon' ->> 'code' end
  )
  returning id into v_order_id;

  perform set_config('dc.stock_reason', 'order', true);
  perform set_config('dc.stock_order_id', v_order_id::text, true);

  for v_line in
    select l from jsonb_array_elements(v_quote -> 'lines') l
    order by (l ->> 'variant_id')
  loop
    insert into public.order_items (
      order_id, product_id, variant_id, category_id, product_name, product_slug,
      variant_title, sku, image_path, unit_price, compare_at_price, quantity, line_total
    ) values (
      v_order_id,
      (v_line ->> 'product_id')::uuid,
      (v_line ->> 'variant_id')::uuid,
      (v_line ->> 'category_id')::uuid,
      v_line ->> 'product_name',
      v_line ->> 'product_slug',
      v_line ->> 'variant_title',
      v_line ->> 'sku',
      v_line ->> 'image',
      (v_line ->> 'unit_price')::integer,
      (v_line ->> 'compare_at_price')::integer,
      (v_line ->> 'quantity')::integer,
      (v_line ->> 'line_total')::integer
    );
    update public.product_variants v
    set stock = v.stock - (v_line ->> 'quantity')::integer
    where v.id = (v_line ->> 'variant_id')::uuid;
  end loop;

  perform set_config('dc.stock_reason', '', true);
  perform set_config('dc.stock_order_id', '', true);

  insert into public.order_status_history (order_id, status, actor_id)
  values (v_order_id, 'placed', v_user);

  if v_coupon_id is not null then
    insert into public.coupon_redemptions (coupon_id, order_id, user_id, phone, discount)
    values (v_coupon_id, v_order_id, v_user, v_phone, (v_quote ->> 'discount')::integer);
  end if;

  -- Signed in: empty the ordered lines from the saved cart and fill in an empty profile.
  if v_user is not null then
    delete from public.cart_items c where c.user_id = v_user and c.variant_id = any (v_variant_ids);
    update public.profiles pr
    set full_name = case when pr.full_name = '' then v_name else pr.full_name end,
        phone = coalesce(pr.phone, v_phone)
    where pr.id = v_user;
  end if;

  return private.order_public_json(v_order_id, true);
end;
$$;

-- Track order: order number + the phone number used. Returns null when there
-- is no match (the page shows "We couldn't find that order...").
-- The street address is never returned here.
create or replace function public.track_order(p_order_number text, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_number text := private.normalize_order_number(p_order_number);
  v_phone text := public.normalize_bd_phone(p_phone);
  v_id uuid;
begin
  perform private.hit_rate_limit('track', private.request_key(), 20, interval '10 minutes');
  if v_number is null or v_phone is null then
    return null;
  end if;
  select o.id into v_id from public.orders o where o.order_number = v_number and o.phone = v_phone;
  if v_id is null then
    return null;
  end if;
  return private.order_public_json(v_id, false);
end;
$$;

-- A signed-in customer's own order, with the full address.
create or replace function public.my_order(p_order_number text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if (select auth.uid()) is null then
    return null;
  end if;
  select o.id into v_id
  from public.orders o
  where o.order_number = private.normalize_order_number(p_order_number)
    and o.user_id = (select auth.uid());
  if v_id is null then
    return null;
  end if;
  return private.order_public_json(v_id, true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
-- A buyer reviews one line of a delivered order. Signed-in buyers need only the
-- order line; guests also give the order number and phone. Reviews wait for
-- admin approval.
create or replace function public.submit_review(
  p_order_item_id uuid,
  p_rating integer,
  p_body text,
  p_title text default null,
  p_display_name text default null,
  p_order_number text default null,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_item public.order_items;
  v_order public.orders;
  v_name text;
  v_id uuid;
begin
  perform private.hit_rate_limit('review', private.request_key(), 10, interval '1 hour');

  select * into v_item from public.order_items oi where oi.id = p_order_item_id;
  if not found then
    raise exception using message = 'We couldn''t find that item in your orders.', detail = 'DC_NOT_FOUND';
  end if;
  select * into v_order from public.orders o where o.id = v_item.order_id;

  if not (
    (v_user is not null and v_order.user_id = v_user)
    or (v_order.order_number = private.normalize_order_number(p_order_number)
        and v_order.phone = public.normalize_bd_phone(p_phone))
  ) then
    raise exception using message = 'We couldn''t find that item in your orders.', detail = 'DC_NOT_FOUND';
  end if;
  if v_order.status <> 'delivered' then
    raise exception using message = 'You can review this once your order has been delivered.', detail = 'DC_NOT_DELIVERED';
  end if;
  if v_item.product_id is null then
    raise exception using message = 'This product is no longer in the shop, so it can''t be reviewed.', detail = 'DC_PRODUCT_GONE';
  end if;
  if exists (select 1 from public.reviews r where r.order_item_id = v_item.id) then
    raise exception using message = 'You''ve already reviewed this item. Thank you!', detail = 'DC_ALREADY_REVIEWED';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception using message = 'Choose a rating from 1 to 5 stars.', detail = 'DC_INVALID_RATING';
  end if;
  if coalesce(btrim(p_body), '') = '' then
    raise exception using message = 'Tell us a little about it.', detail = 'DC_MISSING_BODY';
  end if;
  if char_length(p_body) > 2000 or char_length(coalesce(p_title, '')) > 120 then
    raise exception using message = 'Please keep the review shorter.', detail = 'DC_TOO_LONG';
  end if;

  -- First name only, shown with the review.
  v_name := left(split_part(btrim(coalesce(nullif(btrim(p_display_name), ''), v_order.customer_name)), ' ', 1), 30);

  insert into public.reviews (product_id, order_id, order_item_id, user_id, reviewer_name, rating, title, body)
  values (
    v_item.product_id, v_order.id, v_item.id, v_order.user_id,
    coalesce(nullif(v_name, ''), 'Customer'), p_rating,
    nullif(btrim(coalesce(p_title, '')), ''), btrim(p_body)
  )
  returning id into v_id;
  return v_id;
end;
$$;
