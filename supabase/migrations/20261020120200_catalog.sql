-- Dear Corner — catalog
--
-- categories (two levels: main categories + sub-categories for the chips)
-- collections (manual or rule-based: New arrivals, Gifts under ৳999, ...)
-- products -> product_options (Color, Size, up to 3) -> product_option_values
-- product_variants: one row per option combination, each with its own SKU,
--   price, compare-at price, stock and image. Every product has at least one
--   variant; a simple product has a single "Default" variant.
-- product_images: ordered gallery; an image can belong to a color value so the
--   gallery swaps when a color is chosen.
-- inventory_movements: every stock change, with the reason.
--
-- Products are never hard-deleted once they have orders: archive them
-- (status = 'archived'). Order lines keep their own snapshot.
--
-- The products table carries a summary (price range, sale, swatches, first two
-- images, rating) kept up to date by triggers, so product lists read one row
-- per product. Stock-dependent flags (sold out, low stock) are computed at
-- query time from the variants, so placing an order never writes to products.

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  intro text not null default '' check (char_length(intro) <= 200),
  description text not null default '' check (char_length(description) <= 2000),
  card_image_path text,
  banner_desktop_path text,
  banner_mobile_path text,
  position integer not null default 0,
  is_active boolean not null default true,
  show_in_nav boolean not null default true,
  seo_title text check (seo_title is null or char_length(seo_title) <= 70),
  seo_description text check (seo_description is null or char_length(seo_description) <= 170),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.categories enable row level security;
create index categories_parent_idx on public.categories (parent_id, position);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function private.set_updated_at();

-- Only two levels: a sub-category's parent must be a main category.
create or replace function private.categories_check_depth()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'A category cannot be its own parent';
    end if;
    if exists (select 1 from public.categories c where c.id = new.parent_id and c.parent_id is not null) then
      raise exception 'Sub-categories can only sit under a main category';
    end if;
    if exists (select 1 from public.categories c where c.parent_id = new.id) then
      raise exception 'A category with sub-categories cannot become a sub-category';
    end if;
  end if;
  return new;
end;
$$;
create trigger categories_check_depth
  before insert or update of parent_id on public.categories
  for each row execute function private.categories_check_depth();

create policy "Anyone can read active categories"
  on public.categories for select
  using (is_active or (select public.is_admin()));
create policy "Admins can manage categories"
  on public.categories for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

insert into public.categories (name, slug, intro, position) values
  ('Room decor', 'room-decor', 'Small pieces that make a room feel like yours.', 1),
  ('Lighting', 'lighting', 'Warm light for late-night study and slow evenings.', 2),
  ('Desk and stationery', 'desk-and-stationery', 'Desk picks and paper goods for days at the desk.', 3),
  ('Accessories', 'accessories', 'Everyday little things, chosen to carry well.', 4),
  ('Gifts', 'gifts', 'Thoughtful little gifts, ready to give.', 5);

-- ---------------------------------------------------------------------------
-- Collections
-- ---------------------------------------------------------------------------
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  intro text not null default '' check (char_length(intro) <= 200),
  description text not null default '' check (char_length(description) <= 2000),
  -- manual: products picked in product_collections. new_arrivals: products
  -- still marked new. max_price: lowest price <= rule_value. on_sale, bestsellers,
  -- gifts: products with that flag.
  rule public.collection_rule not null default 'manual',
  rule_value integer check (rule_value is null or rule_value >= 0),
  card_image_path text,
  banner_desktop_path text,
  banner_mobile_path text,
  position integer not null default 0,
  is_active boolean not null default true,
  show_in_nav boolean not null default false,
  seo_title text check (seo_title is null or char_length(seo_title) <= 70),
  seo_description text check (seo_description is null or char_length(seo_description) <= 170),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (rule <> 'max_price' or rule_value is not null)
);
alter table public.collections enable row level security;

create trigger collections_set_updated_at
  before update on public.collections
  for each row execute function private.set_updated_at();

create policy "Anyone can read active collections"
  on public.collections for select
  using (is_active or (select public.is_admin()));
create policy "Admins can manage collections"
  on public.collections for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

