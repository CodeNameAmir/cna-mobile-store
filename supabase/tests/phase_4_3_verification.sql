-- ==============================================================================
-- CNA Mobile Store — Phase 4.3 Non-Destructive Verification & Security Test Suite
-- Target: Supabase PostgreSQL / Local Postgres SQL Runner
-- Transaction-Safe: Fully wrapped in BEGIN ... ROLLBACK so testing leaves database in pristine 296-unit state.
-- Covers: Catalog counts, Part numbers, Inventory reconciliation, Overdraft protection,
--         Sales outflows, Inflow, Idempotency, Immutability, View security masking
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_test_wh_id UUID;
  v_test_variant_id UUID;
  v_prod_count INT;
  v_sku_count INT;
  v_total_stock INT;
  v_ledger_sum INT;
  v_res JSONB;
  v_dup_res JSONB;
  v_sale_res JSONB;
  v_stock_before INT;
  v_stock_after INT;
  v_column_exists BOOLEAN;
  v_view_row RECORD;
BEGIN
  RAISE NOTICE '======================================================================';
  RAISE NOTICE '>>> [Phase 4.3 Test Suite] Starting Non-Destructive Verification...';
  RAISE NOTICE '======================================================================';

  -- ============================================================================
  -- 1. CATALOG INTEGRITY & PART NUMBER VERIFICATION
  -- ============================================================================
  SELECT COUNT(*) INTO v_prod_count FROM public.products;
  IF v_prod_count <> 26 THEN
    RAISE EXCEPTION 'TEST FAILED: Expected 26 products, found %', v_prod_count;
  END IF;
  RAISE NOTICE '✓ [Catalog] Exactly 26 products present.';

  SELECT COUNT(*) INTO v_sku_count FROM public.product_variants;
  IF v_sku_count <> 46 THEN
    RAISE EXCEPTION 'TEST FAILED: Expected 46 SKUs, found %', v_sku_count;
  END IF;
  RAISE NOTICE '✓ [Catalog] Exactly 46 SKUs present.';

  -- Verify Brand and Category Foreign Keys
  IF EXISTS (SELECT 1 FROM public.products WHERE brand_id IS NULL OR category_id IS NULL) THEN
    RAISE EXCEPTION 'TEST FAILED: Found products with missing brand or category foreign keys';
  END IF;
  RAISE NOTICE '✓ [Catalog] All foreign keys are strictly satisfied.';

  -- Verify part_number column exists on product_variants
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'product_variants' 
      AND column_name = 'part_number'
  ) INTO v_column_exists;

  IF NOT v_column_exists THEN
    RAISE EXCEPTION 'TEST FAILED: Column part_number missing from product_variants';
  END IF;
  RAISE NOTICE '✓ [Schema] Column part_number verified on public.product_variants.';

  -- ============================================================================
  -- 2. INVENTORY RECONCILIATION VERIFICATION
  -- ============================================================================
  SELECT SUM(quantity_on_hand) INTO v_total_stock FROM public.warehouse_stock;
  IF v_total_stock <> 296 THEN
    RAISE EXCEPTION 'TEST FAILED: Expected 296 total on-hand units, found %', v_total_stock;
  END IF;
  RAISE NOTICE '✓ [Inventory] Warehouse stock projection sums to exactly 296 units.';

  SELECT SUM(quantity_change) INTO v_ledger_sum FROM public.stock_movements;
  IF v_ledger_sum <> 296 THEN
    RAISE EXCEPTION 'TEST FAILED: Expected 296 ledger units, found %', v_ledger_sum;
  END IF;
  RAISE NOTICE '✓ [Inventory] Movement ledger sum reconciles perfectly with 296 units.';

  IF EXISTS (SELECT 1 FROM public.warehouse_stock WHERE quantity_on_hand < 0) THEN
    RAISE EXCEPTION 'TEST FAILED: Detected negative inventory in warehouse_stock';
  END IF;
  RAISE NOTICE '✓ [Inventory] Zero negative stock balances verified.';

  -- ============================================================================
  -- 3. LEDGER IMMUTABILITY VERIFICATION
  -- ============================================================================
  BEGIN
    UPDATE public.stock_movements SET quantity_change = 999 WHERE id = (SELECT id FROM public.stock_movements LIMIT 1);
    RAISE EXCEPTION 'TEST FAILED: Direct UPDATE on stock_movements should have been blocked by trigger!';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%سوابق گردش انبار در جدول stock_movements تغییرناپذیر هستند%' THEN
        RAISE NOTICE '✓ [Immutability] UPDATE protection successfully blocked unauthorized mutation.';
      ELSE
        RAISE;
      END IF;
  END;

  BEGIN
    DELETE FROM public.stock_movements WHERE id = (SELECT id FROM public.stock_movements LIMIT 1);
    RAISE EXCEPTION 'TEST FAILED: Direct DELETE on stock_movements should have been blocked by trigger!';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%سوابق گردش انبار در جدول stock_movements تغییرناپذیر هستند%' THEN
        RAISE NOTICE '✓ [Immutability] DELETE protection successfully blocked unauthorized deletion.';
      ELSE
        RAISE;
      END IF;
  END;

  -- ============================================================================
  -- 4. RPC IDEMPOTENCY, SALES OUTFLOW & OVERDRAFT PROTECTION
  -- ============================================================================
  SELECT id INTO STRICT v_test_wh_id FROM public.warehouses WHERE code = 'WH-CENTRAL';
  SELECT id INTO STRICT v_test_variant_id FROM public.product_variants WHERE sku = 'CNA-APL-16PM-256-DES';

  SELECT quantity_on_hand INTO v_stock_before
  FROM public.warehouse_stock
  WHERE warehouse_id = v_test_wh_id AND variant_id = v_test_variant_id;

  -- 4.1 Positive Movement (purchase_inflow)
  v_res := public.rpc_record_stock_movement(
    p_warehouse_id := v_test_wh_id,
    p_variant_id := v_test_variant_id,
    p_quantity_change := 2,
    p_movement_type := 'purchase_inflow',
    p_shelf_location := 'B-14',
    p_notes := 'Automated test purchase inflow',
    p_idempotency_key := 'TEST-IDEMP-KEY-NONDEST-001'
  );

  IF (v_res->>'success')::boolean <> true OR (v_res->>'status') <> 'recorded' THEN
    RAISE EXCEPTION 'TEST FAILED: First RPC inflow call failed: %', v_res;
  END IF;

  SELECT quantity_on_hand INTO v_stock_after
  FROM public.warehouse_stock
  WHERE warehouse_id = v_test_wh_id AND variant_id = v_test_variant_id;

  IF v_stock_after <> v_stock_before + 2 THEN
    RAISE EXCEPTION 'TEST FAILED: Stock did not increment by 2 (before: %, after: %)', v_stock_before, v_stock_after;
  END IF;
  RAISE NOTICE '✓ [RPC] Positive purchase inflow recorded and stock incremented.';

  -- 4.2 Idempotent Duplicate Request with Same Parameters
  v_dup_res := public.rpc_record_stock_movement(
    p_warehouse_id := v_test_wh_id,
    p_variant_id := v_test_variant_id,
    p_quantity_change := 2,
    p_movement_type := 'purchase_inflow',
    p_shelf_location := 'B-14',
    p_notes := 'Different notes should still be recognized as duplicate',
    p_idempotency_key := 'TEST-IDEMP-KEY-NONDEST-001'
  );

  IF (v_dup_res->>'success')::boolean <> true OR (v_dup_res->>'status') <> 'idempotent_duplicate' THEN
    RAISE EXCEPTION 'TEST FAILED: Idempotent repeat request did not return idempotent_duplicate status: %', v_dup_res;
  END IF;

  SELECT quantity_on_hand INTO v_stock_after
  FROM public.warehouse_stock
  WHERE warehouse_id = v_test_wh_id AND variant_id = v_test_variant_id;

  IF v_stock_after <> v_stock_before + 2 THEN
    RAISE EXCEPTION 'TEST FAILED: Duplicate idempotent call mutated stock!';
  END IF;
  RAISE NOTICE '✓ [RPC] Repeated idempotent request returned cached result without duplicate ledger entry.';

  -- 4.3 Idempotency Rejection on Differing Shelf Location
  BEGIN
    PERFORM public.rpc_record_stock_movement(
      p_warehouse_id := v_test_wh_id,
      p_variant_id := v_test_variant_id,
      p_quantity_change := 2,
      p_movement_type := 'purchase_inflow',
      p_shelf_location := 'DIFFERENT-SHELF-99',
      p_notes := 'Should fail due to different shelf',
      p_idempotency_key := 'TEST-IDEMP-KEY-NONDEST-001'
    );
    RAISE EXCEPTION 'TEST FAILED: Repeated key with different shelf location should have been rejected!';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%تداخل کلید ضدتکرار%' THEN
        RAISE NOTICE '✓ [RPC] Repeated key with conflicting shelf location correctly rejected.';
      ELSE
        RAISE;
      END IF;
  END;

  -- 4.4 Idempotency Rejection on Differing Quantity
  BEGIN
    PERFORM public.rpc_record_stock_movement(
      p_warehouse_id := v_test_wh_id,
      p_variant_id := v_test_variant_id,
      p_quantity_change := 10,
      p_movement_type := 'purchase_inflow',
      p_shelf_location := 'B-14',
      p_notes := 'Should fail due to different quantity',
      p_idempotency_key := 'TEST-IDEMP-KEY-NONDEST-001'
    );
    RAISE EXCEPTION 'TEST FAILED: Repeated key with different quantity should have been rejected!';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%تداخل کلید ضدتکرار%' THEN
        RAISE NOTICE '✓ [RPC] Repeated key with conflicting quantity correctly rejected.';
      ELSE
        RAISE;
      END IF;
  END;

  -- 4.5 Sales Outflow Test (Negative Quantity)
  v_sale_res := public.rpc_record_stock_movement(
    p_warehouse_id := v_test_wh_id,
    p_variant_id := v_test_variant_id,
    p_quantity_change := -1,
    p_movement_type := 'order_sale',
    p_shelf_location := 'B-14',
    p_notes := 'Automated test customer sale',
    p_idempotency_key := 'TEST-IDEMP-KEY-NONDEST-002'
  );

  IF (v_sale_res->>'success')::boolean <> true OR (v_sale_res->>'status') <> 'recorded' THEN
    RAISE EXCEPTION 'TEST FAILED: Order sale RPC call failed: %', v_sale_res;
  END IF;
  RAISE NOTICE '✓ [RPC] Outflow order sale recorded successfully.';

  -- 4.6 Overdraft Prevention Test (Attempting to decrement more than available)
  BEGIN
    PERFORM public.rpc_record_stock_movement(
      p_warehouse_id := v_test_wh_id,
      p_variant_id := v_test_variant_id,
      p_quantity_change := -99999,
      p_movement_type := 'order_sale',
      p_shelf_location := 'B-14',
      p_notes := 'Should fail due to insufficient inventory',
      p_idempotency_key := 'TEST-IDEMP-KEY-NONDEST-OVERDRAFT'
    );
    RAISE EXCEPTION 'TEST FAILED: Attempted overdraft of 99999 units should have thrown an exception!';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%موجودی انبار ناکافی است%' OR SQLERRM LIKE '%quantity_on_hand%' THEN
        RAISE NOTICE '✓ [RPC] Overdraft prevention verified: decrementing below zero was blocked.';
      ELSE
        RAISE;
      END IF;
  END;

  -- ============================================================================
  -- 5. STOREFRONT VIEW INTEGRITY & DATA MASKING
  -- ============================================================================
  SELECT * INTO v_view_row 
  FROM public.v_storefront_products 
  WHERE slug = 'iphone-16-pro-max';

  IF v_view_row.id IS NULL THEN
    RAISE EXCEPTION 'TEST FAILED: v_storefront_products does not contain iphone-16-pro-max';
  END IF;
  RAISE NOTICE '✓ [View] Storefront view correctly aggregates published products and variants.';

  -- Verify View Column Masking: Check that internal warehouse data is NOT exposed in the view
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'v_storefront_products' 
      AND column_name IN ('shelf_location', 'shelfLocation', 'on_hand_stock', 'onHandStock', 'cost_price_toman', 'costPriceToman')
  ) INTO v_column_exists;

  IF v_column_exists THEN
    RAISE EXCEPTION 'TEST FAILED: Sensitive internal columns detected in public.v_storefront_products!';
  END IF;
  RAISE NOTICE '✓ [Security] v_storefront_products strictly masks internal shelf locations, on-hand counts, and cost prices.';

  RAISE NOTICE '======================================================================';
  RAISE NOTICE '>>> [Phase 4.3 Test Suite] ALL AUTOMATED TESTS PASSED SUCCESSFULLY! <<<';
  RAISE NOTICE '======================================================================';
END $$;

-- Transaction Rollback: Guarantee database remains at pristine 296-unit state
ROLLBACK;
