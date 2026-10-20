-- Removes the SAMPLE data added by sample_products.sql.
-- Sample products that appear in orders are archived instead of deleted.
update public.products p set status = 'archived'
where p.is_sample and exists (select 1 from public.order_items oi where oi.product_id = p.id);

delete from public.products p
where p.is_sample and not exists (select 1 from public.order_items oi where oi.product_id = p.id);

delete from public.categories c
where c.is_sample
  and not exists (select 1 from public.products p where p.category_id = c.id)
  and not exists (select 1 from public.categories ch where ch.parent_id = c.id);
