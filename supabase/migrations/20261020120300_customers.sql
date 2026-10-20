-- Dear Corner — customer data
--
-- addresses: saved delivery addresses (signed-in customers)
-- cart_items: the signed-in cart, one row per variant (guests keep their cart
--   in the browser and send it with the order)
-- wishlists: saved products
-- newsletter_subscribers, contact_messages: written only through functions
--   (rate-limited), read by admins

-- ---------------------------------------------------------------------------
-- Addresses
-- ---------------------------------------------------------------------------
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null default 'Home' check (char_length(label) between 1 and 30),
  full_name text not null check (char_length(full_name) between 1 and 120),
  phone text not null check (phone ~ '^01[3-9][0-9]{8}$'),
  division text not null,
  district text not null,
  area text not null,
  address_line text not null check (char_length(address_line) between 1 and 300),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.addresses enable row level security;
create index addresses_user_idx on public.addresses (user_id, created_at desc);
create unique index addresses_one_default_idx on public.addresses (user_id) where is_default;

create trigger addresses_set_updated_at
  before update on public.addresses
  for each row execute function private.set_updated_at();

create or replace function private.addresses_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.phone := coalesce(public.normalize_bd_phone(new.phone), new.phone);
  new.full_name := trim(new.full_name);
  new.address_line := trim(new.address_line);
  if not exists (
    select 1 from public.geo_areas g
    where g.division = new.division and g.district = new.district and g.area = new.area
  ) then
    raise exception using message = 'Choose your division, district and area from the lists.',
      detail = 'DC_INVALID_AREA';
  end if;
  if tg_op = 'INSERT' and (select count(*) from public.addresses a where a.user_id = new.user_id) >= 10 then
    raise exception using message = 'You can save up to 10 addresses.', detail = 'DC_LIMIT';
  end if;
  -- The first address becomes the default; a new default replaces the old one.
  if tg_op = 'INSERT' and not exists (select 1 from public.addresses a where a.user_id = new.user_id) then
    new.is_default := true;
  end if;
  if new.is_default then
    update public.addresses a set is_default = false
    where a.user_id = new.user_id and a.id <> new.id and a.is_default;
  end if;
  return new;
end;
$$;
create trigger addresses_before_write
  before insert or update on public.addresses
  for each row execute function private.addresses_before_write();

create policy "Customers manage their own addresses"
  on public.addresses for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Admins can read addresses"
  on public.addresses for select to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Cart (signed-in customers)
-- ---------------------------------------------------------------------------
create table public.cart_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  quantity integer not null check (quantity between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, variant_id)
);
alter table public.cart_items enable row level security;

create trigger cart_items_set_updated_at
  before update on public.cart_items
  for each row execute function private.set_updated_at();

create policy "Customers manage their own cart"
  on public.cart_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Badge count: one read-only query, no joins, never creates rows.
create or replace function public.cart_count()
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(c.quantity), 0)::integer
  from public.cart_items c
  where c.user_id = (select auth.uid());
$$;

-- Sets a line's quantity (0 removes it), capped at the per-item maximum.
-- Returns the new cart count.
create or replace function public.cart_set_quantity(p_variant_id uuid, p_quantity integer)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_max integer;
  v_lines integer;
begin
  if v_user is null then
    raise exception using message = 'Please sign in first.', detail = 'DC_AUTH_REQUIRED';
  end if;
  select s.max_quantity_per_item, s.max_items_per_order into v_max, v_lines
  from public.store_settings s where s.id = 1;

  if coalesce(p_quantity, 0) <= 0 then
    delete from public.cart_items c where c.user_id = v_user and c.variant_id = p_variant_id;
  else
    if not exists (select 1 from public.cart_items c where c.user_id = v_user and c.variant_id = p_variant_id)
       and (select count(*) from public.cart_items c where c.user_id = v_user) >= v_lines then
      raise exception using message = format('Your cart can hold up to %s different items.', v_lines),
        detail = 'DC_CART_FULL';
    end if;
    insert into public.cart_items (user_id, variant_id, quantity)
    values (v_user, p_variant_id, least(p_quantity, v_max))
    on conflict (user_id, variant_id) do update set quantity = excluded.quantity;
  end if;
  return public.cart_count();
end;
$$;

-- Adds to a line (creating it if needed). Returns the new cart count.
create or replace function public.cart_add(p_variant_id uuid, p_quantity integer default 1)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_current integer;
begin
  select c.quantity into v_current
  from public.cart_items c
  where c.user_id = (select auth.uid()) and c.variant_id = p_variant_id;
  return public.cart_set_quantity(p_variant_id, coalesce(v_current, 0) + greatest(coalesce(p_quantity, 1), 1));
end;
$$;

