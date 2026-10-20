-- Dear Corner — orders and coupons
--
-- Orders are created only by public.place_order() (see storefront functions),
-- which recalculates every price, the coupon discount, the delivery fee and the
-- total on the server. Nobody can insert, update or delete orders directly:
--   customers can read their own orders (signed-in) and look one up by order
--   number + phone (track_order); admins read all and change status through
--   admin_update_order_status().
-- Order lines keep a snapshot (name, variant, SKU, price, image) so archived or
-- deleted products never break order history.
-- Order numbers: DC-10001, DC-10002, ...

create sequence private.order_number_seq start with 10001 minvalue 10001;

-- ---------------------------------------------------------------------------
-- Coupons
-- ---------------------------------------------------------------------------
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code ~ '^[A-Z0-9][A-Z0-9_-]{2,29}$'),
  description text not null default '' check (char_length(description) <= 200),
  type public.coupon_type not null,
  -- Percent (1-100) or a fixed amount in taka.
  value integer not null check (value > 0),
  max_discount integer check (max_discount is null or max_discount > 0),
  min_subtotal integer not null default 0 check (min_subtotal >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  per_customer_limit integer default 1 check (per_customer_limit is null or per_customer_limit > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type <> 'percent' or value <= 100),
  check (expires_at is null or starts_at is null or expires_at > starts_at)
);
alter table public.coupons enable row level security;
create unique index coupons_code_idx on public.coupons (code);

create trigger coupons_set_updated_at
  before update on public.coupons
  for each row execute function private.set_updated_at();

create or replace function private.coupons_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.code := upper(btrim(new.code));
  return new;
end;
$$;
create trigger coupons_before_write
  before insert or update of code on public.coupons
  for each row execute function private.coupons_before_write();

-- When a coupon lists categories, the discount applies only to items in those
-- categories (or their sub-categories). No rows = whole cart.
create table public.coupon_categories (
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (coupon_id, category_id)
);
alter table public.coupon_categories enable row level security;

create policy "Admins manage coupons"
  on public.coupons for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "Admins manage coupon categories"
  on public.coupon_categories for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create trigger coupons_activity
  after insert or update or delete on public.coupons
  for each row execute function private.log_row_activity();

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  status public.order_status not null default 'placed',

  customer_name text not null check (char_length(customer_name) between 1 and 120),
  phone text not null check (phone ~ '^01[3-9][0-9]{8}$'),
  email text check (email is null or char_length(email) <= 254),
  division text not null,
  district text not null,
  area text not null,
  address_line text not null check (char_length(address_line) between 1 and 300),
  delivery_note text not null default '' check (char_length(delivery_note) <= 300),

  shipping_zone_id uuid references public.shipping_zones (id) on delete set null,
  shipping_zone_name text not null,
  delivery_min_days integer not null,
  delivery_max_days integer not null,

  subtotal integer not null check (subtotal >= 0),
  discount integer not null default 0 check (discount >= 0),
  delivery_fee integer not null check (delivery_fee >= 0),
  total integer not null check (total >= 0),
  coupon_id uuid references public.coupons (id) on delete set null,
  coupon_code text,

  payment_method public.payment_method not null default 'cash_on_delivery',
  payment_status public.payment_status not null default 'unpaid',

  courier_name text check (courier_name is null or char_length(courier_name) <= 60),
  tracking_url text check (tracking_url is null or tracking_url ~ '^https?://'),
  tracking_code text check (tracking_code is null or char_length(tracking_code) <= 60),

  -- Set once stock has been put back (cancel/return). Guards against doing it twice.
  stock_restored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total = subtotal - discount + delivery_fee)
);
alter table public.orders enable row level security;
create index orders_created_idx on public.orders (created_at desc);
create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_user_created_idx on public.orders (user_id, created_at desc) where user_id is not null;
create index orders_phone_created_idx on public.orders (phone, created_at desc);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function private.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  category_id uuid,
  product_name text not null,
  product_slug text not null,
  variant_title text not null default 'Default',
  sku text not null,
  image_path text,
  unit_price integer not null check (unit_price >= 0),
  compare_at_price integer,
  quantity integer not null check (quantity > 0),
  line_total integer not null check (line_total >= 0),
  check (line_total = unit_price * quantity)
);
alter table public.order_items enable row level security;
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);
create index order_items_variant_idx on public.order_items (variant_id);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  note text check (note is null or char_length(note) <= 500),
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.order_status_history enable row level security;
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

create table public.order_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  author_id uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.order_notes enable row level security;
create index order_notes_order_idx on public.order_notes (order_id, created_at);

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  order_id uuid not null unique references public.orders (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  phone text not null,
  discount integer not null check (discount >= 0),
  created_at timestamptz not null default now(),
  -- Set when the order is cancelled, so the use no longer counts.
  released_at timestamptz
);
alter table public.coupon_redemptions enable row level security;
create index coupon_redemptions_coupon_idx on public.coupon_redemptions (coupon_id) where released_at is null;
create index coupon_redemptions_phone_idx on public.coupon_redemptions (coupon_id, phone) where released_at is null;

alter table public.inventory_movements
  add constraint inventory_movements_order_fk
  foreign key (order_id) references public.orders (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
create or replace function private.owns_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id and o.user_id is not null and o.user_id = (select auth.uid())
  );
$$;
grant execute on function private.owns_order(uuid) to authenticated, service_role;

-- There is no public SELECT on orders: guests look orders up only through
-- track_order(), which needs the order number and the phone number.
create policy "Customers read their own orders"
  on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Customers read lines of their own orders"
  on public.order_items for select to authenticated
  using (private.owns_order(order_id) or (select public.is_admin()));

create policy "Customers read the history of their own orders"
  on public.order_status_history for select to authenticated
  using (private.owns_order(order_id) or (select public.is_admin()));

create policy "Admins read order notes"
  on public.order_notes for select to authenticated
  using ((select public.is_admin()));
create policy "Admins add order notes"
  on public.order_notes for insert to authenticated
  with check ((select public.is_admin()) and author_id = (select auth.uid()));
create policy "Admins delete order notes"
  on public.order_notes for delete to authenticated
  using ((select public.is_admin()));

create policy "Admins read coupon redemptions"
  on public.coupon_redemptions for select to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Status workflow
-- ---------------------------------------------------------------------------
--   placed            -> confirmed, cancelled
--   confirmed         -> packed, cancelled
--   packed            -> handed_to_courier, cancelled
--   handed_to_courier -> out_for_delivery, delivered, returned
--   out_for_delivery  -> delivered, returned
--   delivered         -> returned
--   cancelled, returned: final
create or replace function public.order_next_statuses(p_status public.order_status)
returns public.order_status[]
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'placed' then array['confirmed', 'cancelled']::public.order_status[]
    when 'confirmed' then array['packed', 'cancelled']::public.order_status[]
    when 'packed' then array['handed_to_courier', 'cancelled']::public.order_status[]
    when 'handed_to_courier' then array['out_for_delivery', 'delivered', 'returned']::public.order_status[]
    when 'out_for_delivery' then array['delivered', 'returned']::public.order_status[]
    when 'delivered' then array['returned']::public.order_status[]
    else array[]::public.order_status[]
  end;
$$;

create or replace function public.order_status_label(p_status public.order_status)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'placed' then 'Placed'
    when 'confirmed' then 'Confirmed'
    when 'packed' then 'Packed'
    when 'handed_to_courier' then 'Handed to courier'
    when 'out_for_delivery' then 'Out for delivery'
    when 'delivered' then 'Delivered'
    when 'cancelled' then 'Cancelled'
    when 'returned' then 'Returned'
  end;
$$;
