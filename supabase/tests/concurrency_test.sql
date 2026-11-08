-- ==============================================================================
-- CNA Mobile Store — Phase 4.3 Database Concurrency & Race Condition Verification
-- Target: Supabase PostgreSQL / psql Dual-Session Testing
-- Architecture Notes:
--   1. Sections A and B below are MANUAL RUNTIME PROCEDURES requiring two simultaneous
--      independent client connections (Session 1 and Session 2) to physically test race conditions.
--   2. Invariant Guarantee: Test setup NEVER executes direct UPDATE/INSERT on warehouse_stock.
--      All inventory is created strictly through authoritative ledger RPCs (rpc_record_stock_movement).
--   3. Strict Isolation: Tests operate exclusively against dedicated test entities:
--      * Warehouses: WH-TEST-CONCURRENCY-SRC, WH-TEST-CONCURRENCY-DST
--      * Variant: CNA-TEST-CONCURRENCY
--      Production seed data (WH-CENTRAL, 26 products, 46 SKUs, 296 units) remains completely untouched.
--   4. Section C is a SEQUENTIAL in-session idempotency check (NOT a concurrent test).
--   5. For automated programmatic dual-connection testing, run the Node.js harness:
--      npx tsx scripts/verifyConcurrencyHarness.ts
-- ==============================================================================

-- ==============================================================================
-- SECTION A (MANUAL RUNTIME PROCEDURE): Concurrent Duplicate Requests with Same Key
-- Goal: Verify transaction-scoped advisory locks serialize execution across two
--       distinct client connections, guaranteeing exactly ONE ledger movement is
--       created, and the concurrent call returns status 'idempotent_duplicate'.
-- ==============================================================================

/*
-- [PREREQUISITE SETUP] Ensure isolated test entities exist and are funded via ledger RPC:
-- Run once as warehouse manager / postgres superuser:
SELECT public.rpc_record_stock_movement(
  p_warehouse_id := (SELECT id FROM public.warehouses WHERE code = 'WH-TEST-CONCURRENCY-SRC'),
  p_variant_id := (SELECT id FROM public.product_variants WHERE sku = 'CNA-TEST-CONCURRENCY'),
  p_quantity_change := 20,
  p_movement_type := 'purchase_inflow',
  p_shelf_location := 'A-SRC-01',
  p_notes := 'Manual procedure test opening stock',
  p_idempotency_key := 'MANUAL-SETUP-INFLOW-001'
);

-- [SESSION 1] Step A1: Start transaction, acquire lock & record movement
BEGIN;
SELECT public.rpc_record_stock_movement(
  p_warehouse_id := (SELECT id FROM public.warehouses WHERE code = 'WH-TEST-CONCURRENCY-SRC'),
  p_variant_id := (SELECT id FROM public.product_variants WHERE sku = 'CNA-TEST-CONCURRENCY'),
  p_quantity_change := 1,
  p_movement_type := 'purchase_inflow',
  p_shelf_location := 'A-SRC-01',
  p_notes := 'Session 1 concurrent inflow test',
  p_idempotency_key := 'CONCURRENCY-RACE-KEY-001'
);
-- DO NOT COMMIT YET. Keep Session 1 open.

-- [SESSION 2] Step A2: Concurrently issue the EXACT same call in Session 2
BEGIN;
SELECT public.rpc_record_stock_movement(
  p_warehouse_id := (SELECT id FROM public.warehouses WHERE code = 'WH-TEST-CONCURRENCY-SRC'),
  p_variant_id := (SELECT id FROM public.product_variants WHERE sku = 'CNA-TEST-CONCURRENCY'),
  p_quantity_change := 1,
  p_movement_type := 'purchase_inflow',
  p_shelf_location := 'A-SRC-01',
  p_notes := 'Session 2 concurrent inflow test',
  p_idempotency_key := 'CONCURRENCY-RACE-KEY-001'
);
-- Notice: Session 2 immediately BLOCKS waiting for Session 1's advisory lock.

-- [SESSION 1] Step A3: Commit Session 1
COMMIT;

-- [SESSION 2] Step A4: Session 2 automatically unblocks!
-- Result returned in Session 2:
-- {"success": true, "status": "idempotent_duplicate", "movement_id": "<SAME_UUID_FROM_SESSION_1>", "balance_after": ...}
COMMIT;

-- [VERIFICATION QUERY]
SELECT COUNT(*) AS total_movements_for_key, array_agg(id) AS movement_ids
FROM public.stock_movements
WHERE idempotency_key = 'CONCURRENCY-RACE-KEY-001';
-- Expected: total_movements_for_key = 1
*/


-- ==============================================================================
-- SECTION B (MANUAL RUNTIME PROCEDURE): Concurrent Stock Reductions (Overdraft Race Prevention)
-- Goal: Given available stock of 5 units (funded via ledger RPC), two concurrent requests
--       each attempt to sell 4 units (-4). With pessimistic row locking (FOR UPDATE),
--       Session 1 succeeds (leaving 1 unit), and Session 2 is serialized, evaluates
--       1 - 4 = -3, and raises ERR_INSUFFICIENT_STOCK (SQLSTATE 23514), preventing negative inventory.
-- ==============================================================================

