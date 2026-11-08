-- ==============================================================================
-- Migration: 20261107000003_inventory_system.sql
-- Domain: Multi-Warehouse, Stock Projections, Immutable Ledger & Mutation RPC
-- ==============================================================================

-- 1. Warehouses Table
CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name_fa VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  postal_code VARCHAR(10),
  phone VARCHAR(15),
  manager_name VARCHAR(100),
  is_central BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Warehouse Stock Projection Table
CREATE TABLE IF NOT EXISTS public.warehouse_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  shelf_location VARCHAR(50) NOT NULL DEFAULT 'UNASSIGNED',
  quantity_on_hand INT NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  reserved_qty INT NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0),
  min_stock_alert INT NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_warehouse_stock_warehouse_variant UNIQUE (warehouse_id, variant_id)
);

-- 3. Canonical Immutable Stock Movements Ledger Table
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  quantity_change INT NOT NULL CHECK (quantity_change <> 0),
  balance_after INT NOT NULL CHECK (balance_after >= 0),
  movement_type VARCHAR(30) NOT NULL,
  shelf_location VARCHAR(50) DEFAULT NULL,
  reference_type VARCHAR(30) DEFAULT NULL,
  reference_id UUID DEFAULT NULL,
  operator_id UUID DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  idempotency_key VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_stock_movement_type CHECK (
    movement_type IN ('opening_balance', 'purchase_inflow', 'order_sale', 'customer_return', 'transfer_out', 'transfer_in', 'inventory_adjustment')
  ),
  CONSTRAINT chk_stock_movement_direction CHECK (
    (movement_type IN ('opening_balance', 'purchase_inflow', 'customer_return') AND quantity_change > 0) OR
    (movement_type = 'order_sale' AND quantity_change < 0) OR
    (movement_type IN ('transfer_out', 'transfer_in', 'inventory_adjustment') AND quantity_change <> 0)
  )
);

-- Defensive Alteration (in case table existed previously)
ALTER TABLE public.stock_movements 
ADD COLUMN IF NOT EXISTS shelf_location VARCHAR(50) DEFAULT NULL;

-- 4. Global Idempotency Unique Partial Index
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_movements_idempotency_key
ON public.stock_movements (idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON public.stock_movements (variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse ON public.stock_movements (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_variant ON public.warehouse_stock (variant_id);

-- 5. Immutability Protection: Rejects UPDATE and DELETE on Ledger Records
CREATE OR REPLACE FUNCTION public.fn_prevent_stock_movement_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE EXCEPTION 'سوابق گردش انبار در جدول stock_movements تغییرناپذیر هستند و ویرایش یا حذف آن‌ها مجاز نمی‌باشد. برای اصلاح اشتباهات از اسناد بازگشتی یا تعدیل انبار استفاده نمایید.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_stock_movement_update_delete ON public.stock_movements;
CREATE TRIGGER trg_prevent_stock_movement_update_delete
BEFORE UPDATE OR DELETE ON public.stock_movements
FOR EACH ROW
EXECUTE FUNCTION public.fn_prevent_stock_movement_mutation();

-- 6. Authoritative Concurrency-Safe Inventory Mutation RPC
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

  -- 3. Movement Direction & Sign Validations
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

-- 7. Table Grants & RLS Policies
GRANT SELECT ON TABLE public.warehouses TO anon, authenticated;
GRANT ALL ON TABLE public.warehouses TO service_role;

GRANT SELECT ON TABLE public.warehouse_stock TO anon, authenticated;
GRANT ALL ON TABLE public.warehouse_stock TO service_role;

GRANT SELECT ON TABLE public.stock_movements TO authenticated;
GRANT ALL ON TABLE public.stock_movements TO service_role;

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Active Warehouses" ON public.warehouses FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Public Read Stock Projections" ON public.warehouse_stock FOR SELECT TO public USING (true);
CREATE POLICY "Warehouse Managers Read Movements" ON public.stock_movements FOR SELECT TO authenticated
USING (public.user_has_permission('inventory:read') OR public.user_has_role('super_admin'));
