-- ==============================================================================
-- CNA Mobile Store — Phase 4.3 Real PostgreSQL Role & Permission Security Test
-- Target: Supabase PostgreSQL / Local Postgres SQL Runner (Execute as postgres superuser)
-- Tests: Real PostgreSQL role-switching (SET LOCAL ROLE) for anon, authenticated, and service_role
-- Non-Destructive: Wrapped in BEGIN ... ROLLBACK
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_test_count INT;
  v_view_row RECORD;
  v_sqlstate TEXT;
BEGIN
  RAISE NOTICE '======================================================================';
  RAISE NOTICE '>>> [Phase 4.3 Security Test] Testing PostgreSQL Roles and RLS...';
  RAISE NOTICE '======================================================================';

  -- ============================================================================
  -- 1. ANONYMOUS ROLE (anon) PERMISSION VERIFICATION
  -- ============================================================================
  SET LOCAL ROLE anon;
  RAISE NOTICE '>>> Active role switched to: anon';

  -- 1.1 anon CANNOT select confidential cost_price_toman column
  BEGIN
    PERFORM cost_price_toman FROM public.product_variants LIMIT 1;
    RAISE EXCEPTION 'SECURITY BREACH: anon was able to select cost_price_toman!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '✓ [anon Security] Column cost_price_toman denied with SQLSTATE 42501 (insufficient_privilege).';
    WHEN OTHERS THEN
      v_sqlstate := SQLSTATE;
      IF v_sqlstate = '42501' THEN
        RAISE NOTICE '✓ [anon Security] Column cost_price_toman denied with 42501.';
      ELSE
        RAISE;
      END IF;
  END;

  -- 1.2 anon CANNOT directly select from warehouse_stock table
  BEGIN
    PERFORM * FROM public.warehouse_stock LIMIT 1;
    RAISE EXCEPTION 'SECURITY BREACH: anon was able to directly query warehouse_stock!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '✓ [anon Security] Table warehouse_stock denied with SQLSTATE 42501 (insufficient_privilege).';
    WHEN OTHERS THEN
      v_sqlstate := SQLSTATE;
      IF v_sqlstate = '42501' THEN
        RAISE NOTICE '✓ [anon Security] Table warehouse_stock denied with 42501.';
      ELSE
        RAISE;
      END IF;
  END;

  -- 1.3 anon CAN read public published catalog via v_storefront_products
  SELECT id, slug, name, price, "inStock", "stockCount" INTO v_view_row 
  FROM public.v_storefront_products 
  LIMIT 1;

  IF v_view_row.id IS NULL THEN
    RAISE EXCEPTION 'SECURITY FAILURE: anon is unable to read public storefront view v_storefront_products';
  END IF;
  RAISE NOTICE '✓ [anon Security] Public read from v_storefront_products granted and functional.';

  -- 1.4 anon CANNOT execute rpc_record_stock_movement
  BEGIN
    PERFORM public.rpc_record_stock_movement(
      '00000000-0000-0000-0000-000000000000'::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      1,
      'purchase_inflow'
    );
    RAISE EXCEPTION 'SECURITY BREACH: anon was able to execute rpc_record_stock_movement!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '✓ [anon Security] Execution of rpc_record_stock_movement denied with SQLSTATE 42501.';
    WHEN OTHERS THEN
      v_sqlstate := SQLSTATE;
      IF v_sqlstate = '42501' THEN
        RAISE NOTICE '✓ [anon Security] rpc_record_stock_movement denied with 42501.';
      ELSE
        RAISE;
      END IF;
  END;

  -- 1.5 anon CANNOT execute rpc_transfer_warehouse_stock
  BEGIN
    PERFORM public.rpc_transfer_warehouse_stock(
      '00000000-0000-0000-0000-000000000000'::uuid,
      '11111111-1111-1111-1111-111111111111'::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      1
    );
    RAISE EXCEPTION 'SECURITY BREACH: anon was able to execute rpc_transfer_warehouse_stock!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '✓ [anon Security] Execution of rpc_transfer_warehouse_stock denied with SQLSTATE 42501.';
    WHEN OTHERS THEN
      v_sqlstate := SQLSTATE;
      IF v_sqlstate = '42501' THEN
        RAISE NOTICE '✓ [anon Security] rpc_transfer_warehouse_stock denied with 42501.';
      ELSE
        RAISE;
      END IF;
  END;

  RESET ROLE;
  RAISE NOTICE '>>> Role restored to postgres.';

  -- ============================================================================
  -- 2. UNAUTHORIZED AUTHENTICATED USER PERMISSION VERIFICATION
  -- ============================================================================
  SET LOCAL ROLE authenticated;
  RAISE NOTICE '>>> Active role switched to: authenticated';

  -- 2.1 Standard authenticated user (customer) cannot mutate inventory via RPC
  BEGIN
    PERFORM public.rpc_record_stock_movement(
      '00000000-0000-0000-0000-000000000000'::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      1,
      'purchase_inflow'
    );
    RAISE EXCEPTION 'SECURITY BREACH: Unauthorized authenticated user was able to record stock movement!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '✓ [authenticated Security] RPC invocation denied with SQLSTATE 42501.';
    WHEN OTHERS THEN
      IF SQLSTATE = '42501' OR SQLERRM LIKE '%دسترسی غیرمجاز%' THEN
        RAISE NOTICE '✓ [authenticated Security] Unauthorized inventory mutation successfully blocked.';
      ELSE
        RAISE;
      END IF;
  END;

  -- 2.2 Standard authenticated user cannot execute warehouse transfers
  BEGIN
    PERFORM public.rpc_transfer_warehouse_stock(
      '00000000-0000-0000-0000-000000000000'::uuid,
      '11111111-1111-1111-1111-111111111111'::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      1
    );
    RAISE EXCEPTION 'SECURITY BREACH: Unauthorized authenticated user was able to transfer warehouse stock!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '✓ [authenticated Security] Transfer RPC invocation denied with SQLSTATE 42501.';
    WHEN OTHERS THEN
      IF SQLSTATE = '42501' OR SQLERRM LIKE '%دسترسی غیرمجاز%' THEN
        RAISE NOTICE '✓ [authenticated Security] Unauthorized warehouse transfer successfully blocked.';
      ELSE
        RAISE;
      END IF;
  END;

  -- 2.3 RLS blocks standard authenticated customer from reading warehouse_stock table
  SELECT COUNT(*) INTO v_test_count FROM public.warehouse_stock;
  IF v_test_count <> 0 THEN
    RAISE EXCEPTION 'SECURITY BREACH: Unprivileged customer saw % warehouse_stock rows through RLS!', v_test_count;
  END IF;
  RAISE NOTICE '✓ [authenticated Security] RLS filtered warehouse_stock to 0 rows for unprivileged user.';

  RESET ROLE;
  RAISE NOTICE '>>> Role restored to postgres.';

  -- ============================================================================
  -- 3. SERVICE ROLE (service_role) ADMINISTRATIVE VERIFICATION
  -- ============================================================================
  SET LOCAL ROLE service_role;
  RAISE NOTICE '>>> Active role switched to: service_role';

  SELECT COUNT(*) INTO v_test_count FROM public.product_variants;
  IF v_test_count = 0 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: service_role cannot read product_variants';
  END IF;
  RAISE NOTICE '✓ [service_role Security] Administrative read on product_variants verified (% rows).', v_test_count;

  RESET ROLE;

  RAISE NOTICE '======================================================================';
  RAISE NOTICE '>>> [Phase 4.3 Security Test] ALL SECURITY CHECKS PASSED! <<<';
  RAISE NOTICE '======================================================================';
END $$;

ROLLBACK;
