-- Dear Corner — demo images for the SAMPLE products, the categories and the
-- homepage (run after sample_products.sql; safe to run again).
--
-- The files ship with the website under /samples/ (public/samples/, built by
-- scripts/sample-photos/build.py from photos generated in Canva). They are
-- demo images: replace them with real photos before launch. Images the owner
-- has uploaded are never overwritten: only empty fields and earlier /samples/
-- paths are touched.

-- ---------------------------------------------------------------------------
-- Product photos. Color photos are linked to their color value, so choosing
-- a color swaps the gallery; each color variant points at its main photo.
-- ---------------------------------------------------------------------------
-- Earlier demo photos of these products are replaced; uploaded photos stay.
delete from public.product_images i
using public.products p
where p.id = i.product_id and p.is_sample and i.path like '/samples/%';

-- Each photo: product, file, the color it shows (null = every color), alt
-- text and its place in the gallery.
insert into public.product_images (product_id, path, thumb_path, alt_text, width, height, position, option_value_id)
select
  p.id,
  '/samples/products/' || s.file || '.webp',
  '/samples/products/' || s.file || '-400.webp',
  s.alt, 1200, 1200,
  -- after any photos already uploaded for the product
  s.position + coalesce((select max(i.position) + 1 from public.product_images i where i.product_id = p.id), 0),
  (select ov.id
   from public.product_option_values ov
   join public.product_options o on o.id = ov.option_id
   where ov.product_id = p.id and o.is_color and ov.value = s.color)
from (values
  ('sample-ribbed-ceramic-bud-vase', 'vase-cream', 'Cream', 'Ribbed ceramic bud vase in cream with two daisies', 0),
  ('sample-ribbed-ceramic-bud-vase', 'vase-lifestyle', 'Cream', 'Cream bud vase with daisies on a sunny windowsill', 1),
  ('sample-ribbed-ceramic-bud-vase', 'vase-clay', 'Clay', 'Ribbed ceramic bud vase in clay with two daisies', 2),
  ('sample-ribbed-ceramic-bud-vase', 'vase-sage', 'Sage', 'Ribbed ceramic bud vase in sage with two daisies', 3),
  ('sample-bubble-candle-set-of-2', 'candle', null, 'Two ivory bubble candles on an oak coaster, one lit', 0),
  ('sample-linen-photo-frame', 'frame', null, 'Linen-wrapped photo frame holding a meadow print', 0),
  ('sample-pleated-table-lamp', 'lamp-ivory', 'Ivory', 'Pleated table lamp in ivory with a round ceramic base', 0),
  ('sample-pleated-table-lamp', 'lamp-lifestyle', 'Ivory', 'Ivory pleated lamp glowing on a bedside table at dusk', 1),
  ('sample-pleated-table-lamp', 'lamp-blush', 'Blush', 'Pleated table lamp in blush with a round ceramic base', 2),
  ('sample-warm-fairy-lights', 'fairy-lights', null, 'Warm fairy lights glowing in a glass jar', 0),
  ('sample-mushroom-night-lamp', 'mushroom-lamp', null, 'Mushroom night lamp with a frosted glowing cap', 0),
  ('sample-grid-notebook-a5', 'notebook-sage', 'Sage', 'Sage A5 notebook with a matching pen', 0),
  ('sample-grid-notebook-a5', 'notebook-lifestyle', 'Sage', 'Sage notebook open on a desk beside a cup of tea', 1),
  ('sample-grid-notebook-a5', 'notebook-rosewood', 'Rosewood', 'Rosewood A5 notebook with a matching pen', 2),
  ('sample-grid-notebook-a5', 'notebook-sand', 'Sand', 'Sand A5 notebook with a matching pen', 3),
  ('sample-ceramic-pen-holder', 'pen-holder', null, 'Speckled ceramic pen holder with pencils and brushes', 0),
  ('sample-desk-organiser-tray', 'tray', null, 'Oak desk organiser tray with clips and a pencil', 0),
  ('sample-canvas-tote-bag', 'tote-natural', 'Natural', 'Natural canvas tote bag', 0),
  ('sample-canvas-tote-bag', 'tote-black', 'Black', 'Black canvas tote bag', 1),
  ('sample-claw-hair-clip-set', 'claw-clips', null, 'Three matte claw clips in blush, sage and cream', 0),
  ('sample-little-corner-gift-box', 'gift-box', null, 'Kraft gift box with a candle, a notebook and a claw clip', 0)
) as s(product_slug, file, color, alt, position)
join public.products p on p.slug = s.product_slug and p.is_sample;

