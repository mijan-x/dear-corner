-- Test helpers (local test database only).
create schema if not exists t;
grant usage on schema t to anon, authenticated;

create or replace function t.ok(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if p_condition is not true then
    raise exception 'FAIL: %', p_message;
  end if;
  raise notice 'ok   %', p_message;
end;
$$;

-- Runs p_sql and expects it to fail. p_expect matches the DETAIL code (DC_...)
-- or, if it starts with "msg:", part of the message; "any" accepts any error.
create or replace function t.fails(p_sql text, p_expect text, p_message text)
returns void
language plpgsql
as $$
declare
  v_detail text;
  v_msg text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_detail = pg_exception_detail, v_msg = message_text;
    if p_expect = 'any'
       or coalesce(v_detail, '') = p_expect
       or (p_expect like 'msg:%' and v_msg ilike '%' || substr(p_expect, 5) || '%') then
      raise notice 'ok   % (% / %)', p_message, coalesce(v_detail, '-'), v_msg;
      return;
    end if;
    raise exception 'FAIL: % — expected %, got % / %', p_message, p_expect, v_detail, v_msg;
  end;
  raise exception 'FAIL: % — expected an error (%), got none', p_message, p_expect;
end;
$$;

grant execute on all functions in schema t to anon, authenticated;

-- Test users: a customer, a second customer and an admin.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'rima@example.com', '{"full_name": "Rima Akter"}'),
  ('22222222-2222-2222-2222-222222222222', 'tanvir@example.com', '{"full_name": "Tanvir"}'),
  ('99999999-9999-9999-9999-999999999999', 'dearcorner.bd@gmail.com', '{}');
update public.user_roles set role = 'admin' where user_id = '99999999-9999-9999-9999-999999999999';
