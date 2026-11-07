-- ==============================================================================
-- CNA Mobile Store — Authoritative Canonical Seed Dataset
-- Auto-generated from src/data/canonicalCatalog.json
-- Invariants: 26 Products, 46 SKUs, 296 Initial Units (215 Phones + 81 Accessories)
-- Currency: Strictly Integer Toman (BIGINT)
-- ==============================================================================

BEGIN;

-- 1. Central Logistics Warehouse
INSERT INTO public.warehouses (code, name_fa, address, postal_code, phone, manager_name, is_central, is_active)
VALUES ('WH-CENTRAL', 'انبار مرکزی تهران', 'تهران، کیلومتر ۱۴ جاده مخصوص کرج، شهرک لجستیک سپهر، بلوک C', '1389745123', '02144556677', 'مهندس سید علیرضا شمس', true, true)
ON CONFLICT (code) DO UPDATE SET
  name_fa = EXCLUDED.name_fa,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  manager_name = EXCLUDED.manager_name;

-- 2. Brands
INSERT INTO public.brands (slug, name_en, name_fa, is_featured)
VALUES ('apple', 'Apple', 'اپل', true)
ON CONFLICT (slug) DO UPDATE SET name_fa = EXCLUDED.name_fa, is_featured = EXCLUDED.is_featured;
INSERT INTO public.brands (slug, name_en, name_fa, is_featured)
VALUES ('samsung', 'Samsung', 'سامسونگ', true)
ON CONFLICT (slug) DO UPDATE SET name_fa = EXCLUDED.name_fa, is_featured = EXCLUDED.is_featured;
INSERT INTO public.brands (slug, name_en, name_fa, is_featured)
VALUES ('xiaomi', 'Xiaomi', 'شیائومی', true)
ON CONFLICT (slug) DO UPDATE SET name_fa = EXCLUDED.name_fa, is_featured = EXCLUDED.is_featured;
INSERT INTO public.brands (slug, name_en, name_fa, is_featured)
VALUES ('google', 'Google', 'گوگل', true)
ON CONFLICT (slug) DO UPDATE SET name_fa = EXCLUDED.name_fa, is_featured = EXCLUDED.is_featured;
INSERT INTO public.brands (slug, name_en, name_fa, is_featured)
VALUES ('anker', 'Anker', 'انکر', false)
ON CONFLICT (slug) DO UPDATE SET name_fa = EXCLUDED.name_fa, is_featured = EXCLUDED.is_featured;
INSERT INTO public.brands (slug, name_en, name_fa, is_featured)
VALUES ('nillkin', 'Nillkin', 'نیلکین', false)
ON CONFLICT (slug) DO UPDATE SET name_fa = EXCLUDED.name_fa, is_featured = EXCLUDED.is_featured;

-- 3. Categories
INSERT INTO public.categories (slug, title_fa, title_en, icon_name, sort_order, is_active)
VALUES ('phones', 'گوشی موبایل', 'Smartphones', 'Smartphone', 1, true)
ON CONFLICT (slug) DO UPDATE SET title_fa = EXCLUDED.title_fa, sort_order = EXCLUDED.sort_order;
INSERT INTO public.categories (slug, title_fa, title_en, icon_name, sort_order, is_active)
VALUES ('smartwatches', 'ساعت هوشمند', 'Smartwatches', 'Watch', 2, true)
ON CONFLICT (slug) DO UPDATE SET title_fa = EXCLUDED.title_fa, sort_order = EXCLUDED.sort_order;
INSERT INTO public.categories (slug, title_fa, title_en, icon_name, sort_order, is_active)
VALUES ('audio', 'هدفون و ایرپاد', 'Audio & Headphones', 'Headphones', 3, true)
ON CONFLICT (slug) DO UPDATE SET title_fa = EXCLUDED.title_fa, sort_order = EXCLUDED.sort_order;
INSERT INTO public.categories (slug, title_fa, title_en, icon_name, sort_order, is_active)
VALUES ('chargers', 'شارژر و پاوربانک', 'Chargers & Power Banks', 'BatteryCharging', 4, true)
ON CONFLICT (slug) DO UPDATE SET title_fa = EXCLUDED.title_fa, sort_order = EXCLUDED.sort_order;
INSERT INTO public.categories (slug, title_fa, title_en, icon_name, sort_order, is_active)
VALUES ('cases-screen', 'قاب و لوازم جانبی', 'Cases & Screen Protectors', 'Shield', 5, true)
ON CONFLICT (slug) DO UPDATE SET title_fa = EXCLUDED.title_fa, sort_order = EXCLUDED.sort_order;

-- 4. Warranties
CREATE TEMP TABLE temp_warranties_seed (
    idx INT PRIMARY KEY,
    provider_name VARCHAR(150),
    duration_months INT,
    coverage_fa TEXT
  ) ON COMMIT DROP;
INSERT INTO temp_warranties_seed VALUES (0, 'گارانتی ۱۸ ماهه جامع CNA Care + فعال‌سازی همتا', 18, 'ضمانت ۱۸ ماهه شرکتی کلیه قطعات سخت‌افزاری و رجیستری رسمی در سامانه همتا');
INSERT INTO temp_warranties_seed VALUES (1, 'گارانتی ۱۲ ماهه تعویض CNA Care Accessories', 12, 'ضمانت تعویض فوری ۱۲ ماهه در صورت بروز هرگونه عیب فنی کارخانه‌ای');
INSERT INTO public.warranties (provider_name, duration_months, coverage_fa, is_active)
SELECT provider_name, duration_months, coverage_fa, true
FROM temp_warranties_seed
ON CONFLICT (provider_name) DO UPDATE SET duration_months = EXCLUDED.duration_months;

