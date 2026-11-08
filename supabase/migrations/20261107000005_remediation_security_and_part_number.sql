-- ==============================================================================
-- Migration: 20261107000005_remediation_security_and_part_number.sql
-- Domain: Critical Security Hardening, Schema Reconciliation & Storefront Isolation
-- Forward-Only Remediation for Phase 4.3
-- ==============================================================================

-- 1. Schema Reconciliation: Add missing part_number to product_variants
ALTER TABLE public.product_variants
ADD COLUMN IF NOT EXISTS part_number VARCHAR(50) DEFAULT NULL;

-- 2. Schema Hardening: Non-destructive unique constraint on product_images
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_images_product_url
ON public.product_images (product_id, image_url);

-- ==============================================================================
-- 3. Security Hardening: Confidential Cost Price Protection
-- Table-level SELECT allows all columns to be read. We revoke table-level SELECT
-- from anon/public and grant column-level SELECT strictly on public catalog fields.
-- ==============================================================================

-- Revoke broad table-level SELECT on product_variants
REVOKE SELECT ON TABLE public.product_variants FROM PUBLIC, anon;
REVOKE SELECT ON TABLE public.product_variants FROM authenticated;

-- Grant column-level SELECT on product_variants strictly excluding cost_price_toman
GRANT SELECT (
  id,
  product_id,
  warranty_id,
  sku,
  barcode,
  part_number,
  color_name_fa,
  color_name_en,
  color_hex,
  storage,
  ram,
  sim_type,
  price_toman,
  original_price_toman,
  is_published,
  created_at,
  updated_at
) ON TABLE public.product_variants TO anon, authenticated;

-- Preserve full administrative DML and access for service_role and catalog managers
GRANT ALL ON TABLE public.product_variants TO service_role;

-- ==============================================================================
-- 4. Security Hardening: Internal Warehouse Data Protection
-- Revoke anonymous access to warehouse_stock. Anonymous callers cannot inspect
-- individual warehouse stock, shelf locations, or reserved quantities.
-- ==============================================================================

REVOKE ALL ON TABLE public.warehouse_stock FROM PUBLIC, anon;
DROP POLICY IF EXISTS "Public Read Stock Projections" ON public.warehouse_stock;

-- Warehouse stock is strictly readable by authorized warehouse managers and administrators
CREATE POLICY "Warehouse Managers Read Stock Projections"
ON public.warehouse_stock
FOR SELECT
TO authenticated
USING (public.user_has_permission('inventory:read') OR public.user_has_role('super_admin'));

-- ==============================================================================
-- 5. Hardened Storefront Aggregation View
-- Recreated with owner (postgres) security context to serve as the secure public
-- projection. Exposes available stock (inStock, stockCount) without leaking
-- internal physical shelf locations, warehouse IDs, reserved quantities, or cost prices.
-- ==============================================================================

CREATE OR REPLACE VIEW public.v_storefront_products
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

  -- Pricing (Integer Toman anchored to base lowest-price SKU)
  base_sku.price_toman AS price,
  base_sku.original_price_toman AS "originalPrice",
  base_sku.original_price_toman AS "discountPrice",
  CASE
    WHEN base_sku.original_price_toman IS NOT NULL AND base_sku.original_price_toman > base_sku.price_toman
    THEN ROUND(((base_sku.original_price_toman - base_sku.price_toman)::numeric / base_sku.original_price_toman::numeric) * 100)::int
    ELSE 0
  END AS "discountPercent",

  -- Public Inventory & Logistics (Available stock without leaking internal shelf or warehouse splits)
  COALESCE(stk.available_stock > 0, false) AS "inStock",
  COALESCE(stk.available_stock, 0) AS "stockCount",
  COALESCE(stk.available_stock, 0) AS stock,
  NULL::text AS "shelfLocation", -- Internal shelf location masked from public storefront
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

-- 1. Base SKU Join Lateral: Anchors price and originalPrice to lowest-price published variant
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

-- 7. Independent Inventory Aggregation across Active Central Warehouses
LEFT JOIN LATERAL (
  SELECT
    SUM(ws.quantity_on_hand)::int AS on_hand_stock,
    SUM(ws.reserved_qty)::int AS reserved_stock,
    GREATEST(SUM(ws.quantity_on_hand) - SUM(ws.reserved_qty), 0)::int AS available_stock
  FROM public.product_variants pv
  JOIN public.warehouse_stock ws ON pv.id = ws.variant_id
  JOIN public.warehouses wh ON ws.warehouse_id = wh.id
  WHERE pv.product_id = p.id AND wh.is_active = true
) stk ON true

