-- Dear Corner — foundation
-- Extensions, enums, private helper schema, roles + admin check (with MFA),
-- profiles, store settings, rate limits and the admin activity log.
--
-- Money is stored as whole taka (integer). Prices never have decimals.
-- Every table has Row Level Security on. Functions meant for internal use live
-- in the `private` schema, which the website's API cannot reach.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Private schema: helpers callable only from inside the database
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
-- RLS policies call a few private helpers, so the API roles need USAGE. The
-- schema is not exposed by the API, so nothing in it can be called directly.
grant usage on schema private to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'customer');
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.order_status as enum (
  'placed', 'confirmed', 'packed', 'handed_to_courier',
  'out_for_delivery', 'delivered', 'cancelled', 'returned'
);
-- Online payment methods (bkash, nagad, sslcommerz) can be added later with
-- ALTER TYPE ... ADD VALUE; nothing else depends on the list.
create type public.payment_method as enum ('cash_on_delivery');
create type public.payment_status as enum ('unpaid', 'paid', 'refunded');
create type public.coupon_type as enum ('percent', 'fixed');
create type public.review_status as enum ('pending', 'approved', 'rejected');
create type public.message_status as enum ('new', 'read', 'done');
create type public.collection_rule as enum (
  'manual', 'new_arrivals', 'max_price', 'on_sale', 'bestsellers', 'gifts'
);
create type public.stock_reason as enum (
  'initial', 'manual', 'order', 'cancelled', 'returned', 'correction'
);

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Bangladesh mobile number -> 01XXXXXXXXX, or null if not valid.
-- Accepts +880 / 880 prefixes, spaces and dashes.
create or replace function public.normalize_bd_phone(raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when d ~ '^01[3-9][0-9]{8}$' then d
    when d ~ '^8801[3-9][0-9]{8}$' then substr(d, 3)
    else null
  end
  from (select regexp_replace(coalesce(raw, ''), '[^0-9]', '', 'g') as d) s;
$$;

-- URL slug from a name: "Pleated Table Lamp" -> "pleated-table-lamp".
create or replace function private.slugify(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- A short key identifying the caller for rate limits: a hash of the client IP
-- (from the request headers PostgREST passes in), never the IP itself.
create or replace function private.request_key()
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_headers jsonb;
  v_ip text;
begin
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    v_headers := null;
  end;
  v_ip := coalesce(
    split_part(v_headers ->> 'x-forwarded-for', ',', 1),
    v_headers ->> 'x-real-ip',
    v_headers ->> 'cf-connecting-ip',
    'unknown'
  );
  return encode(extensions.digest(trim(v_ip), 'sha256'), 'hex');
end;
$$;

-- ---------------------------------------------------------------------------
-- Roles and the admin check
-- ---------------------------------------------------------------------------
create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);
alter table public.user_roles enable row level security;

create policy "Users can see their own role"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()));
-- No insert/update/delete policies: roles change only through SQL run by the
-- project owner (see supabase/README.md).

-- True only for an admin whose current session passed two-step login (TOTP),
-- i.e. the JWT has aal = aal2. Every admin RLS policy and admin function uses it.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
      select 1 from public.user_roles r
      where r.user_id = (select auth.uid()) and r.role = 'admin'
    )
    and coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2';
$$;

-- Lets the admin UI tell "not an admin" apart from "admin, but two-step login
-- still needed".
create or replace function public.my_access()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'is_admin_role', exists (
      select 1 from public.user_roles r
      where r.user_id = (select auth.uid()) and r.role = 'admin'
    ),
    'aal', coalesce((select auth.jwt()) ->> 'aal', 'aal1'),
    'is_admin', public.is_admin()
  );
$$;

-- ---------------------------------------------------------------------------
-- Profiles (one per signed-up customer)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  phone text check (phone is null or phone ~ '^01[3-9][0-9]{8}$'),
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create policy "Users can see their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Customers cannot change the email copy (it mirrors auth.users).
create or replace function private.profiles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.email := old.email;
    new.id := old.id;
  end if;
  return new;
