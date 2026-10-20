-- Dear Corner — indexes for foreign keys
--
-- Every foreign key gets a covering index, so deleting or archiving a parent
-- row (a product, a coupon, a customer account) never scans a whole table.
-- Flagged by the Supabase performance advisor (unindexed_foreign_keys).

create index if not exists products_category_idx on public.products (category_id);
create index if not exists product_variants_image_idx on public.product_variants (image_id);
create index if not exists product_variants_option1_idx on public.product_variants (option1);
create index if not exists product_variants_option2_idx on public.product_variants (option2);
create index if not exists product_variants_option3_idx on public.product_variants (option3);
create index if not exists inventory_movements_product_idx on public.inventory_movements (product_id);
create index if not exists inventory_movements_actor_idx on public.inventory_movements (actor_id);
create index if not exists cart_items_variant_idx on public.cart_items (variant_id);
create index if not exists wishlists_product_idx on public.wishlists (product_id);
create index if not exists coupon_categories_category_idx on public.coupon_categories (category_id);
create index if not exists coupon_redemptions_user_idx on public.coupon_redemptions (user_id);
create index if not exists orders_coupon_idx on public.orders (coupon_id);
create index if not exists orders_shipping_zone_idx on public.orders (shipping_zone_id);
create index if not exists order_status_history_actor_idx on public.order_status_history (actor_id);
create index if not exists order_notes_author_idx on public.order_notes (author_id);
create index if not exists reviews_order_idx on public.reviews (order_id);
create index if not exists reviews_user_idx on public.reviews (user_id);
create index if not exists reviews_moderated_by_idx on public.reviews (moderated_by);
create index if not exists contact_messages_user_idx on public.contact_messages (user_id);
create index if not exists admin_activity_actor_idx on public.admin_activity (actor_id);
