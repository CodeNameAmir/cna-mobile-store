-- ==============================================================================
-- Migration: 20261107000004_storefront_view_and_storage.sql
-- Domain: Storefront Compatible View & Supabase Storage Bucket Integration
-- ==============================================================================

-- 1. Storefront Products Aggregation View (Security Invoker)
CREATE OR REPLACE VIEW public.v_storefront_products
WITH (security_invoker = true)
AS
SELECT
  p.id::text AS id,
  p.title_fa AS "titleFa",
  p.title_en AS "titleEn",
  p.title_fa AS name,
  p.title_en AS "englishTitle",
  p.slug,
  base_sku.sku,
  base_sku.barcode,
  b.name_en AS brand,
  c.slug AS category,
  c.title_fa AS "categoryFa",

  -- Pricing (Integer Toman anchored to base SKU)
  base_sku.price_toman AS price,
  base_sku.original_price_toman AS "originalPrice",
  base_sku.original_price_toman AS "discountPrice",
  CASE
    WHEN base_sku.original_price_toman IS NOT NULL AND base_sku.original_price_toman > base_sku.price_toman
    THEN ROUND(((base_sku.original_price_toman - base_sku.price_toman)::numeric / base_sku.original_price_toman::numeric) * 100)::int
    ELSE 0
  END AS "discountPercent",

  -- Inventory & Logistics (Independently aggregated without cartesian inflation)
  COALESCE(stk.available_stock > 0, false) AS "inStock",
  COALESCE(stk.available_stock, 0) AS "stockCount",
  COALESCE(stk.available_stock, 0) AS stock,
  COALESCE(stk.on_hand_stock, 0) AS "onHandStock",
  COALESCE(stk.reserved_stock, 0) AS "reservedStock",
  COALESCE(stk.shelf_location, 'UNASSIGNED') AS "shelfLocation",
  w.provider_name AS warranty,
  w.provider_name AS "warrantyFa",
  base_sku.part_number AS "partNumber",
  p.is_published AS "isPublished",

  -- Presentation & Badges
  p.rating_average::float AS rating,
  p.reviews_count AS "reviewsCount",
  COALESCE(cover_img.image_url, '/placeholder-phone.webp') AS "imageUrl",
  COALESCE(cover_img.image_url, '/placeholder-phone.webp') AS image,
  COALESCE(gal.images, ARRAY[]::text[]) AS "galleryImages",
  p.badge,
  (p.badge IS NOT NULL) AS "isSpecialOffer",
  p.is_featured AS "isBestseller",
  (p.created_at > (NOW() - INTERVAL '30 days')) AS "isNew",
  COALESCE((p.specs_summary->>'isExpressDelivery')::boolean, false) AS "isExpressDelivery",

  -- Options & Swatches
  COALESCE(colors_agg.colors, '[]'::jsonb) AS colors,
  COALESCE(storage_opts.storages, ARRAY[]::text[]) AS "storageOptions",
  COALESCE(ram_opts.rams, ARRAY[]::text[]) AS "ramOptions",
  base_sku.color_name_fa AS "selectedColor",
  base_sku.storage AS "selectedStorage",
  p.specs_summary AS specs,
  p.description_fa AS "descriptionFa"
FROM public.products p
JOIN public.brands b ON p.brand_id = b.id
JOIN public.categories c ON p.category_id = c.id

-- 1. Base SKU Join Lateral: Anchors price and originalPrice to the exact lowest-price published SKU
JOIN LATERAL (
  SELECT
    pv.sku,
    pv.barcode,
    pv.part_number,
    pv.price_toman,
    pv.original_price_toman,
    pv.color_name_fa,
    pv.storage,
    pv.warranty_id
  FROM public.product_variants pv
  WHERE pv.product_id = p.id AND pv.is_published = true
  ORDER BY pv.price_toman ASC, pv.sku ASC
  LIMIT 1
) base_sku ON true

LEFT JOIN public.warranties w ON base_sku.warranty_id = w.id