end;
$$;
create trigger profiles_guard
  before update on public.profiles
  for each row execute function private.profiles_guard();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
    public.normalize_bd_phone(new.raw_user_meta_data ->> 'phone'),
    new.email
  )
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function private.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Store settings (single row)
-- ---------------------------------------------------------------------------
create table public.store_settings (
  id smallint primary key default 1 check (id = 1),
  -- Free delivery when (subtotal - coupon discount) >= this. Null = never free.
  free_delivery_threshold integer default 1000 check (free_delivery_threshold is null or free_delivery_threshold >= 0),
  announcement_enabled boolean not null default true,
  announcement_text text not null default 'Cash on Delivery across Bangladesh. Free delivery on orders over ৳1,000.'
    check (char_length(announcement_text) <= 140),
  announcement_link text check (announcement_link is null or char_length(announcement_link) <= 300),
  -- Contact details: empty until the owner fills them in; the site hides empty ones.
  contact_phone text not null default '',
  contact_whatsapp text not null default '',
  contact_email text not null default '',
  contact_address text not null default '',
  opening_hours text not null default '',
  reply_time text not null default '',
  facebook_url text not null default '',
  instagram_url text not null default '',
  instagram_handle text not null default '',
  tiktok_url text not null default '',
  -- Order limits (fraud protection for Cash on Delivery).
  max_open_orders_per_phone integer not null default 3 check (max_open_orders_per_phone between 1 and 50),
  max_quantity_per_item integer not null default 10 check (max_quantity_per_item between 1 and 100),
  max_items_per_order integer not null default 20 check (max_items_per_order between 1 and 100),
  -- Homepage content and block switches (hero text and images, banners,
  -- Instagram photos). Shape documented in src/types/settings.ts.
  homepage jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.store_settings enable row level security;

insert into public.store_settings (id) values (1);

create trigger store_settings_set_updated_at
  before update on public.store_settings
  for each row execute function private.set_updated_at();

create policy "Anyone can read store settings"
  on public.store_settings for select
  using (true);
create policy "Admins can update store settings"
  on public.store_settings for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Rate limits (used by order, tracking, contact, review and coupon checks)
-- ---------------------------------------------------------------------------
create table private.rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket text not null,
  key text not null,
  created_at timestamptz not null default now()
);
create index rate_limit_hits_lookup_idx on private.rate_limit_hits (bucket, key, created_at desc);

-- Records a hit and raises DC_RATE_LIMITED once `max_hits` were already
-- recorded for (bucket, key) inside `per`.
create or replace function private.hit_rate_limit(
  p_bucket text,
  p_key text,
  p_max_hits integer,
  p_per interval
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from private.rate_limit_hits h
  where h.bucket = p_bucket and h.key = p_key and h.created_at > now() - p_per;

  if v_count >= p_max_hits then
    raise exception using
      message = 'Too many tries. Please wait a few minutes and try again.',
      detail = 'DC_RATE_LIMITED';
  end if;

  insert into private.rate_limit_hits (bucket, key) values (p_bucket, p_key);

  -- Occasional clean-up of old rows.
  if random() < 0.02 then
    delete from private.rate_limit_hits where created_at < now() - interval '2 days';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin activity log
-- ---------------------------------------------------------------------------
create table public.admin_activity (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,                 -- e.g. "update", "order.status"
  entity text not null,                 -- table or area, e.g. "products"
  entity_id text,
  summary text not null default '',
  changes jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_activity enable row level security;
create index admin_activity_created_idx on public.admin_activity (created_at desc);
create index admin_activity_entity_idx on public.admin_activity (entity, entity_id, created_at desc);

create policy "Admins can read the activity log"
  on public.admin_activity for select to authenticated
  using ((select public.is_admin()));

create or replace function private.log_activity(
  p_action text,
  p_entity text,
  p_entity_id text,
  p_summary text,
  p_changes jsonb default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_activity (actor_id, action, entity, entity_id, summary, changes)
  values ((select auth.uid()), p_action, p_entity, p_entity_id, left(coalesce(p_summary, ''), 300), p_changes);
$$;

-- Generic row trigger: logs inserts, updates (changed columns only) and
-- deletes made by an admin. Changes made by customers or by system functions
-- (for example stock taken by an order) are not logged here.
create or replace function private.log_row_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_changes jsonb := '{}'::jsonb;
  v_key text;
  v_label text;
begin
  if not public.is_admin() then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE' then
    for v_key in select jsonb_object_keys(v_new) loop
      -- Skip timestamps and the product summary columns kept by triggers.
      if v_key not in (
           'updated_at', 'search_vector', 'price_min', 'price_max', 'compare_at_price',
           'discount_percent', 'max_discount_percent', 'on_sale', 'variant_count',
           'default_variant_id', 'colors', 'swatches', 'card_images', 'rating_avg',
           'rating_count', 'title'
         )
         and (v_new -> v_key) is distinct from (v_old -> v_key) then
        v_changes := v_changes || jsonb_build_object(
          v_key, jsonb_build_object('from', v_old -> v_key, 'to', v_new -> v_key)
        );
      end if;
    end loop;
    if v_changes = '{}'::jsonb then
      return new;
    end if;
  end if;

  v_label := coalesce(
    v_new ->> 'name', v_old ->> 'name',
    v_new ->> 'code', v_old ->> 'code',
    v_new ->> 'sku', v_old ->> 'sku',
    ''
  );

  perform private.log_activity(
    lower(tg_op),
    tg_table_name,
    coalesce(v_new ->> 'id', v_old ->> 'id'),
    trim(lower(tg_op) || ' ' || tg_table_name || ' ' || v_label),
    case tg_op
      when 'UPDATE' then v_changes
      when 'INSERT' then v_new
      else v_old
    end
  );
  return coalesce(new, old);
end;
$$;

create trigger store_settings_activity
  after update on public.store_settings
  for each row execute function private.log_row_activity();
