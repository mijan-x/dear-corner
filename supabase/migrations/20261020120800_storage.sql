-- Dear Corner — image storage
--
-- product-images: product photos. The admin page resizes in the browser before
--   upload (1200px WebP under 150 KB plus a 400px thumbnail), so files stay small
--   on the free plan.
-- site-media: hero, banners and category images (WebP under 250 KB).
-- Both are public buckets (files are served by public URL); only admins with
-- two-step login can upload, replace or delete. Listing is admin-only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 1048576,
   array['image/webp', 'image/jpeg', 'image/png', 'image/avif']),
  ('site-media', 'site-media', true, 3145728,
   array['image/webp', 'image/jpeg', 'image/png', 'image/avif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins can list shop images"
  on storage.objects for select to authenticated
  using (bucket_id in ('product-images', 'site-media') and (select public.is_admin()));

create policy "Admins can upload shop images"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('product-images', 'site-media') and (select public.is_admin()));

create policy "Admins can replace shop images"
  on storage.objects for update to authenticated
  using (bucket_id in ('product-images', 'site-media') and (select public.is_admin()))
  with check (bucket_id in ('product-images', 'site-media') and (select public.is_admin()));

create policy "Admins can delete shop images"
  on storage.objects for delete to authenticated
  using (bucket_id in ('product-images', 'site-media') and (select public.is_admin()));