insert into public.collections (name, slug, intro, rule, rule_value, position, show_in_nav) values
  ('New arrivals', 'new-arrivals', 'Just in: the newest little things for your corner.', 'new_arrivals', null, 1, true),
  ('Gifts under ৳999', 'gifts-under-999', 'Little gifts that feel considered, all under ৳999.', 'max_price', 999, 2, false);

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description text not null default '' check (char_length(short_description) <= 300),
  description text not null default '' check (char_length(description) <= 10000),
  details_and_care text not null default '' check (char_length(details_and_care) <= 5000),
  status public.product_status not null default 'draft',
  is_featured boolean not null default false,
  featured_rank integer,
  is_bestseller boolean not null default false,
  is_gift boolean not null default false,
  -- Shows the "New" badge and puts the product in New arrivals until this time.
  new_until timestamptz,
  published_at timestamptz,
  seo_title text check (seo_title is null or char_length(seo_title) <= 70),
  seo_description text check (seo_description is null or char_length(seo_description) <= 170),
  is_sample boolean not null default false,

  -- Summary, maintained by triggers (do not edit by hand).
  price_min integer,
  price_max integer,
  compare_at_price integer,          -- of the cheapest variant, when on sale
  discount_percent integer not null default 0,   -- of the cheapest variant
  max_discount_percent integer not null default 0,
  on_sale boolean not null default false,
  variant_count integer not null default 0,
  default_variant_id uuid,           -- set when there is exactly one variant
  colors text[] not null default '{}',
  swatches jsonb not null default '[]'::jsonb,
  card_images jsonb not null default '[]'::jsonb,
  rating_avg numeric(3, 2),
  rating_count integer not null default 0,

  search_vector tsvector generated always as (
    setweight(to_tsvector('english'::regconfig, coalesce(name, '')), 'A')
    || setweight(to_tsvector('english'::regconfig, coalesce(short_description, '')), 'B')
  ) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;

create index products_status_category_idx on public.products (status, category_id);
create index products_status_published_idx on public.products (status, published_at desc);
create index products_search_idx on public.products using gin (search_vector);
create index products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);
create index products_colors_idx on public.products using gin (colors);
create index products_sample_idx on public.products (is_sample) where is_sample;

create trigger products_set_updated_at
  before update on public.products
  for each row execute function private.set_updated_at();

-- Slug from the name when missing; first publish sets published_at and, if not
-- set, keeps the product "new" for 30 days.
create or replace function private.products_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := private.slugify(new.name);
  end if;
  if new.status = 'active' and new.published_at is null then
    new.published_at := now();
    if new.new_until is null then
      new.new_until := now() + interval '30 days';
    end if;
  end if;
  return new;
end;
$$;
create trigger products_before_write
  before insert or update on public.products
  for each row execute function private.products_before_write();

create policy "Anyone can read active products"
  on public.products for select
  using (status = 'active' or (select public.is_admin()));
create policy "Admins can manage products"
  on public.products for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Options and values
-- ---------------------------------------------------------------------------
create table public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  is_color boolean not null default false,
  position smallint not null check (position between 1 and 3),
  created_at timestamptz not null default now(),
  unique (product_id, position) deferrable initially deferred
);
alter table public.product_options enable row level security;
create unique index product_options_name_idx on public.product_options (product_id, lower(name));