-- Each color variant shows its own photo first.
update public.product_variants v
set image_id = i.id
from public.product_images i
where i.product_id = v.product_id
  and i.option_value_id is not null
  and i.option_value_id in (v.option1, v.option2, v.option3)
  and i.path like '/samples/%'
  and i.position = (
    select min(i2.position) from public.product_images i2
    where i2.product_id = v.product_id and i2.option_value_id = i.option_value_id
  )
  and (v.image_id is null or v.image_id not in (select id from public.product_images));


-- ---------------------------------------------------------------------------
-- Category and collection images: square card, 4:1 desktop banner, 2:1 phone banner.
-- ---------------------------------------------------------------------------
update public.categories c
set card_image_path = case when c.card_image_path is null or c.card_image_path like '/samples/%'
                           then '/samples/categories/' || c.slug || '-card.webp' else c.card_image_path end,
    banner_desktop_path = case when c.banner_desktop_path is null or c.banner_desktop_path like '/samples/%'
                           then '/samples/categories/' || c.slug || '-desktop.webp' else c.banner_desktop_path end,
    banner_mobile_path = case when c.banner_mobile_path is null or c.banner_mobile_path like '/samples/%'
                           then '/samples/categories/' || c.slug || '-mobile.webp' else c.banner_mobile_path end
where c.parent_id is null
  and c.slug in ('room-decor', 'lighting', 'desk-and-stationery', 'accessories', 'gifts');

update public.collections c
set card_image_path = case when c.card_image_path is null or c.card_image_path like '/samples/%'
                           then '/samples/categories/new-arrivals-card.webp' else c.card_image_path end,
    banner_desktop_path = case when c.banner_desktop_path is null or c.banner_desktop_path like '/samples/%'
                           then '/samples/categories/new-arrivals-desktop.webp' else c.banner_desktop_path end,
    banner_mobile_path = case when c.banner_mobile_path is null or c.banner_mobile_path like '/samples/%'
                           then '/samples/categories/new-arrivals-mobile.webp' else c.banner_mobile_path end
where c.slug = 'new-arrivals';

update public.collections c
set card_image_path = case when c.card_image_path is null or c.card_image_path like '/samples/%'
                           then '/samples/categories/gifts-card.webp' else c.card_image_path end,
    banner_desktop_path = case when c.banner_desktop_path is null or c.banner_desktop_path like '/samples/%'
                           then '/samples/categories/gifts-desktop.webp' else c.banner_desktop_path end,
    banner_mobile_path = case when c.banner_mobile_path is null or c.banner_mobile_path like '/samples/%'
                           then '/samples/categories/gifts-mobile.webp' else c.banner_mobile_path end
where c.slug = 'gifts-under-999';

-- ---------------------------------------------------------------------------
-- Homepage: hero photos and the two banners (shape in src/services/home.ts).
-- Text the owner has already set is kept.
-- ---------------------------------------------------------------------------
update public.store_settings s
set homepage = s.homepage
  || jsonb_build_object(
       'hero',
       jsonb_build_object(
         'image_desktop', '/samples/home/hero-desktop.webp',
         'image_mobile', '/samples/home/hero-mobile.webp',
         'image_alt', 'A calm desk corner with a glowing pleated lamp, a ribbed vase of daisies and a notebook'
       ) || coalesce(
         (select jsonb_object_agg(k, v) from jsonb_each(s.homepage -> 'hero') as e(k, v)
          where not (k like 'image%' and v #>> '{}' like '/samples/%')),
         '{}'::jsonb)
     )
  || case when s.homepage ? 'banners' then '{}'::jsonb else jsonb_build_object('banners', jsonb_build_array(
       jsonb_build_object(
         'id', 'evening-light',
         'eyebrow', 'Lighting',
         'title', 'Soft light for slow evenings',
         'text', 'Pleated lamps and little night lights that make a corner feel calm.',
         'cta_label', 'Shop lighting',
         'link', '/shop/lighting',
         'tone', 'dark',
         'image_desktop', '/samples/home/banner-evening-desktop.webp',
         'image_mobile', '/samples/home/banner-evening-mobile.webp',
         'image_alt', 'A blush pleated lamp and a mushroom night lamp glowing on a bedside table'
       ),
       jsonb_build_object(
         'id', 'gift-sets',
         'eyebrow', 'Gifts',
         'title', 'Little gifts, ready to give',
         'text', 'Small, thoughtful picks under ৳999 for birthdays, thank-yous and just because.',
         'cta_label', 'Shop gifts under ৳999',
         'link', '/collections/gifts-under-999',
         'tone', 'light',
         'image_desktop', '/samples/home/banner-gifts-desktop.webp',
         'image_mobile', '/samples/home/banner-gifts-mobile.webp',
         'image_alt', 'An open kraft gift box with a candle, a notebook and a claw clip beside a ribboned box'
       )
     )) end
where s.id = 1;
