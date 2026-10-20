-- Dear Corner — privileges
--
-- Supabase lets the API roles (anon = visitors, authenticated = signed-in)
-- run every function in the public schema by default. This migration takes
-- that away and grants each function explicitly. Row Level Security still
-- decides which rows anyone can see or change.
--
-- When adding a function in a later migration, grant it here-style:
--   revoke execute on function public.my_fn(...) from public, anon, authenticated;
--   grant execute on function public.my_fn(...) to <roles>;

-- New functions created by the migration role are no longer callable by default.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

-- Tables: nobody needs TRUNCATE, REFERENCES or TRIGGER through the API.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- Used inside Row Level Security policies and by functions running as the caller.
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function private.product_is_visible(uuid) to anon, authenticated, service_role;
grant execute on function private.owns_order(uuid) to authenticated, service_role;
grant execute on function private.catalog_matches(text, text, text, integer, integer, text[], boolean, boolean, uuid, text)
  to anon, authenticated, service_role;
grant execute on function private.search_tsquery(text) to anon, authenticated, service_role;

-- Storefront (visitors and signed-in customers)
grant execute on function public.normalize_bd_phone(text) to anon, authenticated;
grant execute on function public.my_access() to anon, authenticated;
grant execute on function public.shipping_zone_for(text, text) to anon, authenticated;
grant execute on function public.order_next_statuses(public.order_status) to anon, authenticated;
grant execute on function public.order_status_label(public.order_status) to anon, authenticated;
grant execute on function public.catalog_products(text, text, text, integer, integer, text[], boolean, boolean, text, integer, integer, uuid, text)
  to anon, authenticated;
grant execute on function public.catalog_facets(text, text, text) to anon, authenticated;
grant execute on function public.search_suggestions(text) to anon, authenticated;
grant execute on function public.get_product(text) to anon, authenticated;
grant execute on function public.related_products(uuid, integer) to anon, authenticated;
grant execute on function public.get_listing(text, text) to anon, authenticated;
grant execute on function public.storefront_nav() to anon, authenticated;
grant execute on function public.home_feed() to anon, authenticated;
grant execute on function public.quote_cart(jsonb, text, text, text, text) to anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb, text, integer) to anon, authenticated;
grant execute on function public.track_order(text, text) to anon, authenticated;
grant execute on function public.submit_review(uuid, integer, text, text, text, text, text) to anon, authenticated;
grant execute on function public.report_review(uuid, text) to anon, authenticated;
grant execute on function public.submit_contact_message(text, text, text, text, text) to anon, authenticated;
grant execute on function public.subscribe_newsletter(text, text) to anon, authenticated;

-- Signed-in customers
grant execute on function public.cart_count() to authenticated;
grant execute on function public.cart_set_quantity(uuid, integer) to authenticated;
grant execute on function public.cart_add(uuid, integer) to authenticated;
grant execute on function public.cart_merge(jsonb) to authenticated;
grant execute on function public.quote_my_cart(text, text, text, text) to authenticated;
grant execute on function public.my_order(text) to authenticated;

-- Admin (each also checks is_admin() inside)
grant execute on function public.admin_update_order_status(uuid, public.order_status, text, text, text, text) to authenticated;
grant execute on function public.admin_update_order_courier(uuid, text, text, text) to authenticated;
grant execute on function public.admin_update_order_details(uuid, jsonb) to authenticated;
grant execute on function public.admin_export_orders(date, date, public.order_status[]) to authenticated;
grant execute on function public.admin_dashboard() to authenticated;
grant execute on function public.admin_customers(text, integer, integer) to authenticated;
grant execute on function public.admin_save_product(jsonb) to authenticated;
grant execute on function public.admin_set_stock(uuid, integer, text) to authenticated;
grant execute on function public.admin_delete_sample_data() to authenticated;

-- service_role (server-side tools, never in the browser) keeps full access.
grant execute on all functions in schema public to service_role;
grant execute on all functions in schema private to service_role;
