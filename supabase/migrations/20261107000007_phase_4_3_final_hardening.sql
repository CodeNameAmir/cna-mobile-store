-- ==============================================================================
-- Migration: 20261107000007_phase_4_3_final_hardening.sql
-- Domain: Idempotency Key Length Validation & Comprehensive Transfer Retry Verification
-- Forward-Only Migration for Phase 4.3 Final Hardening
-- ==============================================================================

-- ==============================================================================
-- 1. Hardened Single-Warehouse RPC: Idempotency Key Length Validation
-- Validates that p_idempotency_key does not exceed 100 characters before any mutation.
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
  IF NOT auth.user_has_permission('inventory:manage') AND NOT auth.user_has_role('super_admin') THEN
    RAISE EXCEPTION 'دسترسی غیرمجاز: ثبت اسناد گردش انبارداری منحصراً در صلاحیت پرسنل مجاز انبار یا حساب سیستمی است.'
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  -- 2. Input Parameter Validations
  IF p_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'شناسه انبار الزامی است و نمی‌تواند تهی (NULL) باشد.'
      USING ERRCODE = '22004'; -- null_value_not_allowed
  END IF;

  IF p_variant_id IS NULL THEN
    RAISE EXCEPTION 'شناسه تنوع کالا الزامی است و نمی‌تواند تهی (NULL) باشد.'
      USING ERRCODE = '22004';
  END IF;

  IF p_quantity_change IS NULL OR p_quantity_change = 0 THEN
    RAISE EXCEPTION 'تغییر موجودی نامعتبر است: مقدار نمی‌تواند صفر یا تهی باشد.'
      USING ERRCODE = '22023'; -- invalid_parameter_value
  END IF;

  IF p_movement_type IS NULL OR pg_catalog.length(pg_catalog.btrim(p_movement_type)) = 0 THEN
    RAISE EXCEPTION 'نوع سند انبارداری الزامی است.'
      USING ERRCODE = '22023';
  END IF;

  -- 3. Movement Direction & Sign Validations
  CASE p_movement_type
    WHEN 'opening_balance' THEN
      IF p_quantity_change <= 0 THEN
        RAISE EXCEPTION 'سند افتتاحیه موجودی الزماً باید مثبت باشد (ورودی: %).', p_quantity_change
          USING ERRCODE = '22023';
      END IF;
    WHEN 'purchase_inflow' THEN
      IF p_quantity_change <= 0 THEN
        RAISE EXCEPTION 'سند ورود کالا به انبار الزماً باید مثبت باشد (ورودی: %).', p_quantity_change
          USING ERRCODE = '22023';
      END IF;
    WHEN 'customer_return' THEN
      IF p_quantity_change <= 0 THEN
        RAISE EXCEPTION 'سند مرجوعی مشتری الزماً باید مثبت باشد (ورودی: %).', p_quantity_change
          USING ERRCODE = '22023';
      END IF;
    WHEN 'order_sale' THEN
      IF p_quantity_change >= 0 THEN
        RAISE EXCEPTION 'سند خروج کالا برای سفارش الزماً باید منفی باشد (ورودی: %).', p_quantity_change
          USING ERRCODE = '22023';
      END IF;
    WHEN 'inventory_adjustment' THEN
      NULL; -- May be positive or negative, verified non-zero above
    WHEN 'transfer_out', 'transfer_in' THEN
      RAISE EXCEPTION 'ERR_UNSUPPORTED_STANDALONE_TRANSFER: ثبت منفرد سند انتقال بین‌انباری مجاز نیست. انتقال کالا میان انبارها باید منحصراً و به‌صورت اتمیک از طریق تابع rpc_transfer_warehouse_stock انجام پذیرد.'
        USING ERRCODE = '0A000'; -- feature_not_supported
    ELSE
      RAISE EXCEPTION 'نوع سند انبارداری (%) نامعتبر و تعریف‌نشده است.', p_movement_type
        USING ERRCODE = '22023';
  END CASE;

  -- 4. Normalize & Validate Idempotency Key & Shelf Location
  v_norm_idemp := NULLIF(pg_catalog.btrim(p_idempotency_key), '');
  v_norm_shelf := NULLIF(pg_catalog.btrim(p_shelf_location), '');

  IF v_norm_idemp IS NOT NULL AND pg_catalog.length(v_norm_idemp) > 100 THEN
    RAISE EXCEPTION 'ERR_IDEMPOTENCY_KEY_TOO_LONG: کلید ارسال‌شده نمی‌تواند بیشتر از 100 کاراکتر باشد (طول ورودی: %).', pg_catalog.length(v_norm_idemp)
      USING ERRCODE = '22001'; -- string_data_right_truncation
  END IF;
  
  -- 5. Acquire Transaction-Scoped Advisory Lock & Evaluate Idempotency
  IF v_norm_idemp IS NOT NULL THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('stock_movement:' || v_norm_idemp));

    SELECT * INTO v_existing_movement
    FROM public.stock_movements
    WHERE idempotency_key = v_norm_idemp;

    IF FOUND THEN
      IF v_existing_movement.warehouse_id <> p_warehouse_id OR
         v_existing_movement.variant_id <> p_variant_id OR
         v_existing_movement.quantity_change <> p_quantity_change OR
         v_existing_movement.movement_type <> p_movement_type OR
         v_existing_movement.reference_type IS DISTINCT FROM p_reference_type OR
         v_existing_movement.reference_id IS DISTINCT FROM p_reference_id OR
         v_existing_movement.shelf_location IS DISTINCT FROM v_norm_shelf THEN
        RAISE EXCEPTION 'تداخل کلید ضدتکرار: کلید ارسالی (%) پیش‌تر برای عملیات متفاوتی با پارامترهای ناهمخوان ثبت شده است.', v_norm_idemp
          USING ERRCODE = '23505'; -- unique_violation
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

  -- 8. Preserve Shelf Location
  IF v_norm_shelf IS NOT NULL AND (v_current_shelf = 'UNASSIGNED' OR v_current_shelf <> v_norm_shelf) THEN
    v_current_shelf := v_norm_shelf;
  END IF;

  -- 9. Calculate Authoritative Balance and Enforce Non-Negative Invariant
  v_new_stock := v_current_stock + p_quantity_change;

  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'ERR_INSUFFICIENT_STOCK: موجودی انبار (%) کمتر از مقدار درخواستی (%) است.',
      v_current_stock, pg_catalog.abs(p_quantity_change)
      USING ERRCODE = '23514'; -- check_violation
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