-- 5. Products, Variants, and Images
-- Product: iphone-16-pro-max
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'phones';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'apple';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۸ ماهه جامع CNA Care + فعال‌سازی همتا';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'iphone-16-pro-max', v_cat_id, v_brand_id, 'گوشی موبایل اپل مدل iPhone 16 Pro Max دو سیم‌کارت', 'Apple iPhone 16 Pro Max Dual SIM 5G - Titanium Edition', 'iPhone 16 Pro Max',
    'آیفون ۱۶ پرو مکس با پردازنده قدرتمند A18 Pro، فریم تیتانیوم درجه ۵، دکمه جدید کنترل دوربین و دوربین ۴۸ مگاپیکسلی با زوم اپتیکال ۵ برابری.', 'پرچمدار ۲۰۲۴', 4.9, 142, true, true,
    '{"screen":"۶.۹ اینچ Super Retina XDR OLED","processor":"Apple A18 Pro (3nm)","mainCamera":"۴۸ مگاپیکسل فیوژن + ۴۸ مگاپیکسل اولتراواید + ۱۲ مگاپیکسل تله‌فوتو ۵X","battery":"۴۶۸۵ میلی‌آمپرساعت با شارژ سریع MagSafe","weight":"۲۲۷ گرم","os":"iOS 18","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCIFVT994X_YGWzgqB6D5mcpNaVlf0pDu5NHXuFmURSzQJYjC16UDsjk4VND1sLXUeMY-7mAGZyJFPYbrHEP5LffWiimWZGC4fMA81fF8nJOc-ilKR1CFR1KTaPPjPT4NKI7BiJGp7Xf65e9ymrhKNzvWZSAPsrGLYHgVvYVUmx4TA2wAKzwh3zrTd53ow9-ju616B9pknJy49l2kSnIhWALJOYU5YscPysDQ5fDhP_o6r8WZxc2ljKqA', true, 0);
  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDYpszsyvAqBJ7cTtRXQoeeP8mJptNSgpHPgS5PwO_tsDv0MstzES6y3Y37vyxkv3tfDeJrz1R48HtCynLKMm4rih1DlMwjWG8DHDlOAJqYwsSCsypnPP-WYgzO46pLOuBumLi1LTvJE3l71CCjphKl65PcwnK9Xky27j_uuf3LD-y_UYjarkXJ9K_gXFDLAc7XlmEtcx1KguHh0H64OEXBG3qxhVCYwTHgZDpuw7tCeBLcQBKPv4mkhQ', false, 1);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-APL-16PM-256-DES', 'تیتانیوم صحرایی', 'Desert Titanium', '#C5B4A0',
    '256GB', '8GB', 94200000, 98000000,
    80070000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-APL-16PM-256-BLK', 'تیتانیوم مشکی', 'Black Titanium', '#2A2B2D',
    '256GB', '8GB', 93800000, 97500000,
    79730000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-APL-16PM-512-DES', 'تیتانیوم صحرایی', 'Desert Titanium', '#C5B4A0',
    '512GB', '8GB', 108500000, 112000000,
    92225000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: iphone-16-pro
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'phones';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'apple';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۸ ماهه جامع CNA Care + فعال‌سازی همتا';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'iphone-16-pro', v_cat_id, v_brand_id, 'گوشی موبایل اپل مدل iPhone 16 Pro دو سیم‌کارت', 'Apple iPhone 16 Pro Dual SIM 5G - Titanium Edition', 'iPhone 16 Pro',
    'آیفون ۱۶ پرو با ابعاد متناسب ۶.۳ اینچی، فریم تیتانیومی سبک، تراشه A18 Pro و سیستم دوربین پیشرفته سه گانه.', 'پیشنهاد ویژه', 4.8, 89, true, true,
    '{"screen":"۶.۳ اینچ Super Retina XDR OLED","processor":"Apple A18 Pro (3nm)","mainCamera":"۴۸ مگاپیکسل + ۴۸ مگاپیکسل + ۱۲ مگاپیکسل ۵X","battery":"۳۵۸۲ میلی‌آمپرساعت","weight":"۱۹۹ گرم","os":"iOS 18","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDYpszsyvAqBJ7cTtRXQoeeP8mJptNSgpHPgS5PwO_tsDv0MstzES6y3Y37vyxkv3tfDeJrz1R48HtCynLKMm4rih1DlMwjWG8DHDlOAJqYwsSCsypnPP-WYgzO46pLOuBumLi1LTvJE3l71CCjphKl65PcwnK9Xky27j_uuf3LD-y_UYjarkXJ9K_gXFDLAc7XlmEtcx1KguHh0H64OEXBG3qxhVCYwTHgZDpuw7tCeBLcQBKPv4mkhQ', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-APL-16P-256-NAT', 'تیتانیوم طبیعی', 'Natural Titanium', '#8E8B82',
    '256GB', '8GB', 83500000, 86000000,
    70975000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-APL-16P-256-WHT', 'تیتانیوم سفید', 'White Titanium', '#E3E4E5',
    '256GB', '8GB', 83900000, 86500000,
    71315000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: iphone-16-plus
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'phones';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'apple';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۸ ماهه جامع CNA Care + فعال‌سازی همتا';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'iphone-16-plus', v_cat_id, v_brand_id, 'گوشی موبایل اپل مدل iPhone 16 Plus دو سیم‌کارت', 'Apple iPhone 16 Plus Dual SIM 5G', 'iPhone 16 Plus',
    'آیفون ۱۶ پلاس با نمایشگر بزرگ ۶.۷ اینچی و بالاترین میزان نگهداری شارژ باتری در بین گوشی‌های آیفون.', 'شارژدهی فوق‌العاده', 4.7, 45, true, false,
    '{"screen":"۶.۷ اینچ Super Retina XDR OLED","processor":"Apple A18 (3nm)","mainCamera":"۴۸ مگاپیکسل فیوژن + ۱۲ مگاپیکسل اولتراواید","battery":"۴۶۷۴ میلی‌آمپرساعت","weight":"۱۹۹ گرم","os":"iOS 18","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCnhMSBj-r1d_rG__Jqa8cjnApWRYRTihPMGHKWdNdZbXvyaJctP1Khen0nqBIUk3D8vkkpjEtlqQ8r1BUUjUCjJrwmV0md9GU-XjK0Qz-P0X76jAOFMg0WDTTWr16z6a5qHuWD99Hapr3S9q39z7R-WbaXNWw5rQAVxdLB8lTMS3f13NH8ZRRzJdLiDzCL8VxAvJ8jHyoRZtM_qX-DRHPLYDJbBUFodOS2vNGj_K1FqzWZaZmx9xpWyA', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-APL-16PL-128-BLU', 'آبی اقیانوسی', 'Ultramarine', '#3B5998',
    '128GB', '8GB', 67500000, 69900000,
    57375000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-APL-16PL-256-PNK', 'صورتی ملایم', 'Pink', '#FAD0C4',
    '256GB', '8GB', 74500000, 77000000,
    63325000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: iphone-16
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'phones';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'apple';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۸ ماهه جامع CNA Care + فعال‌سازی همتا';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'iphone-16', v_cat_id, v_brand_id, 'گوشی موبایل اپل مدل iPhone 16 دو سیم‌کارت', 'Apple iPhone 16 Dual SIM 5G', 'iPhone 16',
    'آیفون ۱۶ با پردازنده A18، دکمه اکشن، کنترل دوربین لمسی و عکاسی ماکرو قدرتمند در رنگ‌های بسیار شاداب.', 'نسل جدید', 4.8, 67, true, true,
    '{"screen":"۶.۱ اینچ Super Retina XDR OLED","processor":"Apple A18 (3nm)","mainCamera":"۴۸ مگاپیکسل + ۱۲ مگاپیکسل","battery":"۳۵۶۱ میلی‌آمپرساعت","weight":"۱۷۰ گرم","os":"iOS 18","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuC5kSzm6rGNtqf2TLpCwNu3ngxb9coi9iSj3QP6EdRafiq_uV5dseNVJhtt8ZVDc7hEuEaCmB6Pt5L41IdCFFu6KkDOGXlYJU6805lV8aANbzQeCYURmSztbBDZO5-x8pM9chD8nL8sf6CbwMIZ5SfKfPA2Yz4fZ40W19NEzC9TPHLHBjCFU7T-8-N4mBNYlgSbPEWXP1s-aU1qd9awBg_91nBy3Z3x6f9u9S7eBPPXK4LaGosIaDvPHw', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-APL-16-128-BLK', 'مشکی عمیق', 'Black', '#1F2022',
    '128GB', '8GB', 58500000, 61000000,
    49725000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-APL-16-128-WHT', 'سفید کریستالی', 'White', '#F5F5F7',
    '128GB', '8GB', 58800000, 61200000,
    49980000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: iphone-15
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'phones';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'apple';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۸ ماهه جامع CNA Care + فعال‌سازی همتا';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'iphone-15', v_cat_id, v_brand_id, 'گوشی موبایل اپل مدل iPhone 15 دو سیم‌کارت', 'Apple iPhone 15 Dual SIM 5G', 'iPhone 15',
    'آیفون ۱۵ با درگاه مدرن USB-C، داینامیک آیلند هوشمند و دوربین ۴۸ مگاپیکسلی با تفکیک رنگ فوق‌العاده.', 'پرفروش‌ترین', 4.7, 115, true, false,
    '{"screen":"۶.۱ اینچ Super Retina XDR OLED","processor":"Apple A16 Bionic (4nm)","mainCamera":"۴۸ مگاپیکسل + ۱۲ مگاپیکسل","battery":"۳۳۴۹ میلی‌آمپرساعت","weight":"۱۷۱ گرم","os":"iOS 17 (قابل ارتقا)","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCnhMSBj-r1d_rG__Jqa8cjnApWRYRTihPMGHKWdNdZbXvyaJctP1Khen0nqBIUk3D8vkkpjEtlqQ8r1BUUjUCjJrwmV0md9GU-XjK0Qz-P0X76jAOFMg0WDTTWr16z6a5qHuWD99Hapr3S9q39z7R-WbaXNWw5rQAVxdLB8lTMS3f13NH8ZRRzJdLiDzCL8VxAvJ8jHyoRZtM_qX-DRHPLYDJbBUFodOS2vNGj_K1FqzWZaZmx9xpWyA', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-APL-15-128-BLU', 'آبی روشن', 'Blue', '#D4E3EA',
    '128GB', '6GB', 51200000, 53500000,
    43520000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-APL-15-128-BLK', 'مشکی', 'Black', '#2D2E30',
    '128GB', '6GB', 50900000, 53000000,
    43265000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: galaxy-s24-ultra
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'phones';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'samsung';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۸ ماهه جامع CNA Care + فعال‌سازی همتا';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'galaxy-s24-ultra', v_cat_id, v_brand_id, 'گوشی موبایل سامسونگ مدل Galaxy S24 Ultra 5G', 'Samsung Galaxy S24 Ultra 5G Titanium', 'Galaxy S24 Ultra',
    'پرچمدار سامسونگ مجهز به قلم S-Pen داخلی، شیشه ضدانعکاس Gorilla Armor، زوم ۱۰۰ برابری و ابزارهای هوش مصنوعی ترجمه و ویرایش عکس.', 'هوش مصنوعی Galaxy AI', 4.9, 164, true, true,
    '{"screen":"۶.۸ اینچ Dynamic LTPO AMOLED 2X 120Hz","processor":"Snapdragon 8 Gen 3 for Galaxy (4nm)","mainCamera":"۲۰۰ مگاپیکسل + ۵۰ مگاپیکسل + ۱۰ مگاپیکسل + ۱۲ مگاپیکسل","battery":"۵۰۰۰ میلی‌آمپرساعت با شارژ سریع ۴۵ وات","weight":"۲۳۲ گرم","os":"Android 14 با ۷ سال آپدیت تضمینی","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFj_12J2d7vWd8_Kj8Q10i4B_W8aW9j6L5vK4bN2p1m0L8vQ4tW2y6U4o8P0w2X4z6B8n0M2q4T6v8X0z2A4c6E8g0I2k4M6o8', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-SAM-S24U-256-GRY', 'خاکستری تیتانیوم', 'Titanium Gray', '#68696E',
    '256GB', '12GB', 72500000, 75000000,
    61625000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-SAM-S24U-256-VIO', 'بنفش تیتانیوم', 'Titanium Violet', '#4E4B5C',
    '256GB', '12GB', 72200000, 74800000,
    61370000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-SAM-S24U-512-BLK', 'مشکی تیتانیوم', 'Titanium Black', '#2B2B2C',
    '512GB', '12GB', 81500000, 84500000,
    69275000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: galaxy-s24-plus
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'phones';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'samsung';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۸ ماهه جامع CNA Care + فعال‌سازی همتا';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'galaxy-s24-plus', v_cat_id, v_brand_id, 'گوشی موبایل سامسونگ مدل Galaxy S24 Plus 5G', 'Samsung Galaxy S24+ 5G', 'Galaxy S24+',
    'گلکسی اس ۲۴ پلاس با رزولوشن نمایشگر Quad HD+، باتری حجیم ۴۹۰۰ میلی‌آمپری و ۱۲ گیگابایت رم برای اجرای روان‌ترین بازی‌ها.', 'تعادل بی‌نظیر قدرت', 4.8, 58, true, false,
    '{"screen":"۶.۷ اینچ Dynamic AMOLED 2X QHD+ 120Hz","processor":"Exynos 2400 (4nm)","mainCamera":"۵۰ مگاپیکسل + ۱۰ مگاپیکسل + ۱۲ مگاپیکسل","battery":"۴۹۰۰ میلی‌آمپرساعت","weight":"۱۹۶ گرم","os":"Android 14","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFj_12J2d7vWd8_Kj8Q10i4B_W8aW9j6L5vK4bN2p1m0L8vQ4tW2y6U4o8P0w2X4z6B8n0M2q4T6v8X0z2A4c6E8g0I2k4M6o8', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-SAM-S24P-256-BLK', 'مشکی اونیکس', 'Onyx Black', '#222222',
    '256GB', '12GB', 55800000, 58000000,
    47430000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-SAM-S24P-256-GRY', 'خاکستری مرمرین', 'Marble Gray', '#B8B9B7',
    '256GB', '12GB', 55500000, 57900000,
    47175000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: galaxy-s24
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'phones';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'samsung';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۸ ماهه جامع CNA Care + فعال‌سازی همتا';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'galaxy-s24', v_cat_id, v_brand_id, 'گوشی موبایل سامسونگ مدل Galaxy S24 5G', 'Samsung Galaxy S24 5G', 'Galaxy S24',
    'گلکسی اس ۲۴ پرچمداری جمع‌وجور با حاشیه‌های بسیار باریک، وزن سبک ۱۶۷ گرمی و پردازش هوش مصنوعی در دستان شما.', 'خوش‌دست و کامپکت', 4.7, 82, true, true,
    '{"screen":"۶.۲ اینچ Dynamic AMOLED 2X FHD+ 120Hz","processor":"Exynos 2400 (4nm)","mainCamera":"۵۰ مگاپیکسل + ۱۰ مگاپیکسل + ۱۲ مگاپیکسل","battery":"۴۰۰۰ میلی‌آمپرساعت","weight":"۱۶۷ گرم","os":"Android 14","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFj_12J2d7vWd8_Kj8Q10i4B_W8aW9j6L5vK4bN2p1m0L8vQ4tW2y6U4o8P0w2X4z6B8n0M2q4T6v8X0z2A4c6E8g0I2k4M6o8', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-SAM-S24-128-VIO', 'بنفش کبالت', 'Cobalt Violet', '#433D52',
    '128GB', '8GB', 44500000, 46500000,
    37825000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-SAM-S24-256-YEL', 'زرد کهربایی', 'Amber Yellow', '#F0E4B7',
    '256GB', '8GB', 48200000, 50500000,
    40970000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: galaxy-s23-fe
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'phones';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'samsung';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۸ ماهه جامع CNA Care + فعال‌سازی همتا';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'galaxy-s23-fe', v_cat_id, v_brand_id, 'گوشی موبایل سامسونگ مدل Galaxy S23 FE 5G', 'Samsung Galaxy S23 FE 5G', 'Galaxy S23 FE',
    'نسخه طرفداران سامسونگ با تجربه پرچمدار در قالب قیمتی اقتصادی، مجهز به دوربین ۵۰ مگاپیکسلی و بدنه شیشه‌ای آلومینیومی.', 'ارزش خرید بالا', 4.6, 139, true, false,
    '{"screen":"۶.۴ اینچ Dynamic AMOLED 2X 120Hz","processor":"Exynos 2200 (4nm)","mainCamera":"۵۰ مگاپیکسل + ۸ مگاپیکسل + ۱۲ مگاپیکسل","battery":"۴۵۰۰ میلی‌آمپرساعت","weight":"۲۰۹ گرم","os":"Android 13 (ارتقا به 14)","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFj_12J2d7vWd8_Kj8Q10i4B_W8aW9j6L5vK4bN2p1m0L8vQ4tW2y6U4o8P0w2X4z6B8n0M2q4T6v8X0z2A4c6E8g0I2k4M6o8', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-SAM-S23FE-256-GRP', 'گرافیتی', 'Graphite', '#363839',
    '256GB', '8GB', 28400000, 30000000,
    24140000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-SAM-S23FE-256-MNT', 'نعنایی', 'Mint', '#C8E2D4',
    '256GB', '8GB', 28600000, 30200000,
    24310000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: galaxy-a55
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'phones';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'samsung';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۸ ماهه جامع CNA Care + فعال‌سازی همتا';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'galaxy-a55', v_cat_id, v_brand_id, 'گوشی موبایل سامسونگ مدل Galaxy A55 5G', 'Samsung Galaxy A55 5G', 'Galaxy A55',
    'میان‌رده پریمیوم سامسونگ با فریم فلزی صیقلی، محافظت گوریلا گلس ویکتوس پلاس و پردازنده گرافیکی قدرتمند بر پایه معماری AMD.', 'پرفروش‌ترین میان‌رده', 4.8, 210, true, true,
    '{"screen":"۶.۶ اینچ Super AMOLED 120Hz HDR10+","processor":"Exynos 1480 (4nm)","mainCamera":"۵۰ مگاپیکسل OIS + ۱۲ مگاپیکسل + ۵ مگاپیکسل","battery":"۵۰۰۰ میلی‌آمپرساعت","weight":"۲۱۳ گرم","os":"Android 14","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFj_12J2d7vWd8_Kj8Q10i4B_W8aW9j6L5vK4bN2p1m0L8vQ4tW2y6U4o8P0w2X4z6B8n0M2q4T6v8X0z2A4c6E8g0I2k4M6o8', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-SAM-A55-256-NAV', 'سرمه‌ای جذاب', 'Awesome Navy', '#232A36',
    '256GB', '8GB', 21800000, 23200000,
    18530000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-SAM-A55-256-BLU', 'آبی یخی', 'Awesome Iceblue', '#D4E6F1',
    '256GB', '8GB', 21900000, 23300000,
    18615000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: xiaomi-14-ultra
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'phones';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'xiaomi';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۸ ماهه جامع CNA Care + فعال‌سازی همتا';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'xiaomi-14-ultra', v_cat_id, v_brand_id, 'گوشی موبایل شیائومی مدل Xiaomi 14 Ultra 5G', 'Xiaomi 14 Ultra 5G Leica Quad-Camera', 'Xiaomi 14 Ultra',
    'شاهکار مشترک لایکا و شیائومی با سنسور یک اینچی LYT-900، دیافراگم متغیر بدون پله و بدنه چرم نانو با استحکام بدنه استثنایی.', 'غول عکاسی لایکا', 4.9, 78, true, true,
    '{"screen":"۶.۷۳ اینچ LTPO AMOLED WQHD+ 120Hz 3000 nits","processor":"Snapdragon 8 Gen 3 (4nm)","mainCamera":"چهارگانه ۵۰ مگاپیکسل با لنزهای Summilux لایکا","battery":"۵۰۰۰ میلی‌آمپرساعت با شارژ ۹۰ وات و وایرلس ۸۰ وات","weight":"۲۱۹.۸ گرم","os":"HyperOS بر پایه Android 14","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3V1C5m8K0l7P2q4T6v8X0z2A4c6E8g0I2k4M6o8P0w2X4z6B8n0M2q4T6v8X0z2A4c6E8g0I2k4M6o8P0w2X4z6B8n0M2', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-XMI-14U-512-BLK', 'مشکی چرم نانو', 'Black', '#212121',
    '512GB', '16GB', 74900000, 78000000,
    63665000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-XMI-14U-512-WHT', 'سفید سرامیکی', 'White', '#F8F9FA',
    '512GB', '16GB', 75200000, 78500000,
    63920000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: xiaomi-14
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'phones';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'xiaomi';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۸ ماهه جامع CNA Care + فعال‌سازی همتا';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'xiaomi-14', v_cat_id, v_brand_id, 'گوشی موبایل شیائومی مدل Xiaomi 14 5G', 'Xiaomi 14 5G Compact Flagship', 'Xiaomi 14',
    'پرچمدار خوش‌دست و پرقدرت با لنزهای اپتیکال لایکا، نمایشگر ۶.۳۶ اینچی خیره‌کننده با روشنایی ۳۰۰۰ نیت و شارژ سریع ۹۰ وات.', 'پرچمدار کامپکت', 4.8, 63, true, false,
    '{"screen":"۶.۳۶ اینچ LTPO OLED 120Hz Dolby Vision","processor":"Snapdragon 8 Gen 3 (4nm)","mainCamera":"سه گانه ۵۰ مگاپیکسل با اپتیک لایکا","battery":"۴۶۱۰ میلی‌آمپرساعت","weight":"۱۹۳ گرم","os":"HyperOS","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3V1C5m8K0l7P2q4T6v8X0z2A4c6E8g0I2k4M6o8P0w2X4z6B8n0M2q4T6v8X0z2A4c6E8g0I2k4M6o8P0w2X4z6B8n0M2', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-XMI-14-512-GRN', 'سبز یشمی', 'Jade Green', '#556B2F',
    '512GB', '12GB', 51500000, 54000000,
    43775000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-XMI-14-512-BLK', 'مشکی مات', 'Black', '#232323',
    '512GB', '12GB', 51200000, 53800000,
    43520000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: xiaomi-13t-pro
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'phones';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'xiaomi';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۸ ماهه جامع CNA Care + فعال‌سازی همتا';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'xiaomi-13t-pro', v_cat_id, v_brand_id, 'گوشی موبایل شیائومی مدل Xiaomi 13T Pro 5G', 'Xiaomi 13T Pro 5G Leica', 'Xiaomi 13T Pro',
    'گوشی پرچمدار اقتصادی شیائومی با نرخ نوسازی شگفت‌انگیز ۱۴۴ هرتز، گواهی ضدآب IP68 و شارژ ۱۰۰ درصد در ۱۹ دقیقه.', 'شارژ فوق‌سریع ۱۲۰W', 4.7, 94, true, false,
    '{"screen":"۶.۶۷ اینچ CrystalRes AMOLED 144Hz","processor":"MediaTek Dimensity 9200+ (4nm)","mainCamera":"۵۰ مگاپیکسل لایکا + ۵۰ مگاپیکسل تله‌فوتو + ۱۲ مگاپیکسل","battery":"۵۰۰۰ میلی‌آمپرساعت با هایپرشارژ ۱۲۰ وات","weight":"۲۰۶ گرم","os":"MIUI 14 قابل ارتقا به HyperOS","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3V1C5m8K0l7P2q4T6v8X0z2A4c6E8g0I2k4M6o8P0w2X4z6B8n0M2q4T6v8X0z2A4c6E8g0I2k4M6o8P0w2X4z6B8n0M2', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-XMI-13TP-512-BLU', 'آبی آلپاین (چرم)', 'Alpine Blue', '#5A728E',
    '512GB', '12GB', 34800000, 36900000,
    29580000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-XMI-13TP-512-BLK', 'مشکی شیشه‌ای', 'Black', '#1A1A1A',
    '512GB', '12GB', 34500000, 36500000,
    29325000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: poco-f6-pro
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'phones';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'xiaomi';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۸ ماهه جامع CNA Care + فعال‌سازی همتا';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'poco-f6-pro', v_cat_id, v_brand_id, 'گوشی موبایل شیائومی مدل POCO F6 Pro 5G', 'Xiaomi POCO F6 Pro 5G Gaming', 'POCO F6 Pro',
    'قاتل پرچمدار گیمینگ مجهز به پردازنده اسنپدراگون 8 Gen 2، خنک‌کننده اتاق بخار LiquidCool 4.0 و نمایشگر فوق شفاف WQHD+.', 'هیولای گیمینگ', 4.8, 112, true, true,
    '{"screen":"۶.۶۷ اینچ Flow AMOLED WQHD+ 120Hz 4000 nits","processor":"Snapdragon 8 Gen 2 (4nm)","mainCamera":"۵۰ مگاپیکسل با لرزشگیر اپتیکال OIS","battery":"۵۰۰۰ میلی‌آمپرساعت با هایپرشارژ ۱۲۰ وات","weight":"۲۰۹ گرم","os":"HyperOS","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3V1C5m8K0l7P2q4T6v8X0z2A4c6E8g0I2k4M6o8P0w2X4z6B8n0M2q4T6v8X0z2A4c6E8g0I2k4M6o8P0w2X4z6B8n0M2', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-XMI-F6P-512-BLK', 'مشکی کربنی', 'Black', '#1E1E1E',
    '512GB', '12GB', 28900000, 30500000,
    24565000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-XMI-F6P-512-WHT', 'سفید ماهتابی', 'White', '#EAEAEA',
    '512GB', '12GB', 29100000, 30800000,
    24735000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: poco-x6-pro
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'phones';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'xiaomi';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۸ ماهه جامع CNA Care + فعال‌سازی همتا';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'poco-x6-pro', v_cat_id, v_brand_id, 'گوشی موبایل شیائومی مدل POCO X6 Pro 5G', 'Xiaomi POCO X6 Pro 5G', 'POCO X6 Pro',
    'سریع‌ترین گوشی میان‌رده با چیپست Dimensity 8300-Ultra، حافظه فوق سریع UFS 4.0 و نمایشگر کم‌حاشیه ۱.۵K.', 'قهرمان سرعت و قدرت', 4.8, 185, true, false,
    '{"screen":"۶.۶۷ اینچ CrystalRes AMOLED 120Hz","processor":"MediaTek Dimensity 8300-Ultra (4nm)","mainCamera":"۶۴ مگاپیکسل OIS + ۸ مگاپیکسل + ۲ مگاپیکسل","battery":"۵۰۰۰ میلی‌آمپرساعت با توربوشارژ ۶۷ وات","weight":"۱۸۶ گرم","os":"HyperOS","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3V1C5m8K0l7P2q4T6v8X0z2A4c6E8g0I2k4M6o8P0w2X4z6B8n0M2q4T6v8X0z2A4c6E8g0I2k4M6o8P0w2X4z6B8n0M2', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-XMI-X6P-256-YEL', 'زرد اختصاصی پوکو', 'Poco Yellow', '#FFCE00',
    '256GB', '8GB', 18200000, 19500000,
    15470000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-XMI-X6P-256-GRY', 'خاکستری تیتانیومی', 'Gray', '#505050',
    '256GB', '8GB', 17950000, 19200000,
    15257500, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: pixel-9-pro-xl
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'phones';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'google';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۸ ماهه جامع CNA Care + فعال‌سازی همتا';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'pixel-9-pro-xl', v_cat_id, v_brand_id, 'گوشی موبایل گوگل مدل Pixel 9 Pro XL 5G', 'Google Pixel 9 Pro XL 5G', 'Pixel 9 Pro XL',
    'برترین دستاورد هوش مصنوعی گوگل با تراشه قدرتمند Tensor G4، دوربین پریسکوپ حرفه‌ای، ۱۶ گیگابایت رم و ۷ سال پشتیبانی تضمینی اندروید خالص.', 'هوش مصنوعی Gemini Pro', 4.9, 52, true, true,
    '{"screen":"۶.۸ اینچ Super Actua LTPO OLED 120Hz 3000 nits","processor":"Google Tensor G4 (4nm)","mainCamera":"۵۰ مگاپیکسل + ۴۸ مگاپیکسل پریسکوپ ۵X + ۴۸ مگاپیکسل اولتراواید","battery":"۵۰۶۰ میلی‌آمپرساعت با شارژ سریع ۳۷ وات","weight":"۲۲۱ گرم","os":"Android 14 خالص با دسترسی مستقیم Gemini","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFj_12J2d7vWd8_Kj8Q10i4B_W8aW9j6L5vK4bN2p1m0L8vQ4tW2y6U4o8P0w2X4z6B8n0M2q4T6v8X0z2A4c6E8g0I2k4M6o8', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-GGL-P9PXL-256-OBS', 'ابسیدین مشکی', 'Obsidian', '#1F2124',
    '256GB', '16GB', 77500000, 81000000,
    65875000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-GGL-P9PXL-256-PRC', 'سفید چینی', 'Porcelain', '#F5F4F0',
    '256GB', '16GB', 77800000, 81500000,
    66130000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: pixel-9
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'phones';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'google';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۸ ماهه جامع CNA Care + فعال‌سازی همتا';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'pixel-9', v_cat_id, v_brand_id, 'گوشی موبایل گوگل مدل Pixel 9 5G', 'Google Pixel 9 5G', 'Pixel 9',
    'طراحی مدرن نوار دوربین شیشه‌ای، دستیار هوشمند Gemini Live، قابلیت افزودن عکاس به عکس دسته‌جمعی (Add Me) و نمایشگر فوق روشن Actua.', 'هوشمند و روان', 4.7, 41, true, false,
    '{"screen":"۶.۳ اینچ Actua OLED 120Hz 2700 nits","processor":"Google Tensor G4 (4nm)","mainCamera":"۵۰ مگاپیکسل عریض + ۴۸ مگاپیکسل فوق عریض","battery":"۴۷۰۰ میلی‌آمپرساعت","weight":"۱۹۸ گرم","os":"Android 14 خالص","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFj_12J2d7vWd8_Kj8Q10i4B_W8aW9j6L5vK4bN2p1m0L8vQ4tW2y6U4o8P0w2X4z6B8n0M2q4T6v8X0z2A4c6E8g0I2k4M6o8', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-GGL-P9-128-PEO', 'صورتی گل صدتومانی', 'Peony', '#ECA0B2',
    '128GB', '12GB', 56200000, 58500000,
    47770000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-GGL-P9-256-OBS', 'مشکی ابسیدین', 'Obsidian', '#1F2124',
    '256GB', '12GB', 61900000, 64500000,
    52615000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: pixel-8a
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'phones';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'google';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۸ ماهه جامع CNA Care + فعال‌سازی همتا';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'pixel-8a', v_cat_id, v_brand_id, 'گوشی موبایل گوگل مدل Pixel 8a 5G', 'Google Pixel 8a 5G', 'Pixel 8a',
    'بهترین گزینه خرید اقتصادی گوگل با تراشه Tensor G3، نرخ نوسازی ۱۲۰ هرتز، پاک‌کننده جادویی صدا و تصویر و ضدآب بودن با IP67.', 'بهترین دوربین میان‌رده', 4.8, 87, true, false,
    '{"screen":"۶.۱ اینچ Actua OLED 120Hz","processor":"Google Tensor G3 (4nm)","mainCamera":"۶۴ مگاپیکسل OIS + ۱۳ مگاپیکسل اولتراواید","battery":"۴۴۹۲ میلی‌آمپرساعت","weight":"۱۸۸ گرم","os":"Android 14 خالص","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFj_12J2d7vWd8_Kj8Q10i4B_W8aW9j6L5vK4bN2p1m0L8vQ4tW2y6U4o8P0w2X4z6B8n0M2q4T6v8X0z2A4c6E8g0I2k4M6o8', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-GGL-P8A-128-BAY', 'آبی خلیجی', 'Bay', '#8FB2DE',
    '128GB', '8GB', 31200000, 32900000,
    26520000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-GGL-P8A-128-OBS', 'مشکی ابسیدین', 'Obsidian', '#212121',
    '128GB', '8GB', 30900000, 32500000,
    26265000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: apple-watch-ultra-2
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'smartwatches';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'apple';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۲ ماهه تعویض CNA Care Accessories';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'apple-watch-ultra-2', v_cat_id, v_brand_id, 'ساعت هوشمند اپل مدل Apple Watch Ultra 2 بند تیتانیومی ۴۹ میلی‌متری', 'Apple Watch Ultra 2 GPS + Cellular 49mm Titanium', 'Apple Watch Ultra 2',
    'سخت‌جان‌ترین ساعت اپل با بدنه تیتانیوم ۴۹ میلی‌متری، روشنایی خیره‌کننده ۳۰۰۰ نیت، سنسور عمق‌سنج غواصی و باتری تا ۷۲ ساعت در حالت کم‌مصرف.', 'ماجراجویی بی‌مرز', 4.9, 49, true, true,
    '{"screen":"۱.۹۲ اینچ Always-On Retina LTPO OLED 3000 nits","processor":"Apple S9 SiP با دوال‌کر NPU","battery":"تا ۳۶ ساعت مصرف معمولی، ۷۲ ساعت کم‌مصرف","weight":"۶۱.۴ گرم","resistance":"ضدآب تا ۱۰۰ متر و غواصی تا ۴۰ متر EN13319","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-1rZ2WbQ2c_GgBv6wT2dE8jK6m0P4s8U2x6A8c0E2g4I6k8M0o2Q4s6U8w0Y2a4C6e8G0i2K4m6O8q0S2u4W6y8A0c2E4g6I8', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-ACC-AWU2-49', 'تیتانیوم طبیعی', 'Natural Titanium', '#8E8B82',
    '64GB', 'استاندارد', 48500000, 51000000,
    41225000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: airpods-pro-2-usbc
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'audio';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'apple';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۲ ماهه تعویض CNA Care Accessories';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'airpods-pro-2-usbc', v_cat_id, v_brand_id, 'هدفون بی‌سیم اپل مدل AirPods Pro 2 با درگاه USB-C', 'Apple AirPods Pro (2nd generation) with MagSafe Case USB-C', 'AirPods Pro 2 USB-C',
    'ایرپاد پرو ۲ با تراشه H2، حذف نویز هوشمند دو برابر نسل قبل، صدای فضایی سفارشی و کیس شارژ مجهز به اسپیکر جستجو و درگاه تایپ‌سی.', 'حذف نویز فعال ۲X', 4.9, 178, true, true,
    '{"chip":"Apple H2 در هدفون، U1 در کیس شارژ","battery":"تا ۶ ساعت پخش مداوم، ۳۰ ساعت با کیس","featuresFa":"حذف نویز فعال (ANC)، صدای شفاف Adaptive Audio، ضد آب IP54","port":"USB-C و پشتیبانی کامل از شارژر MagSafe و اپل واچ","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQy2c_GgBv6wT2dE8jK6m0P4s8U2x6A8c0E2g4I6k8M0o2Q4s6U8w0Y2a4C6e8G0i2K4m6O8q0S2u4W6y8A0c2E4g6I8k0M2q4', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-ACC-APP2-TYPC', 'سفید براق', 'White', '#FFFFFF',
    'استاندارد', 'استاندارد', 14200000, 15500000,
    12070000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: galaxy-buds-2-pro
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'audio';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'samsung';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۲ ماهه تعویض CNA Care Accessories';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'galaxy-buds-2-pro', v_cat_id, v_brand_id, 'هدفون بی‌سیم سامسونگ مدل Galaxy Buds 2 Pro', 'Samsung Galaxy Buds 2 Pro Hi-Fi Sound', 'Galaxy Buds 2 Pro',
    'طراحی ارگونومیک ۱۵ درصد کوچک‌تر، صدای استودیویی ۲۴ بیت بی‌نقص، حذف نویز فعال هوشمند سه جهته و گواهی ضدآب IPX7.', 'صدای ۲۴ بیتی Hi-Fi', 4.7, 89, true, false,
    '{"audio":"صدای استودیویی ۲۴ بیتی Hi-Fi با کدک SSC","anc":"حذف نویز هوشمند با ۳ میکروفون High-SNR","battery":"تا ۵ ساعت با ANC روشن، ۱۸ ساعت با کیس","resistance":"مقاومت در برابر آب تا عمق ۱ متر به مدت ۳۰ دقیقه (IPX7)","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-1rZ2WbQ2c_GgBv6wT2dE8jK6m0P4s8U2x6A8c0E2g4I6k8M0o2Q4s6U8w0Y2a4C6e8G0i2K4m6O8q0S2u4W6y8A0c2E4g6I8', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-ACC-GB2P-BLK', 'مشکی گرافیتی', 'Graphite', '#2C2D30',
    'استاندارد', 'استاندارد', 7450000, 8200000,
    6332500, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: anker-737-powerbank
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'chargers';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'anker';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۲ ماهه تعویض CNA Care Accessories';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'anker-737-powerbank', v_cat_id, v_brand_id, 'پاوربانک فست شارژ انکر مدل Anker 737 Power Bank (PowerCore 24K)', 'Anker 737 Power Bank (PowerCore 24K) 140W Output', 'Anker 737 PowerCore 24K',
    'پاوربانک پرچمدار با توان خروجی ۱۴۰ وات PD 3.1، نمایشگر دیجیتالی هوشمند برای پایش دقیق ولتاژ و آمپر لحظه‌ای و ظرفیت ۲۴۰۰۰ میلی‌آمپر.', 'توان فوق‌العاده ۱۴۰ وات', 4.9, 65, true, true,
    '{"capacity":"۲۴۰۰۰ میلی‌آمپرساعت (86.4Wh)","maxOutput":"۱۴۰ وات فوق‌سریع دوطرفه","ports":"دو پورت USB-C و یک پورت USB-A","display":"نمایشگر رنگی هوشمند نمایش توان، درصد باتری و زمان باقی‌مانده","weight":"۶۳۰ گرم","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQy2c_GgBv6wT2dE8jK6m0P4s8U2x6A8c0E2g4I6k8M0o2Q4s6U8w0Y2a4C6e8G0i2K4m6O8q0S2u4W6y8A0c2E4g6I8k0M2q4', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-ACC-ANK-737', 'خاکستری تیره', 'Dark Gray', '#3A3D40',
    '24000mAh', '140W', 7950000, 8800000,
    6757500, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: anker-30w-gan-charger
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'chargers';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'anker';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۲ ماهه تعویض CNA Care Accessories';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'anker-30w-gan-charger', v_cat_id, v_brand_id, 'شارژر دیواری ۳۰ وات انکر مدل Anker 511 Charger (Nano 3)', 'Anker 511 Charger (Nano 3, 30W) GaN', 'Anker 511 Nano 3',
    'شارژر دیواری فوق‌العاده جمع‌وجور GaN مجهز به فناوری PowerIQ 3.0، شارژ فوق سریع برای آیفون، آیپد و سامسونگ با ایمنی دمایی کامل.', 'کوچک‌ترین شارژر GaN', 4.8, 144, true, false,
    '{"output":"۳۰ وات Power Delivery","technology":"فناوری نیترید گالیوم GaN","ports":"یک پورت USB-C با کنترل هوشمند حرارت ActiveShield 2.0","compatibility":"سازگار با کلیه مدل‌های آیفون و سامسونگ","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQy2c_GgBv6wT2dE8jK6m0P4s8U2x6A8c0E2g4I6k8M0o2Q4s6U8w0Y2a4C6e8G0i2K4m6O8q0S2u4W6y8A0c2E4g6I8k0M2q4', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-ACC-ANK-30W', 'سفید مات', 'White', '#F9F9F9',
    '30W', 'GaN', 1650000, 1850000,
    1402500, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: nillkin-screen-protector
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'cases-screen';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'nillkin';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۲ ماهه تعویض CNA Care Accessories';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'nillkin-screen-protector', v_cat_id, v_brand_id, 'محافظ صفحه نمایش نیلکین مدل Amazing CP+ Pro برای iPhone 16 Pro Max', 'Nillkin Amazing CP+ Pro Anti-Explosion Glass for iPhone 16 Pro Max', 'Nillkin CP+ Pro',
    'شیشه ژاپنی AGC با لبه‌های قوس‌دار 2.5D، پوشش اولئوفوبیک ضداثرانگشت فوق‌العاده لغزنده و شفافیت ۹۹.۹ درصدی بدون افت کیفیت نمایشگر.', 'سختی الماس 9H', 4.8, 92, true, false,
    '{"material":"شیشه سکوریت نانو AGC ژاپن","hardness":"درجه سختی 9H ضدخط و خش عمیق","thickness":"ضخامت فوق‌باریک ۰.۳۳ میلی‌متر با چسب کامل","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQy2c_GgBv6wT2dE8jK6m0P4s8U2x6A8c0E2g4I6k8M0o2Q4s6U8w0Y2a4C6e8G0i2K4m6O8q0S2u4W6y8A0c2E4g6I8k0M2q4', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-ACC-NIL-CPPRO', 'شفاف با حاشیه مشکی', 'Clear Black Edge', '#000000',
    'استاندارد', 'استاندارد', 680000, 790000,
    578000, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: apple-clear-case-magsafe
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'cases-screen';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'apple';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۲ ماهه تعویض CNA Care Accessories';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'apple-clear-case-magsafe', v_cat_id, v_brand_id, 'قاب محافظ شفاف مگ‌سیف اپل برای iPhone 16 Pro Max', 'Apple iPhone 16 Pro Max Clear Case with MagSafe', 'Apple Clear Case MagSafe',
    'کاور کریستالی شفاف اصلی اپل مجهز به آهنرباهای نئودیمیوم تراز دقیق مگ‌سیف و روکش ضداکسیداسیون برای جلوگیری از زردشدگی.', 'اورجینال اپل', 4.7, 54, true, false,
    '{"material":"پلی‌کربنات فوق شفاف و مواد انعطاف‌پذیر TPU","magsafe":"پشتیبانی کامل از اتصال مغناطیسی MagSafe و Qi2","protection":"محافظت دور تا دور دکمه‌ها و بامپر برجسته دوربین","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQy2c_GgBv6wT2dE8jK6m0P4s8U2x6A8c0E2g4I6k8M0o2Q4s6U8w0Y2a4C6e8G0i2K4m6O8q0S2u4W6y8A0c2E4g6I8k0M2q4', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-ACC-APL-MSCASE', 'شفاف کریستالی', 'Clear', '#FFFFFF',
    'استاندارد', 'استاندارد', 3850000, 4200000,
    3272500, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- Product: anker-maggo-qi2-powerbank
DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = 'chargers';
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = 'anker';
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = 'گارانتی ۱۲ ماهه تعویض CNA Care Accessories';

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    'anker-maggo-qi2-powerbank', v_cat_id, v_brand_id, 'پاوربانک مغناطیسی وایرلس انکر مدل Anker MagGo Power Bank (10000mAh, 15W, Qi2)', 'Anker MagGo Power Bank (10,000mAh, 15W, Qi2-Certified)', 'Anker MagGo Qi2 10K',
    'نسل جدید شارژ بی‌سیم مغناطیسی با استاندارد بین‌المللی Qi2 و شارژ وایرلس ۱۵ وات معادل شارژ سیمی، به همراه پایه استند تاشو و نمایشگر هوشمند.', 'گواهی رسمی Qi2 ۱۵W', 4.9, 73, true, true,
    '{"capacity":"۱۰۰۰۰ میلی‌آمپرساعت","wirelessOutput":"۱۵ وات واقعی مطابق پروتکل Qi2","wiredOutput":"۲۷ وات از طریق درگاه دوطرفه USB-C","stand":"پایه تاشوی مگنتی برای تماشای فیلم همزمان با شارژ","isExpressDelivery":true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQy2c_GgBv6wT2dE8jK6m0P4s8U2x6A8c0E2g4I6k8M0o2Q4s6U8w0Y2a4C6e8G0i2K4m6O8q0S2u4W6y8A0c2E4g6I8k0M2q4', true, 0);

  -- Variants
  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, 'CNA-ACC-ANK-QI2PB', 'مشکی مات', 'Black', '#232528',
    '10000mAh', '15W Qi2', 4650000, 5100000,
    3952500, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;