/*
-- Step B0 (Setup): Ensure dedicated variant has exactly 5 units on hand via ledger movement
SELECT public.rpc_record_stock_movement(
  p_warehouse_id := (SELECT id FROM public.warehouses WHERE code = 'WH-TEST-CONCURRENCY-SRC'),
  p_variant_id := (SELECT id FROM public.product_variants WHERE sku = 'CNA-TEST-CONCURRENCY'),
  p_quantity_change := 5,
  p_movement_type := 'purchase_inflow',
  p_shelf_location := 'A-SRC-01',
  p_notes := 'Setup exactly 5 units for overdraft test',
  p_idempotency_key := 'MANUAL-SETUP-OVERDRAFT-5UNITS'
);

-- [SESSION 1] Step B1: Start transaction, lock row & deduct 4 units
BEGIN;
SELECT public.rpc_record_stock_movement(
  p_warehouse_id := (SELECT id FROM public.warehouses WHERE code = 'WH-TEST-CONCURRENCY-SRC'),
  p_variant_id := (SELECT id FROM public.product_variants WHERE sku = 'CNA-TEST-CONCURRENCY'),
  p_quantity_change := -4,
  p_movement_type := 'order_sale',
  p_shelf_location := 'A-SRC-01',
  p_notes := 'Session 1 race sale',
  p_idempotency_key := 'CONCURRENCY-SALE-KEY-001'
);
-- DO NOT COMMIT YET. Session 1 holds FOR UPDATE row lock on warehouse_stock.

-- [SESSION 2] Step B2: Concurrently attempt to deduct 4 units in Session 2
BEGIN;
SELECT public.rpc_record_stock_movement(
  p_warehouse_id := (SELECT id FROM public.warehouses WHERE code = 'WH-TEST-CONCURRENCY-SRC'),
  p_variant_id := (SELECT id FROM public.product_variants WHERE sku = 'CNA-TEST-CONCURRENCY'),
  p_quantity_change := -4,
  p_movement_type := 'order_sale',
  p_shelf_location := 'A-SRC-01',
  p_notes := 'Session 2 race sale',
  p_idempotency_key := 'CONCURRENCY-SALE-KEY-002'
);
-- Session 2 BLOCKS waiting for row lock held by Session 1.

-- [SESSION 1] Step B3: Commit Session 1
COMMIT;
-- Session 1 committed: stock is reduced by 4.

-- [SESSION 2] Step B4: Session 2 unblocks, acquires row lock, reads remaining stock,
-- evaluates balance < 0, and immediately raises:
-- ERROR: ERR_INSUFFICIENT_STOCK: موجودی انبار کمتر از مقدار درخواستی است.
-- SQLSTATE: 23514 (check_violation)
ROLLBACK;

-- [VERIFICATION QUERY]
SELECT ws.quantity_on_hand, SUM(sm.quantity_change) AS ledger_sum
FROM public.warehouse_stock ws
JOIN public.stock_movements sm ON ws.warehouse_id = sm.warehouse_id AND ws.variant_id = sm.variant_id
WHERE ws.warehouse_id = (SELECT id FROM public.warehouses WHERE code = 'WH-TEST-CONCURRENCY-SRC')
  AND ws.variant_id = (SELECT id FROM public.product_variants WHERE sku = 'CNA-TEST-CONCURRENCY')
GROUP BY ws.quantity_on_hand;
-- Expected: quantity_on_hand >= 0 AND quantity_on_hand = ledger_sum (Zero negative stock balance, full ledger reconciliation).
*/


-- ==============================================================================
-- SECTION C: SEQUENTIAL IN-SESSION IDEMPOTENCY VERIFICATION (Single Connection)
-- NOTE: This is a purely sequential test executed in one database session.
--       It tests caching and deduplication, but does NOT test concurrent interleaving.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_wh_id UUID;
  v_var_id UUID;
  v_res1 JSONB;
  v_res2 JSONB;
BEGIN
  -- Provision temporary isolated warehouse and variant for non-destructive sequential check
  INSERT INTO public.warehouses (code, name_fa, address, is_central, is_active)
  VALUES ('WH-TEST-SEQ-TMP', 'انبار موقت تست ترتیبی', 'تهران، تست موقت', false, true)
  ON CONFLICT (code) DO UPDATE SET is_active = true
  RETURNING id INTO v_wh_id;

  SELECT id INTO STRICT v_var_id FROM public.product_variants LIMIT 1;

  -- Sequential Call 1
  v_res1 := public.rpc_record_stock_movement(
    p_warehouse_id := v_wh_id,
    p_variant_id := v_var_id,
    p_quantity_change := 1,
    p_movement_type := 'purchase_inflow',
    p_shelf_location := 'SEQ-01',
    p_idempotency_key := 'TEST-SEQUENTIAL-IDEMP-001'
  );

  -- Sequential Call 2 with identical key
  v_res2 := public.rpc_record_stock_movement(
    p_warehouse_id := v_wh_id,
    p_variant_id := v_var_id,
    p_quantity_change := 1,
    p_movement_type := 'purchase_inflow',
    p_shelf_location := 'SEQ-01',
    p_idempotency_key := 'TEST-SEQUENTIAL-IDEMP-001'
  );

  IF (v_res1->>'status') <> 'recorded' OR (v_res2->>'status') <> 'idempotent_duplicate' THEN
    RAISE EXCEPTION 'Sequential idempotency test failed: Expected recorded then idempotent_duplicate';
  END IF;

  IF (v_res1->>'movement_id') <> (v_res2->>'movement_id') THEN
    RAISE EXCEPTION 'Sequential idempotency test failed: Movement IDs differ between calls';
  END IF;

  RAISE NOTICE '✓ [Sequential Idempotency] Single-session sequential repeat safely returned cached result.';
END $$;

ROLLBACK;