-- 2. Cover Image Join Lateral
LEFT JOIN LATERAL (
  SELECT image_url
  FROM public.product_images
  WHERE product_id = p.id
  ORDER BY is_cover DESC, sort_order ASC, id ASC
  LIMIT 1
) cover_img ON true

-- 3. Deterministic Gallery Images (sort_order ASC, id ASC)
LEFT JOIN LATERAL (
  SELECT array_agg(image_url ORDER BY sort_order ASC, id ASC) AS images
  FROM public.product_images
  WHERE product_id = p.id
) gal ON true

-- 4. Color Swatches Aggregation
LEFT JOIN LATERAL (
  SELECT jsonb_agg(
    jsonb_build_object('name', color_name_fa, 'hex', color_hex)
    ORDER BY color_name_fa ASC, color_hex ASC
  ) AS colors
  FROM (
    SELECT DISTINCT color_name_fa, color_hex
    FROM public.product_variants
    WHERE product_id = p.id AND is_published = true
  ) distinct_colors
) colors_agg ON true

-- 5. Deterministic Storage Options (Physical capacity, min_price, storage ASC)
LEFT JOIN LATERAL (
  SELECT array_agg(storage ORDER BY 
    CASE storage 
      WHEN '128GB' THEN 1 
      WHEN '256GB' THEN 2 
      WHEN '512GB' THEN 3 
      WHEN '1TB' THEN 4 
      ELSE 5 
    END ASC, 
    min_price ASC,
    storage ASC
  ) AS storages
  FROM (
    SELECT storage, MIN(price_toman) AS min_price
    FROM public.product_variants
    WHERE product_id = p.id AND is_published = true
    GROUP BY storage
  ) distinct_storage
) storage_opts ON true

-- 6. Deterministic RAM Options (RAM capacity, min_price, ram ASC)
LEFT JOIN LATERAL (
  SELECT array_agg(ram ORDER BY 
    CASE ram 
      WHEN '6GB' THEN 1 
      WHEN '8GB' THEN 2 
      WHEN '12GB' THEN 3 
      WHEN '16GB' THEN 4 
      ELSE 5 
    END ASC, 
    min_price ASC,
    ram ASC
  ) AS rams
  FROM (
    SELECT ram, MIN(price_toman) AS min_price
    FROM public.product_variants
    WHERE product_id = p.id AND is_published = true AND ram IS NOT NULL
    GROUP BY ram
  ) distinct_ram
) ram_opts ON true

-- 7. Independent Inventory Aggregation across Active Warehouses
LEFT JOIN LATERAL (
  SELECT
    SUM(ws.quantity_on_hand)::int AS on_hand_stock,
    SUM(ws.reserved_qty)::int AS reserved_stock,
    GREATEST(SUM(ws.quantity_on_hand) - SUM(ws.reserved_qty), 0)::int AS available_stock,
    MIN(ws.shelf_location) AS shelf_location
  FROM public.product_variants pv
  JOIN public.warehouse_stock ws ON pv.id = ws.variant_id
  JOIN public.warehouses wh ON ws.warehouse_id = wh.id
  WHERE pv.product_id = p.id AND wh.is_active = true
) stk ON true

WHERE p.is_published = true;

-- Grant select on view to public
GRANT SELECT ON public.v_storefront_products TO anon, authenticated;

-- ==============================================================================
-- 2. Supabase Storage: Product Images Public Bucket Setup
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS Policies
CREATE POLICY "Public Read Product Images Storage"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'product-images');

CREATE POLICY "Catalog Managers Upload Product Images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images' AND
  (auth.user_has_permission('catalog:manage') OR auth.user_has_role('super_admin'))
);

CREATE POLICY "Catalog Managers Modify Product Images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images' AND
  (auth.user_has_permission('catalog:manage') OR auth.user_has_role('super_admin'))
);

CREATE POLICY "Catalog Managers Delete Product Images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'product-images' AND
  (auth.user_has_permission('catalog:manage') OR auth.user_has_role('super_admin'))
);