END $$;

-- ==============================================================================
-- 6. Authoritative Transactional Opening Stock Reconciliation DO Block
-- ==============================================================================
DO $$
DECLARE
  v_wh_id UUID;
  v_wh_count INT;
  v_expected_sku_count INT := 46;
  v_matched_sku_count INT;
  v_existing_ws public.warehouse_stock%ROWTYPE;
  v_existing_sm public.stock_movements%ROWTYPE;
  v_global_sm public.stock_movements%ROWTYPE;
  v_idemp_key TEXT;
  v_ledger_sum INT;
  v_cur RECORD;
BEGIN
  -- 1. Validate Warehouse Resolution: Verify exactly one WH-CENTRAL warehouse exists
  SELECT COUNT(*) INTO v_wh_count
  FROM public.warehouses
  WHERE code = 'WH-CENTRAL';

  IF v_wh_count <> 1 THEN
    RAISE EXCEPTION 'خطای اعتبارسنجی انبار داده‌های اولیه: انبار با کد WH-CENTRAL دقیقاً یک رکورد نیست (تعداد: %).', v_wh_count;
  END IF;

  -- Retrieve warehouse ID strictly without aggregate functions on UUID
  SELECT id INTO STRICT v_wh_id
  FROM public.warehouses
  WHERE code = 'WH-CENTRAL';

  -- 2. Canonical In-Memory Seed Source
  CREATE TEMP TABLE temp_opening_seed (
    sku VARCHAR(100) PRIMARY KEY,
    initial_stock INT NOT NULL CHECK (initial_stock > 0),
    shelf_location VARCHAR(50) NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO temp_opening_seed (sku, initial_stock, shelf_location) VALUES

    ('CNA-APL-16PM-256-DES', 6, 'B-14'),
    ('CNA-APL-16PM-256-BLK', 5, 'B-14'),
    ('CNA-APL-16PM-512-DES', 3, 'B-14'),
    ('CNA-APL-16P-256-NAT', 5, 'B-14'),
    ('CNA-APL-16P-256-WHT', 4, 'B-14'),
    ('CNA-APL-16PL-128-BLU', 7, 'B-15'),
    ('CNA-APL-16PL-256-PNK', 4, 'B-15'),
    ('CNA-APL-16-128-BLK', 9, 'B-15'),
    ('CNA-APL-16-128-WHT', 8, 'B-15'),
    ('CNA-APL-15-128-BLU', 6, 'B-16'),
    ('CNA-APL-15-128-BLK', 4, 'B-16'),
    ('CNA-SAM-S24U-256-GRY', 7, 'B-08'),
    ('CNA-SAM-S24U-256-VIO', 5, 'B-08'),
    ('CNA-SAM-S24U-512-BLK', 3, 'B-08'),
    ('CNA-SAM-S24P-256-BLK', 5, 'B-09'),
    ('CNA-SAM-S24P-256-GRY', 4, 'B-09'),
    ('CNA-SAM-S24-128-VIO', 7, 'B-09'),
    ('CNA-SAM-S24-256-YEL', 5, 'B-09'),
    ('CNA-SAM-S23FE-256-GRP', 8, 'B-10'),
    ('CNA-SAM-S23FE-256-MNT', 6, 'B-10'),
    ('CNA-SAM-A55-256-NAV', 12, 'B-11'),
    ('CNA-SAM-A55-256-BLU', 10, 'B-11'),
    ('CNA-XMI-14U-512-BLK', 3, 'C-02'),
    ('CNA-XMI-14U-512-WHT', 3, 'C-02'),
    ('CNA-XMI-14-512-GRN', 4, 'C-03'),
    ('CNA-XMI-14-512-BLK', 4, 'C-03'),
    ('CNA-XMI-13TP-512-BLU', 5, 'C-04'),
    ('CNA-XMI-13TP-512-BLK', 4, 'C-04'),
    ('CNA-XMI-F6P-512-BLK', 7, 'C-05'),
    ('CNA-XMI-F6P-512-WHT', 6, 'C-05'),
    ('CNA-XMI-X6P-256-YEL', 9, 'C-06'),
    ('CNA-XMI-X6P-256-GRY', 7, 'C-06'),
    ('CNA-GGL-P9PXL-256-OBS', 4, 'D-01'),
    ('CNA-GGL-P9PXL-256-PRC', 4, 'D-01'),
    ('CNA-GGL-P9-128-PEO', 6, 'D-02'),
    ('CNA-GGL-P9-256-OBS', 5, 'D-02'),
    ('CNA-GGL-P8A-128-BAY', 6, 'D-03'),
    ('CNA-GGL-P8A-128-OBS', 5, 'D-03'),
    ('CNA-ACC-AWU2-49', 6, 'ACC-01'),
    ('CNA-ACC-APP2-TYPC', 14, 'ACC-02'),
    ('CNA-ACC-GB2P-BLK', 8, 'ACC-03'),
    ('CNA-ACC-ANK-737', 10, 'ACC-04'),
    ('CNA-ACC-ANK-30W', 15, 'ACC-05'),
    ('CNA-ACC-NIL-CPPRO', 12, 'ACC-06'),
    ('CNA-ACC-APL-MSCASE', 9, 'ACC-07'),
    ('CNA-ACC-ANK-QI2PB', 7, 'ACC-08');

  -- 3. Verify All Expected SKUs Exist in product_variants
  SELECT COUNT(*) INTO v_matched_sku_count
  FROM temp_opening_seed s
  JOIN public.product_variants pv ON s.sku = pv.sku;

  IF v_matched_sku_count <> v_expected_sku_count THEN
    RAISE EXCEPTION 'خطای انطباق کاتالوگ: از % تنوع مورد انتظار، فقط % تنوع در جدول product_variants یافت شد.',
      v_expected_sku_count, v_matched_sku_count;
  END IF;

  -- 4. Safe Fail-Fast Processing & Full Ledger Reconciliation for Every SKU
  FOR v_cur IN 
    SELECT s.sku, s.initial_stock, s.shelf_location, pv.id AS variant_id 
    FROM temp_opening_seed s 
    JOIN public.product_variants pv ON s.sku = pv.sku 
  LOOP
    v_idemp_key := 'OPENING-WH-CENTRAL-' || v_cur.sku;

    -- Global Idempotency Key Validation: Ensure key is not registered under a different warehouse or variant
    SELECT * INTO v_global_sm
    FROM public.stock_movements
    WHERE idempotency_key = v_idemp_key;

    IF FOUND AND (v_global_sm.warehouse_id <> v_wh_id OR v_global_sm.variant_id <> v_cur.variant_id) THEN
      RAISE EXCEPTION 'تداخل جهانی کلید افتتاحیه: کلید % برای انبار یا تنوع دیگری ثبت شده است.', v_idemp_key;
    END IF;

    -- Fetch current projection state
    SELECT * INTO v_existing_ws
    FROM public.warehouse_stock
    WHERE warehouse_id = v_wh_id AND variant_id = v_cur.variant_id;

    -- Fetch current opening ledger state
    SELECT * INTO v_existing_sm
    FROM public.stock_movements
    WHERE warehouse_id = v_wh_id AND variant_id = v_cur.variant_id AND idempotency_key = v_idemp_key;

    IF v_existing_ws.variant_id IS NULL AND v_existing_sm.id IS NULL THEN
      -- Case A Integrity Pre-check: Ensure NO rogue stock movements exist for this variant/warehouse
      IF EXISTS (
        SELECT 1 FROM public.stock_movements
        WHERE warehouse_id = v_wh_id AND variant_id = v_cur.variant_id
      ) THEN
        RAISE EXCEPTION 'فساد داده‌ای در بذردهی انبار: برای تنوع % هیچ پروجکشن یا سند افتتاحیه یافت نشد، اما اسناد گردش انبار متفرقه‌ای از قبل ثبت شده است.',
          v_cur.sku;
      END IF;

      -- Case A: Neither exists -> Atomically create both projection and opening ledger
      INSERT INTO public.warehouse_stock (
        warehouse_id,
        variant_id,
        shelf_location,
        quantity_on_hand,
        reserved_qty,
        updated_at
      )
      VALUES (
        v_wh_id,
        v_cur.variant_id,
        v_cur.shelf_location,
        v_cur.initial_stock,
        0,
        NOW()
      );

      INSERT INTO public.stock_movements (
        warehouse_id,
        variant_id,
        quantity_change,
        balance_after,
        movement_type,
        shelf_location,
        notes,
        idempotency_key,
        created_at
      )
      VALUES (
        v_wh_id,
        v_cur.variant_id,
        v_cur.initial_stock,
        v_cur.initial_stock,
        'opening_balance',
        v_cur.shelf_location,
        'Initial opening inventory seed',
        v_idemp_key,
        NOW()
      );

    ELSIF v_existing_ws.variant_id IS NOT NULL AND v_existing_sm.id IS NOT NULL THEN
      -- Case B: Both exist -> Validate opening movement_type, quantity, shelf_location, and balance_after
      IF v_existing_sm.movement_type <> 'opening_balance' THEN
        RAISE EXCEPTION 'ناسازگاری نوع سند افتتاحیه تنوع %: نوع سند ثبت‌شده قبلی (%) برابر با opening_balance نیست.',
          v_cur.sku, v_existing_sm.movement_type;
      END IF;

      IF v_existing_sm.quantity_change <> v_cur.initial_stock THEN
        RAISE EXCEPTION 'ناسازگاری داده سند افتتاحیه تنوع %: مقدار سند قبلی (%) با مقدار اولیه (%) همخوانی ندارد.',
          v_cur.sku, v_existing_sm.quantity_change, v_cur.initial_stock;
      END IF;

      IF v_existing_sm.shelf_location IS DISTINCT FROM v_cur.shelf_location THEN
        RAISE EXCEPTION 'ناسازگاری موقعیت قفسه سند افتتاحیه تنوع %: قفسه ثبت‌شده (%) با مقدار اولیه (%) همخوانی ندارد.',
          v_cur.sku, v_existing_sm.shelf_location, v_cur.shelf_location;
      END IF;

      IF v_existing_sm.balance_after <> v_cur.initial_stock THEN
        RAISE EXCEPTION 'ناسازگاری موجودی پس از سند افتتاحیه تنوع %: تراز ثبت‌شده (%) با مقدار اولیه (%) همخوانی ندارد.',
          v_cur.sku, v_existing_sm.balance_after, v_cur.initial_stock;
      END IF;

      -- Validate full ledger sum against current projection
      SELECT COALESCE(SUM(quantity_change), 0) INTO v_ledger_sum
      FROM public.stock_movements
      WHERE warehouse_id = v_wh_id AND variant_id = v_cur.variant_id;

      IF v_existing_ws.quantity_on_hand <> v_ledger_sum THEN
        RAISE EXCEPTION 'ناسازگاری دفتر کل و پروجکشن تنوع %: موجودی جاری (%) با مجموع اسناد دفتر کل (%) مغایرت دارد.',
          v_cur.sku, v_existing_ws.quantity_on_hand, v_ledger_sum;
      END IF;

      -- State is verified consistent: preserve existing warehouse_stock shelf location and stock untouched!

    ELSIF v_existing_ws.variant_id IS NOT NULL AND v_existing_sm.id IS NULL THEN
      -- Case C: Inconsistent state (Projection exists without opening ledger entry)
      RAISE EXCEPTION 'خطای بحرانی ساختار انبار: برای تنوع % پروجکشن موجودی (%) وجود دارد اما سند افتتاحیه مفقود است.',
        v_cur.sku, v_existing_ws.quantity_on_hand;

    ELSE
      -- Case D: Inconsistent state (Ledger exists without projection)
      RAISE EXCEPTION 'خطای بحرانی ساختار انبار: برای تنوع % سند افتتاحیه (%) ثبت شده اما ردیف پروجکشن انبار مفقود است.',
        v_cur.sku, v_existing_sm.quantity_change;
    END IF;
  END LOOP;
END $$;


COMMIT;