-- Moves a guest cart ([{"variant_id": "...", "quantity": 2}, ...]) into the
-- signed-in cart at sign-in. Quantities add up, capped; unknown items skipped.
create or replace function public.cart_merge(p_items jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_item jsonb;
  v_variant uuid;
  v_qty integer;
begin
  if (select auth.uid()) is null then
    raise exception using message = 'Please sign in first.', detail = 'DC_AUTH_REQUIRED';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    return public.cart_count();
  end if;
  for v_item in select * from jsonb_array_elements(p_items) limit 50 loop
    begin
      v_variant := (v_item ->> 'variant_id')::uuid;
      v_qty := (v_item ->> 'quantity')::integer;
    exception when others then
      continue;
    end;
    if v_variant is null or v_qty is null or v_qty < 1 then
      continue;
    end if;
    if exists (select 1 from public.product_variants v where v.id = v_variant) then
      begin
        perform public.cart_add(v_variant, v_qty);
      exception when others then
        -- Cart full: keep what fits.
        null;
      end;
    end if;
  end loop;
  return public.cart_count();
end;
$$;

revoke execute on function public.cart_count() from anon;
revoke execute on function public.cart_set_quantity(uuid, integer) from anon;
revoke execute on function public.cart_add(uuid, integer) from anon;
revoke execute on function public.cart_merge(jsonb) from anon;

-- ---------------------------------------------------------------------------
-- Wishlist
-- ---------------------------------------------------------------------------
create table public.wishlists (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
alter table public.wishlists enable row level security;

create policy "Customers manage their own wishlist"
  on public.wishlists for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Newsletter sign-ups (collected only; nothing is sent in this build)
-- ---------------------------------------------------------------------------
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (
    char_length(email) <= 254 and email = lower(btrim(email))
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  source text not null default 'footer',
  created_at timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;
create unique index newsletter_subscribers_email_idx on public.newsletter_subscribers (email);

create policy "Admins manage newsletter subscribers"
  on public.newsletter_subscribers for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Repeat sign-ups succeed silently, so the form never reveals who is on the list.
create or replace function public.subscribe_newsletter(p_email text, p_source text default 'footer')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or char_length(v_email) > 254 then
    raise exception using message = 'Enter an email address, like name@example.com.', detail = 'DC_INVALID_EMAIL';
  end if;
  perform private.hit_rate_limit('newsletter', private.request_key(), 10, interval '1 hour');
  insert into public.newsletter_subscribers (email, source)
  values (v_email, left(coalesce(nullif(p_source, ''), 'footer'), 30))
  on conflict (email) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Contact form
-- ---------------------------------------------------------------------------
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  phone text not null check (phone ~ '^01[3-9][0-9]{8}$'),
  email text check (email is null or char_length(email) <= 254),
  order_number text check (order_number is null or char_length(order_number) <= 20),
  message text not null check (char_length(message) between 1 and 2000),
  status public.message_status not null default 'new',
  admin_note text not null default '',
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
alter table public.contact_messages enable row level security;
create index contact_messages_status_idx on public.contact_messages (status, created_at desc);

create policy "Admins read contact messages"
  on public.contact_messages for select to authenticated
  using ((select public.is_admin()));
create policy "Admins update contact messages"
  on public.contact_messages for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "Admins delete contact messages"
  on public.contact_messages for delete to authenticated
  using ((select public.is_admin()));

create trigger contact_messages_activity
  after update or delete on public.contact_messages
  for each row execute function private.log_row_activity();

create or replace function public.submit_contact_message(
  p_name text,
  p_phone text,
  p_message text,
  p_email text default null,
  p_order_number text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := public.normalize_bd_phone(p_phone);
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_id uuid;
begin
  if coalesce(btrim(p_name), '') = '' then
    raise exception using message = 'Tell us your name.', detail = 'DC_MISSING_NAME';
  end if;
  if v_phone is null then
    raise exception using message = 'Enter an 11-digit mobile number, like 01712345678.', detail = 'DC_INVALID_PHONE';
  end if;
  if coalesce(btrim(p_message), '') = '' then
    raise exception using message = 'Write a short message so we know how to help.', detail = 'DC_MISSING_MESSAGE';
  end if;
  if char_length(p_message) > 2000 then
    raise exception using message = 'Please keep your message under 2,000 characters.', detail = 'DC_TOO_LONG';
  end if;
  if v_email is not null and v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception using message = 'Enter an email address, like name@example.com.', detail = 'DC_INVALID_EMAIL';
  end if;
  perform private.hit_rate_limit('contact', private.request_key(), 5, interval '1 hour');

  insert into public.contact_messages (name, phone, email, order_number, message, user_id)
  values (
    left(btrim(p_name), 120), v_phone, v_email,
    nullif(upper(btrim(coalesce(p_order_number, ''))), ''),
    btrim(p_message), (select auth.uid())
  )
  returning id into v_id;
  return v_id;
end;
$$;