create table public.product_option_values (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.product_options (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  value text not null check (char_length(value) between 1 and 40),
  swatch_hex text check (swatch_hex is null or swatch_hex ~ '^#[0-9A-Fa-f]{6}$'),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.product_option_values enable row level security;
create unique index product_option_values_value_idx on public.product_option_values (option_id, lower(value));
create index product_option_values_product_idx on public.product_option_values (product_id);

-- Keep product_id in step with the option.
create or replace function private.option_values_set_product()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select o.product_id into new.product_id from public.product_options o where o.id = new.option_id;
  if new.product_id is null then
    raise exception 'Unknown product option';
  end if;
  return new;
end;
$$;
create trigger product_option_values_set_product
  before insert or update of option_id on public.product_option_values
  for each row execute function private.option_values_set_product();

-- ---------------------------------------------------------------------------
-- Images
-- ---------------------------------------------------------------------------
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  -- Storage path in the product-images bucket (e.g. "products/<id>/<uuid>.webp"),
  -- or a site path starting with "/" for images shipped with the website.
  path text not null check (char_length(path) between 1 and 300),
  thumb_path text check (thumb_path is null or char_length(thumb_path) <= 300),
  alt_text text not null default '' check (char_length(alt_text) <= 200),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  position integer not null default 0,
  -- When set, this image belongs to a color value (gallery swap).
  option_value_id uuid references public.product_option_values (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (product_id, position) deferrable initially deferred
);
alter table public.product_images enable row level security;
create index product_images_value_idx on public.product_images (option_value_id) where option_value_id is not null;

-- ---------------------------------------------------------------------------
-- Variants (one per SKU)
-- ---------------------------------------------------------------------------
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null unique check (sku ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$'),
  option1 uuid references public.product_option_values (id) on delete restrict,
  option2 uuid references public.product_option_values (id) on delete restrict,
  option3 uuid references public.product_option_values (id) on delete restrict,
  title text not null default 'Default',
  price integer not null check (price > 0),
  compare_at_price integer check (compare_at_price is null or compare_at_price > price),
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  image_id uuid references public.product_images (id) on delete set null,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (product_id, option1, option2, option3)
);
alter table public.product_variants enable row level security;
create index product_variants_product_idx on public.product_variants (product_id, position);
create index product_variants_low_stock_idx on public.product_variants (stock) where is_active;

create trigger product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function private.set_updated_at();

-- Each option value must belong to this product's option at that position;
-- the title is the values joined with " / " ("Sage / Large"), or "Default".
create or replace function private.variants_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_slot integer;
  v_value uuid;
  v_ok boolean;
  v_title text;
begin
  for v_slot in 1..3 loop
    v_value := case v_slot when 1 then new.option1 when 2 then new.option2 else new.option3 end;
    if v_value is not null then
      select exists (
        select 1
        from public.product_option_values ov
        join public.product_options o on o.id = ov.option_id
        where ov.id = v_value and o.product_id = new.product_id and o.position = v_slot
      ) into v_ok;
      if not v_ok then
        raise exception 'Variant % uses an option value from another product or option', new.sku;
      end if;
    end if;
  end loop;

  select string_agg(ov.value, ' / ' order by o.position)
  into v_title
  from public.product_option_values ov
  join public.product_options o on o.id = ov.option_id
  where ov.id in (new.option1, new.option2, new.option3);

  new.title := coalesce(v_title, 'Default');
  new.sku := upper(new.sku);
  return new;
end;
$$;
create trigger product_variants_before_write
  before insert or update on public.product_variants
  for each row execute function private.variants_before_write();

-- ---------------------------------------------------------------------------
-- Manual collection membership
-- ---------------------------------------------------------------------------
create table public.product_collections (
  product_id uuid not null references public.products (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  position integer not null default 0,
  primary key (product_id, collection_id)
);
alter table public.product_collections enable row level security;
create index product_collections_collection_idx on public.product_collections (collection_id, position);

-- ---------------------------------------------------------------------------
-- Stock log
-- ---------------------------------------------------------------------------
create table public.inventory_movements (
  id bigint generated always as identity primary key,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  sku text not null,
  delta integer not null,
  stock_after integer not null,
  reason public.stock_reason not null,
  order_id uuid,
  note text,
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.inventory_movements enable row level security;
create index inventory_movements_variant_idx on public.inventory_movements (variant_id, created_at desc);
create index inventory_movements_created_idx on public.inventory_movements (created_at desc);
create index inventory_movements_order_idx on public.inventory_movements (order_id) where order_id is not null;

create policy "Admins can read stock movements"
  on public.inventory_movements for select to authenticated
  using ((select public.is_admin()));

-- Every stock change is logged. Functions that change stock for a reason other
-- than a manual edit set dc.stock_reason (and dc.stock_order_id) first.
create or replace function private.log_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delta integer;
  v_reason public.stock_reason;
begin
  if tg_op = 'INSERT' then
    v_delta := new.stock;
    if v_delta = 0 then
      return new;
    end if;
    v_reason := 'initial';
  else
    v_delta := new.stock - old.stock;
    if v_delta = 0 then
      return new;
    end if;
    v_reason := coalesce(nullif(current_setting('dc.stock_reason', true), ''), 'manual')::public.stock_reason;
  end if;

  insert into public.inventory_movements (
    variant_id, product_id, sku, delta, stock_after, reason, order_id, note, actor_id
  ) values (
    new.id, new.product_id, new.sku, v_delta, new.stock, v_reason,
    nullif(current_setting('dc.stock_order_id', true), '')::uuid,
    nullif(current_setting('dc.stock_note', true), ''),
    (select auth.uid())
  );
  return new;
end;
$$;
create trigger product_variants_log_stock
  after insert or update of stock on public.product_variants
  for each row execute function private.log_stock_movement();

-- ---------------------------------------------------------------------------
-- Product summary
-- ---------------------------------------------------------------------------
create or replace function private.refresh_product_summary(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_product_id is null then
    return;
  end if;

  with av as (
    select v.*
    from public.product_variants v
    where v.product_id = p_product_id and v.is_active
  ),
  cheapest as (
    select av.price, av.compare_at_price from av order by av.price, av.position limit 1
  ),
  color_option as (
    select o.id
    from public.product_options o
    where o.product_id = p_product_id and o.is_color
    order by o.position
    limit 1
  ),
  color_values as (
    select ov.value, ov.swatch_hex, ov.position
    from public.product_option_values ov
    where ov.option_id = (select id from color_option)
      and exists (select 1 from av where ov.id in (av.option1, av.option2, av.option3))
  ),
  first_images as (
    select i.path, i.thumb_path, i.alt_text, i.width, i.height, i.position
    from public.product_images i
    where i.product_id = p_product_id
    order by i.position
    limit 2
  )
  update public.products p
  set
    price_min = (select min(av.price) from av),
    price_max = (select max(av.price) from av),
    compare_at_price = (
      select case when c.compare_at_price > c.price then c.compare_at_price end from cheapest c
    ),
    discount_percent = coalesce((
      select case when c.compare_at_price > c.price
        then round((c.compare_at_price - c.price) * 100.0 / c.compare_at_price)::integer
        else 0 end
      from cheapest c
    ), 0),
    max_discount_percent = coalesce((
      select max(case when av.compare_at_price > av.price
        then round((av.compare_at_price - av.price) * 100.0 / av.compare_at_price)::integer
        else 0 end)
      from av
    ), 0),
    on_sale = exists (select 1 from av where av.compare_at_price > av.price),
    variant_count = (select count(*) from av)::integer,
    default_variant_id = (
      select case when count(*) = 1 then (array_agg(av.id))[1] end from av
    ),
    colors = coalesce((select array_agg(lower(cv.value) order by cv.position) from color_values cv), '{}'),
    swatches = coalesce((
      select jsonb_agg(jsonb_build_object('value', cv.value, 'hex', cv.swatch_hex) order by cv.position)
      from color_values cv
    ), '[]'::jsonb),
    card_images = coalesce((
      select jsonb_agg(jsonb_build_object(
        'path', fi.path, 'thumb', coalesce(fi.thumb_path, fi.path), 'alt', fi.alt_text,
        'width', fi.width, 'height', fi.height
      ) order by fi.position)
      from first_images fi
    ), '[]'::jsonb)
  where p.id = p_product_id;
end;
$$;

-- Trigger wrapper. Bulk writers (admin_save_product) set dc.skip_summary = on
-- and refresh once at the end.
create or replace function private.product_summary_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old uuid;
  v_new uuid;
begin
  if current_setting('dc.skip_summary', true) = 'on' then
    return null;
  end if;
  v_old := case when tg_op <> 'INSERT' then old.product_id end;
  v_new := case when tg_op <> 'DELETE' then new.product_id end;
  perform private.refresh_product_summary(v_new);
  if v_old is distinct from v_new then
    perform private.refresh_product_summary(v_old);
  end if;
  return null;
end;
$$;

-- Stock is deliberately not in this list: orders change stock without touching products.
create trigger product_variants_summary
  after insert or delete or update of price, compare_at_price, is_active, option1, option2, option3, position, product_id
  on public.product_variants
  for each row execute function private.product_summary_trigger();
create trigger product_option_values_summary
  after insert or delete or update on public.product_option_values
  for each row execute function private.product_summary_trigger();
create trigger product_options_summary
  after insert or delete or update on public.product_options
  for each row execute function private.product_summary_trigger();
create trigger product_images_summary
  after insert or delete or update on public.product_images
  for each row execute function private.product_summary_trigger();

-- ---------------------------------------------------------------------------
-- Row Level Security for the child tables: visible when the product is active.
-- ---------------------------------------------------------------------------
create or replace function private.product_is_visible(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.products p where p.id = p_product_id and p.status = 'active');
$$;
grant execute on function private.product_is_visible(uuid) to anon, authenticated, service_role;

create policy "Anyone can read options of active products"
  on public.product_options for select
  using (private.product_is_visible(product_id) or (select public.is_admin()));
create policy "Admins can manage options"
  on public.product_options for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Anyone can read option values of active products"
  on public.product_option_values for select
  using (private.product_is_visible(product_id) or (select public.is_admin()));
create policy "Admins can manage option values"
  on public.product_option_values for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Anyone can read images of active products"
  on public.product_images for select
  using (private.product_is_visible(product_id) or (select public.is_admin()));
create policy "Admins can manage images"
  on public.product_images for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Anyone can read active variants of active products"
  on public.product_variants for select
  using ((is_active and private.product_is_visible(product_id)) or (select public.is_admin()));
create policy "Admins can manage variants"
  on public.product_variants for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Anyone can read collection membership of active products"
  on public.product_collections for select
  using (private.product_is_visible(product_id) or (select public.is_admin()));
create policy "Admins can manage collection membership"
  on public.product_collections for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Activity log
-- ---------------------------------------------------------------------------
create trigger categories_activity
  after insert or update or delete on public.categories
  for each row execute function private.log_row_activity();
create trigger collections_activity
  after insert or update or delete on public.collections
  for each row execute function private.log_row_activity();
create trigger products_activity
  after insert or update or delete on public.products
  for each row execute function private.log_row_activity();
create trigger product_variants_activity
  after insert or update or delete on public.product_variants
  for each row execute function private.log_row_activity();