WHERE p.is_published = true;

ALTER VIEW public.v_storefront_products OWNER TO postgres;
GRANT SELECT ON public.v_storefront_products TO anon, authenticated;

-- ==============================================================================
-- 6. Authoritative Inventory RPC: Comprehensive Movement Type Direction Handlers
-- Ensures transfer_out and transfer_in are consistently handled.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.rpc_record_stock_movement(
  p_warehouse_id UUID,
  p_variant_id UUID,
  p_quantity_change INT,
  p_movement_type VARCHAR(30),
  p_shelf_location VARCHAR(50) DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key VARCHAR(100) DEFAULT NULL,
  p_reference_type VARCHAR(30) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_norm_idemp VARCHAR(100);
  v_norm_shelf VARCHAR(50);
  v_existing_movement public.stock_movements%ROWTYPE;
  v_current_stock INT := 0;
  v_current_shelf VARCHAR(50);
  v_new_stock INT := 0;
  v_created_movement_id UUID;
  v_operator_id UUID := auth.uid();
BEGIN
  -- 1. Explicit Caller Authorization Check
  IF NOT public.user_has_permission('inventory:manage') AND NOT public.user_has_role('super_admin') THEN
    RAISE EXCEPTION 'دسترسی غیرمجاز: ثبت اسناد گردش انبارداری منحصراً در صلاحیت پرسنل مجاز انبار یا حساب سیستمی است.';
  END IF;

  -- 2. Input Parameter Validations
  IF p_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'شناسه انبار الزامی است و نمی‌تواند تهی (NULL) باشد.';
  END IF;

  IF p_variant_id IS NULL THEN
    RAISE EXCEPTION 'شناسه تنوع کالا الزامی است و نمی‌تواند تهی (NULL) باشد.';
  END IF;

  IF p_quantity_change IS NULL OR p_quantity_change = 0 THEN
    RAISE EXCEPTION 'تغییر موجودی نامعتبر است: مقدار نمی‌تواند صفر یا تهی باشد.';
  END IF;

  IF p_movement_type IS NULL OR pg_catalog.length(pg_catalog.btrim(p_movement_type)) = 0 THEN
    RAISE EXCEPTION 'نوع سند انبارداری الزامی است.';
  END IF;

  -- 3. Movement Direction & Sign Validations (100% aligned with table constraint)
  CASE p_movement_type
    WHEN 'opening_balance' THEN
      IF p_quantity_change <= 0 THEN
        RAISE EXCEPTION 'سند افتتاحیه موجودی الزماً باید مثبت باشد (ورودی: %).', p_quantity_change;
      END IF;
    WHEN 'purchase_inflow' THEN
      IF p_quantity_change <= 0 THEN
        RAISE EXCEPTION 'سند ورود کالا به انبار الزماً باید مثبت باشد (ورودی: %).', p_quantity_change;
      END IF;
    WHEN 'customer_return' THEN
      IF p_quantity_change <= 0 THEN
        RAISE EXCEPTION 'سند مرجوعی مشتری الزماً باید مثبت باشد (ورودی: %).', p_quantity_change;
      END IF;
    WHEN 'order_sale' THEN
      IF p_quantity_change >= 0 THEN
        RAISE EXCEPTION 'سند خروج کالا برای سفارش الزماً باید منفی باشد (ورودی: %).', p_quantity_change;
      END IF;
    WHEN 'transfer_out' THEN
      IF p_quantity_change >= 0 THEN
        RAISE EXCEPTION 'سند خروج انتقال بین‌انباری الزماً باید منفی باشد (ورودی: %).', p_quantity_change;
      END IF;
    WHEN 'transfer_in' THEN
      IF p_quantity_change <= 0 THEN
        RAISE EXCEPTION 'سند ورود انتقال بین‌انباری الزماً باید مثبت باشد (ورودی: %).', p_quantity_change;
      END IF;
    WHEN 'inventory_adjustment' THEN
      NULL; -- May be positive or negative, verified non-zero above
    ELSE
      RAISE EXCEPTION 'نوع سند انبارداری (%) نامعتبر و تعریف‌نشده است.', p_movement_type;
  END CASE;

  -- 4. Normalize Idempotency Key & Shelf Location
  v_norm_idemp := NULLIF(pg_catalog.btrim(p_idempotency_key), '');
  v_norm_shelf := NULLIF(pg_catalog.btrim(p_shelf_location), '');
  
  -- 5. Acquire Transaction-Scoped Advisory Lock & Evaluate Idempotency
  IF v_norm_idemp IS NOT NULL THEN
    -- Serialize concurrent operations targeting the exact same idempotency key
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('stock_movement:' || v_norm_idemp));

    SELECT * INTO v_existing_movement
    FROM public.stock_movements
    WHERE idempotency_key = v_norm_idemp;

    IF FOUND THEN
      -- Strict Operational Invariant Payload Verification including shelf_location
      IF v_existing_movement.warehouse_id <> p_warehouse_id OR
         v_existing_movement.variant_id <> p_variant_id OR
         v_existing_movement.quantity_change <> p_quantity_change OR
         v_existing_movement.movement_type <> p_movement_type OR
         v_existing_movement.reference_type IS DISTINCT FROM p_reference_type OR
         v_existing_movement.reference_id IS DISTINCT FROM p_reference_id OR
         v_existing_movement.shelf_location IS DISTINCT FROM v_norm_shelf THEN
        RAISE EXCEPTION 'تداخل کلید ضدتکرار: کلید ارسالی (%) پیش‌تر برای عملیات متفاوتی با پارامترهای ناهمخوان ثبت شده است (موقعیت قفسه یا مقادیر عملیاتی متناقض).', v_norm_idemp;
      END IF;

      RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'status', 'idempotent_duplicate',
        'movement_id', v_existing_movement.id,
        'balance_after', v_existing_movement.balance_after
      );
    END IF;
  END IF;

  -- 6. Atomic Initialization of warehouse_stock Row
  INSERT INTO public.warehouse_stock (
    warehouse_id,
    variant_id,
    shelf_location,
    quantity_on_hand,
    reserved_qty,
    updated_at
  )
  VALUES (
    p_warehouse_id,
    p_variant_id,
    COALESCE(v_norm_shelf, 'UNASSIGNED'),
    0,
    0,
    pg_catalog.now()
  )
  ON CONFLICT (warehouse_id, variant_id) DO NOTHING;

  -- 7. Acquire Pessimistic Row Lock on warehouse_stock
  SELECT quantity_on_hand, shelf_location
  INTO v_current_stock, v_current_shelf
  FROM public.warehouse_stock
  WHERE warehouse_id = p_warehouse_id AND variant_id = p_variant_id
  FOR UPDATE;

  -- 8. Preserve Shelf Location (Only update if caller provides an explicit new location)
  IF v_norm_shelf IS NOT NULL AND (v_current_shelf = 'UNASSIGNED' OR v_current_shelf <> v_norm_shelf) THEN
    v_current_shelf := v_norm_shelf;
  END IF;

  -- 9. Calculate Authoritative Balance and Enforce Non-Negative Invariant
  v_new_stock := v_current_stock + p_quantity_change;

  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'خطای کسری موجودی: موجودی جاری انبار (%) کمتر از میزان درخواستی (%) است.',
      v_current_stock, pg_catalog.abs(p_quantity_change);
  END IF;

  -- 10. Update Projection Atomically
  UPDATE public.warehouse_stock
  SET quantity_on_hand = v_new_stock,
      shelf_location = v_current_shelf,
      updated_at = pg_catalog.now()
  WHERE warehouse_id = p_warehouse_id AND variant_id = p_variant_id;

  -- 11. Insert Immutable Movement Ledger Record
  INSERT INTO public.stock_movements (
    warehouse_id,
    variant_id,
    quantity_change,
    balance_after,
    movement_type,
    shelf_location,
    reference_type,
    reference_id,
    operator_id,
    notes,
    idempotency_key,
    created_at
  )
  VALUES (
    p_warehouse_id,
    p_variant_id,
    p_quantity_change,
    v_new_stock,
    p_movement_type,
    v_norm_shelf,
    p_reference_type,
    p_reference_id,
    v_operator_id,
    p_notes,
    v_norm_idemp,
    pg_catalog.now()
  )
  RETURNING id INTO v_created_movement_id;

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'status', 'recorded',
    'movement_id', v_created_movement_id,
    'balance_after', v_new_stock
  );
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION public.rpc_record_stock_movement(uuid, uuid, integer, character varying, character varying, text, character varying, character varying, uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.rpc_record_stock_movement(uuid, uuid, integer, character varying, character varying, text, character varying, character varying, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_record_stock_movement(uuid, uuid, integer, character varying, character varying, text, character varying, character varying, uuid) TO authenticated, service_role;
