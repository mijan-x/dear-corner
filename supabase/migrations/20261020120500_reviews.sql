-- Dear Corner — reviews
--
-- Only buyers of a delivered order can review, one review per order line,
-- through public.submit_review() (signed-in buyers, or guests with their order
-- number + phone). Every review starts as "pending" and appears on the site
-- only after an admin approves it. Never create sample or invented reviews.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  order_item_id uuid not null unique references public.order_items (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  reviewer_name text not null check (char_length(reviewer_name) between 1 and 60),
  rating smallint not null check (rating between 1 and 5),
  title text check (title is null or char_length(title) <= 120),
  body text not null check (char_length(body) between 1 and 2000),
  status public.review_status not null default 'pending',
  admin_note text not null default '' check (char_length(admin_note) <= 500),
  moderated_at timestamptz,
  moderated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.reviews enable row level security;
create index reviews_product_idx on public.reviews (product_id, status, created_at desc);
create index reviews_status_idx on public.reviews (status, created_at desc);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function private.set_updated_at();

create or replace function private.reviews_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.moderated_at := now();
    new.moderated_by := (select auth.uid());
  end if;
  -- What the customer wrote and which line it belongs to never change.
  new.product_id := old.product_id;
  new.order_id := old.order_id;
  new.order_item_id := old.order_item_id;
  new.user_id := old.user_id;
  new.rating := old.rating;
  new.body := old.body;
  new.title := old.title;
  return new;
end;
$$;
create trigger reviews_before_update
  before update on public.reviews
  for each row execute function private.reviews_before_update();

-- Product rating from approved reviews only.
create or replace function private.refresh_product_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p
  set rating_avg = r.avg_rating, rating_count = r.cnt
  from (
    select round(avg(rv.rating)::numeric, 2) as avg_rating, count(*)::integer as cnt
    from public.reviews rv
    where rv.product_id = v_product and rv.status = 'approved'
  ) r
  where p.id = v_product;
  return null;
end;
$$;
create trigger reviews_refresh_rating
  after insert or delete or update of status on public.reviews
  for each row execute function private.refresh_product_rating();

create trigger reviews_activity
  after update or delete on public.reviews
  for each row execute function private.log_row_activity();

create policy "Anyone can read approved reviews of active products"
  on public.reviews for select
  using (
    (status = 'approved' and private.product_is_visible(product_id))
    or (user_id is not null and user_id = (select auth.uid()))
    or (select public.is_admin())
  );
create policy "Admins moderate reviews"
  on public.reviews for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "Admins delete reviews"
  on public.reviews for delete to authenticated
  using ((select public.is_admin()));

-- Reports from shoppers ("Report this review"), for the moderation queue.
create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 300),
  created_at timestamptz not null default now()
);
alter table public.review_reports enable row level security;
create index review_reports_review_idx on public.review_reports (review_id);

create policy "Admins manage review reports"
  on public.review_reports for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create or replace function public.report_review(p_review_id uuid, p_reason text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.reviews r where r.id = p_review_id and r.status = 'approved') then
    raise exception using message = 'We couldn''t find that review.', detail = 'DC_NOT_FOUND';
  end if;
  perform private.hit_rate_limit('review_report', private.request_key(), 10, interval '1 hour');
  insert into public.review_reports (review_id, reason)
  values (p_review_id, left(coalesce(p_reason, ''), 300));
end;
$$;
