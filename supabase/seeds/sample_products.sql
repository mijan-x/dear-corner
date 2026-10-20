-- Dear Corner — SAMPLE products for testing (not real stock).
--
-- Every row here is marked: names start with "[SAMPLE]", SKUs start with
-- "SAMPLE-", and products/categories have is_sample = true.
-- Remove everything with the "Delete sample data" button in admin, or run
-- supabase/seeds/delete_sample_products.sql in the SQL editor.
--
-- Covers: color and size variants, sale prices, a low-stock variant, a sold-out
-- variant, a fully sold-out product, bestsellers, new arrivals and gifts.
-- Images are added separately (website files under /samples/).

create or replace function pg_temp.sample_product(
  p_category text,
  p_name text,
  p_sku text,
  p_short text,
  p_option text,            -- null = single "Default" variant
  p_is_color boolean,
  p_values text[],
  p_hexes text[],
  p_prices integer[],
  p_compare integer[],
  p_stocks integer[],
  p_bestseller boolean default false,
  p_gift boolean default false,
  p_new boolean default false,
  p_featured_rank integer default null
)
returns uuid
language plpgsql
as $$
declare
  v_product uuid;
  v_option uuid;
  v_value uuid;
  i integer;
begin
  insert into public.products (
    category_id, name, slug, short_description, description, details_and_care,
    status, is_bestseller, is_gift, is_featured, featured_rank, new_until, is_sample
  ) values (
    (select id from public.categories where slug = p_category),
    '[SAMPLE] ' || p_name,
    'sample-' || private.slugify(p_name),
    p_short,
    p_short || ' This is a sample product for testing the shop; it is not for sale.',
    'Sample care notes: wipe with a soft dry cloth.',
    'active', p_bestseller, p_gift, p_featured_rank is not null, p_featured_rank,
    case when p_new then now() + interval '30 days' else now() - interval '1 day' end,
    true
  )
  returning id into v_product;

  if p_option is null then
    insert into public.product_variants (product_id, sku, price, compare_at_price, stock)
    values (v_product, 'SAMPLE-' || p_sku, p_prices[1], p_compare[1], p_stocks[1]);
  else
    insert into public.product_options (product_id, name, is_color, position)
    values (v_product, p_option, p_is_color, 1)
    returning id into v_option;
    for i in 1..array_length(p_values, 1) loop
      insert into public.product_option_values (option_id, product_id, value, swatch_hex, position)
      values (v_option, v_product, p_values[i], p_hexes[i], i)
      returning id into v_value;
      insert into public.product_variants (product_id, sku, option1, price, compare_at_price, stock, position)
      values (v_product, 'SAMPLE-' || p_sku || '-' || upper(left(regexp_replace(p_values[i], '[^A-Za-z0-9]', '', 'g'), 6)),
              v_value, p_prices[i], p_compare[i], p_stocks[i], i);
    end loop;
  end if;
  return v_product;
end;
$$;

-- Sample sub-categories (for the chips on category pages)
insert into public.categories (parent_id, name, slug, position, is_sample)
select c.id, x.name, x.slug, x.pos, true
from (values
  ('room-decor', 'Vases', 'sample-vases', 1),
  ('room-decor', 'Candles', 'sample-candles', 2),
  ('lighting', 'Table lamps', 'sample-table-lamps', 1),
  ('lighting', 'Fairy lights', 'sample-fairy-lights', 2),
  ('desk-and-stationery', 'Notebooks', 'sample-notebooks', 1),
  ('desk-and-stationery', 'Desk organisers', 'sample-desk-organisers', 2)
) as x(parent, name, slug, pos)
join public.categories c on c.slug = x.parent;

select pg_temp.sample_product('sample-vases', 'Ribbed ceramic bud vase', 'VASE',
  'A small ribbed vase for one or two stems.', 'Color', true,
  array['Cream', 'Clay', 'Sage'], array['#F1E8DA', '#C98B6B', '#9CAF88'],
  array[690, 690, 690], array[null, null, null]::integer[], array[12, 3, 0],
  p_featured_rank => 2);
select pg_temp.sample_product('sample-candles', 'Bubble candle, set of 2', 'CANDLE',
  'Soy-wax bubble candles in soft ivory.', null, false,
  null, null, array[450], array[590], array[20], p_gift => true);
select pg_temp.sample_product('room-decor', 'Linen photo frame', 'FRAME',
  'A linen-wrapped frame for prints and postcards.', 'Size', false,
  array['5 x 7 in', 'A4'], array[null, null]::text[], array[520, 780], array[null, null]::integer[], array[8, 6]);
select pg_temp.sample_product('sample-table-lamps', 'Pleated table lamp', 'LAMP',
  'A pleated shade with a warm, soft glow for bedside or desk.', 'Color', true,
  array['Ivory', 'Blush'], array['#F4EEE3', '#E8C4B8'], array[1890, 1890], array[2290, 2290], array[5, 2],
  p_bestseller => true, p_featured_rank => 1);
select pg_temp.sample_product('sample-fairy-lights', 'Warm fairy lights', 'FAIRY',
  'Warm white copper-wire lights, USB powered.', 'Length', false,
  array['5 m', '10 m'], array[null, null]::text[], array[390, 590], array[null, null]::integer[], array[30, 25],
  p_bestseller => true, p_new => true);
select pg_temp.sample_product('lighting', 'Mushroom night lamp', 'MUSHROOM',
  'A small mushroom lamp with a dimmable glow.', null, false,
  null, null, array[1250], array[null]::integer[], array[0]);
select pg_temp.sample_product('sample-notebooks', 'Grid notebook A5', 'NOTEBOOK',
  'Soft-touch cover, 120 pages of 5 mm grid.', 'Color', true,
  array['Sage', 'Rosewood', 'Sand'], array['#9CAF88', '#784B4E', '#E6DDD3'],
  array[350, 350, 350], array[null, null, null]::integer[], array[40, 40, 40], p_new => true, p_featured_rank => 3);
select pg_temp.sample_product('desk-and-stationery', 'Ceramic pen holder', 'PENPOT',
  'A matte ceramic cup for pens and brushes.', null, false,
  null, null, array[480], array[null]::integer[], array[15]);
select pg_temp.sample_product('sample-desk-organisers', 'Desk organiser tray', 'TRAY',
  'A wooden tray to keep small desk things together.', null, false,
  null, null, array[990], array[1190], array[3]);
select pg_temp.sample_product('accessories', 'Canvas tote bag', 'TOTE',
  'A sturdy cotton canvas tote with an inner pocket.', 'Color', true,
  array['Natural', 'Black'], array['#E9DFCC', '#241B22'], array[650, 650], array[null, null]::integer[], array[18, 10],
  p_gift => true);
select pg_temp.sample_product('accessories', 'Claw hair clip set', 'CLIP',
  'Three matte claw clips in soft shades.', null, false,
  null, null, array[290], array[null]::integer[], array[50], p_new => true);
select pg_temp.sample_product('gifts', 'Little corner gift box', 'GIFTBOX',
  'A candle, a notebook and a clip set, wrapped and ready to give.', null, false,
  null, null, array[1490], array[null]::integer[], array[7], p_bestseller => true, p_gift => true);