-- ==============================================================================
-- 2. Hardened Atomic Inter-Warehouse Transfer RPC
-- Implements:
--  - Idempotency key max length validation (<= 96 chars) before any mutation
--  - Full 5-parameter retry validation (source, destination, variant, quantity, shelf)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.rpc_transfer_warehouse_stock(
  p_source_warehouse_id UUID,
  p_destination_warehouse_id UUID,
  p_variant_id UUID,
  p_quantity INT,
  p_shelf_location_dest VARCHAR(50) DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key VARCHAR(100) DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_norm_idemp VARCHAR(100);
  v_norm_dest_shelf VARCHAR(50);
  v_operator_id UUID := auth.uid();
  
  v_existing_out public.stock_movements%ROWTYPE;
  v_existing_in public.stock_movements%ROWTYPE;
  
  v_first_wh UUID;
  v_second_wh UUID;
  
  v_src_current_stock INT := 0;
  v_src_reserved INT := 0;
  v_src_new_stock INT := 0;
  v_src_shelf VARCHAR(50);
  
  v_dst_current_stock INT := 0;
  v_dst_new_stock INT := 0;
  v_dst_shelf VARCHAR(50);
  
  v_out_movement_id UUID;
  v_in_movement_id UUID;
BEGIN
  -- 1. Explicit Caller Authorization Check
  IF NOT auth.user_has_permission('inventory:manage') AND NOT auth.user_has_role('super_admin') THEN
    RAISE EXCEPTION 'دسترسی غیرمجاز: عملیات انتقال کالا میان انبارها منحصراً در صلاحیت پرسنل مجاز انبار یا مدیر سیستم است.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Input Parameter Validations
  IF p_source_warehouse_id IS NULL OR p_destination_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'شناسه انبارهای مبدا و مقصد الزامی بوده و نمی‌تواند تهی (NULL) باشد.'
      USING ERRCODE = '22004';
  END IF;

  IF p_source_warehouse_id = p_destination_warehouse_id THEN
    RAISE EXCEPTION 'ERR_INVALID_TRANSFER_DESTINATION: انبار مبدا و انبار مقصد نمی‌توانند یکسان باشند.'
      USING ERRCODE = '22023';
  END IF;

  IF p_variant_id IS NULL THEN
    RAISE EXCEPTION 'شناسه تنوع کالا الزامی است.'
      USING ERRCODE = '22004';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'ERR_INVALID_TRANSFER_QUANTITY: مقدار انتقال باید یک عدد صحیح مثبت بزرگتر از صفر باشد (ورودی: %).', p_quantity
      USING ERRCODE = '22023';
  END IF;

  -- 3. Verify Active Status of Both Warehouses
  IF NOT EXISTS (SELECT 1 FROM public.warehouses WHERE id = p_source_warehouse_id AND is_active = true) THEN
    RAISE EXCEPTION 'ERR_WAREHOUSE_NOT_FOUND: انبار مبدا معتبر و فعال یافت نشد.'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.warehouses WHERE id = p_destination_warehouse_id AND is_active = true) THEN
    RAISE EXCEPTION 'ERR_WAREHOUSE_NOT_FOUND: انبار مقصد معتبر و فعال یافت نشد.'
      USING ERRCODE = '22023';
  END IF;

  -- 4. Normalize Strings and Enforce Upfront Key Length Invariant (Task 1)
  -- The ledger stores idempotency_key as VARCHAR(100). Transfers append ':OUT' (4 chars) and ':IN' (3 chars).
  -- Therefore, the base key MUST NOT exceed 100 - 4 = 96 characters.
  v_norm_idemp := NULLIF(pg_catalog.btrim(p_idempotency_key), '');
  v_norm_dest_shelf := NULLIF(pg_catalog.btrim(p_shelf_location_dest), '');

  IF v_norm_idemp IS NOT NULL AND pg_catalog.length(v_norm_idemp) > 96 THEN
    RAISE EXCEPTION 'ERR_IDEMPOTENCY_KEY_TOO_LONG: کلید ارسال‌شده برای انتقال بین‌انباری نمی‌تواند بیشتر از 96 کاراکتر باشد (طول ورودی: %).', pg_catalog.length(v_norm_idemp)
      USING ERRCODE = '22001'; -- string_data_right_truncation
  END IF;

  -- 5. Acquire Advisory Lock & Evaluate Transfer Idempotency (Task 2)
  IF v_norm_idemp IS NOT NULL THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('stock_transfer:' || v_norm_idemp));

    SELECT * INTO v_existing_out
    FROM public.stock_movements
    WHERE idempotency_key = (v_norm_idemp || ':OUT');

    SELECT * INTO v_existing_in
    FROM public.stock_movements
    WHERE idempotency_key = (v_norm_idemp || ':IN');

    IF v_existing_out.id IS NOT NULL OR v_existing_in.id IS NOT NULL THEN
      IF v_existing_out.id IS NULL OR v_existing_in.id IS NULL THEN
        RAISE EXCEPTION 'ERR_INCONSISTENT_TRANSFER_LEDGER: سند انتقال قبلی ناقص ثبت شده است.'
          USING ERRCODE = 'XX000';
      END IF;

      -- Validate ALL relevant operational parameters on retry:
      -- 1. Source warehouse
      -- 2. Destination warehouse (and cross references)
      -- 3. Product variant
      -- 4. Quantity (outflow negative, inflow positive)
      -- 5. Destination shelf location
      IF v_existing_out.warehouse_id <> p_source_warehouse_id OR
         v_existing_in.warehouse_id <> p_destination_warehouse_id OR
         v_existing_out.reference_id <> p_destination_warehouse_id OR
         v_existing_in.reference_id <> p_source_warehouse_id OR
         v_existing_out.variant_id <> p_variant_id OR
         v_existing_in.variant_id <> p_variant_id OR
         v_existing_out.quantity_change <> (-p_quantity) OR
         v_existing_in.quantity_change <> p_quantity OR
         v_existing_in.shelf_location IS DISTINCT FROM v_norm_dest_shelf THEN
        RAISE EXCEPTION 'ERR_IDEMPOTENCY_CONFLICT: کلید انتقال (%) پیش‌تر برای عملیات متفاوتی با پارامترهای ناهمخوان ثبت شده است (عدم تطابق انبار مبدا، انبار مقصد، تنوع، مقدار، یا قفسه مقصد).', v_norm_idemp
          USING ERRCODE = '23505'; -- unique_violation
      END IF;

      RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'status', 'idempotent_duplicate',
        'transfer_out_id', v_existing_out.id,
        'transfer_in_id', v_existing_in.id,
        'source_balance_after', v_existing_out.balance_after,
        'destination_balance_after', v_existing_in.balance_after
      );
    END IF;
  END IF;

  -- 6. Deterministic Row Locking Order (LEAST / GREATEST by UUID text)
  IF p_source_warehouse_id::text < p_destination_warehouse_id::text THEN
    v_first_wh := p_source_warehouse_id;
    v_second_wh := p_destination_warehouse_id;
  ELSE
    v_first_wh := p_destination_warehouse_id;
    v_second_wh := p_source_warehouse_id;
  END IF;

  -- Ensure warehouse_stock rows exist for both warehouses
  INSERT INTO public.warehouse_stock (warehouse_id, variant_id, shelf_location, quantity_on_hand, reserved_qty, updated_at)
  VALUES (v_first_wh, p_variant_id, 'UNASSIGNED', 0, 0, pg_catalog.now())
  ON CONFLICT (warehouse_id, variant_id) DO NOTHING;

  INSERT INTO public.warehouse_stock (warehouse_id, variant_id, shelf_location, quantity_on_hand, reserved_qty, updated_at)
  VALUES (v_second_wh, p_variant_id, 'UNASSIGNED', 0, 0, pg_catalog.now())
  ON CONFLICT (warehouse_id, variant_id) DO NOTHING;

  -- Lock first warehouse row
  PERFORM 1 FROM public.warehouse_stock
  WHERE warehouse_id = v_first_wh AND variant_id = p_variant_id
  FOR UPDATE;

  -- Lock second warehouse row
  PERFORM 1 FROM public.warehouse_stock
  WHERE warehouse_id = v_second_wh AND variant_id = p_variant_id
  FOR UPDATE;

  -- 7. Retrieve Source Warehouse Stock & Validate Availability
  SELECT quantity_on_hand, reserved_qty, shelf_location
  INTO v_src_current_stock, v_src_reserved, v_src_shelf
  FROM public.warehouse_stock
  WHERE warehouse_id = p_source_warehouse_id AND variant_id = p_variant_id;

  IF (v_src_current_stock - v_src_reserved) < p_quantity THEN
    RAISE EXCEPTION 'ERR_INSUFFICIENT_STOCK: موجودی قابل‌انتقال انبار مبدا (%) کمتر از مقدار درخواستی انتقال (%) است.',
      (v_src_current_stock - v_src_reserved), p_quantity
      USING ERRCODE = '23514'; -- check_violation
  END IF;

  -- 8. Retrieve Destination Warehouse Stock
  SELECT quantity_on_hand, shelf_location
  INTO v_dst_current_stock, v_dst_shelf
  FROM public.warehouse_stock
  WHERE warehouse_id = p_destination_warehouse_id AND variant_id = p_variant_id;

  IF v_norm_dest_shelf IS NOT NULL AND (v_dst_shelf = 'UNASSIGNED' OR v_dst_shelf <> v_norm_dest_shelf) THEN
    v_dst_shelf := v_norm_dest_shelf;
  END IF;

  v_src_new_stock := v_src_current_stock - p_quantity;
  v_dst_new_stock := v_dst_current_stock + p_quantity;

  -- 9. Update Both Projections Atomically
  UPDATE public.warehouse_stock
  SET quantity_on_hand = v_src_new_stock,
      updated_at = pg_catalog.now()
  WHERE warehouse_id = p_source_warehouse_id AND variant_id = p_variant_id;

  UPDATE public.warehouse_stock
  SET quantity_on_hand = v_dst_new_stock,
      shelf_location = v_dst_shelf,
      updated_at = pg_catalog.now()
  WHERE warehouse_id = p_destination_warehouse_id AND variant_id = p_variant_id;

  -- 10. Record Both Ledger Movements
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
    p_source_warehouse_id,
    p_variant_id,
    -p_quantity,
    v_src_new_stock,
    'transfer_out',
    v_src_shelf,
    'warehouse_transfer',
    p_destination_warehouse_id,
    v_operator_id,
    COALESCE(p_notes, 'Transfer out to destination warehouse'),
    CASE WHEN v_norm_idemp IS NOT NULL THEN v_norm_idemp || ':OUT' ELSE NULL END,
    pg_catalog.now()
  )
  RETURNING id INTO v_out_movement_id;

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
    p_destination_warehouse_id,
    p_variant_id,
    p_quantity,
    v_dst_new_stock,
    'transfer_in',
    v_dst_shelf,
    'warehouse_transfer',
    p_source_warehouse_id,
    v_operator_id,
    COALESCE(p_notes, 'Transfer in from source warehouse'),
    CASE WHEN v_norm_idemp IS NOT NULL THEN v_norm_idemp || ':IN' ELSE NULL END,
    pg_catalog.now()
  )
  RETURNING id INTO v_in_movement_id;

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'status', 'transferred',
    'transfer_out_id', v_out_movement_id,
    'transfer_in_id', v_in_movement_id,
    'quantity_transferred', p_quantity,
    'source_balance_after', v_src_new_stock,
    'destination_balance_after', v_dst_new_stock
  );
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION public.rpc_transfer_warehouse_stock(uuid, uuid, uuid, integer, character varying, text, character varying) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.rpc_transfer_warehouse_stock(uuid, uuid, uuid, integer, character varying, text, character varying) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_transfer_warehouse_stock(uuid, uuid, uuid, integer, character varying, text, character varying) TO authenticated, service_role;
