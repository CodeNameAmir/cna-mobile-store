-- ==============================================================================
-- CNA Mobile Store — Phase 4.3 Database Concurrency & Race Condition Verification
-- Target: Supabase PostgreSQL / psql Dual-Session Testing
-- Instructions: Run Connection 1 statements in Session 1, and Connection 2 in Session 2.
-- ==============================================================================

-- ==============================================================================
-- SCENARIO A: Concurrent Duplicate Requests with Same Idempotency Key
-- Goal: Verify transaction-scoped advisory locks serialize execution,
--       guaranteeing exactly ONE ledger movement is created, and the concurrent
--       call returns status 'idempotent_duplicate' with the same movement ID.
-- ==============================================================================

/*
-- [SESSION 1] Step A1: Start transaction, acquire lock & record movement
BEGIN;
SELECT public.rpc_record_stock_movement(
  p_warehouse_id := (SELECT id FROM public.warehouses WHERE code = 'WH-CENTRAL'),
  p_variant_id := (SELECT id FROM public.product_variants WHERE sku = 'CNA-APL-16PM-256-DES'),
  p_quantity_change := 1,
  p_movement_type := 'purchase_inflow',
  p_shelf_location := 'B-14',
  p_notes := 'Session 1 concurrent inflow test',
  p_idempotency_key := 'CONCURRENCY-RACE-KEY-001'
);
-- DO NOT COMMIT YET. Keep Session 1 open.

-- [SESSION 2] Step A2: Concurrently issue the EXACT same call in Session 2
BEGIN;
SELECT public.rpc_record_stock_movement(
  p_warehouse_id := (SELECT id FROM public.warehouses WHERE code = 'WH-CENTRAL'),
  p_variant_id := (SELECT id FROM public.product_variants WHERE sku = 'CNA-APL-16PM-256-DES'),
  p_quantity_change := 1,
  p_movement_type := 'purchase_inflow',
  p_shelf_location := 'B-14',
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
-- SCENARIO B: Concurrent Stock Reductions Against Same SKU (Overdraft Race Prevention)
-- Goal: Given available stock of 5 units, two concurrent requests each attempt to
--       sell 4 units (-4). With pessimistic row locking (FOR UPDATE), Session 1
--       succeeds (leaving 1 unit), and Session 2 is serialized, evaluates 1 - 4 = -3,
--       and raises ERR_INSUFFICIENT_STOCK (SQLSTATE 23514), preventing negative inventory.
-- ==============================================================================

/*
-- Step B0 (Setup): Ensure variant has exactly 5 units on hand
UPDATE public.warehouse_stock
SET quantity_on_hand = 5
WHERE warehouse_id = (SELECT id FROM public.warehouses WHERE code = 'WH-CENTRAL')
  AND variant_id = (SELECT id FROM public.product_variants WHERE sku = 'CNA-APL-16PM-256-DES');

-- [SESSION 1] Step B1: Start transaction, lock row & deduct 4 units
BEGIN;
SELECT public.rpc_record_stock_movement(
  p_warehouse_id := (SELECT id FROM public.warehouses WHERE code = 'WH-CENTRAL'),
  p_variant_id := (SELECT id FROM public.product_variants WHERE sku = 'CNA-APL-16PM-256-DES'),
  p_quantity_change := -4,
  p_movement_type := 'order_sale',
  p_shelf_location := 'B-14',
  p_notes := 'Session 1 race sale',
  p_idempotency_key := 'CONCURRENCY-SALE-KEY-001'
);
-- DO NOT COMMIT YET. Session 1 holds FOR UPDATE row lock on warehouse_stock.

-- [SESSION 2] Step B2: Concurrently attempt to deduct 4 units in Session 2
BEGIN;
SELECT public.rpc_record_stock_movement(
  p_warehouse_id := (SELECT id FROM public.warehouses WHERE code = 'WH-CENTRAL'),
  p_variant_id := (SELECT id FROM public.product_variants WHERE sku = 'CNA-APL-16PM-256-DES'),
  p_quantity_change := -4,
  p_movement_type := 'order_sale',
  p_shelf_location := 'B-14',
  p_notes := 'Session 2 race sale',
  p_idempotency_key := 'CONCURRENCY-SALE-KEY-002'
);
-- Session 2 BLOCKS waiting for row lock held by Session 1.

-- [SESSION 1] Step B3: Commit Session 1
COMMIT;
-- Session 1 committed: stock is now 5 - 4 = 1.

-- [SESSION 2] Step B4: Session 2 unblocks, acquires row lock, reads stock = 1,
-- attempts 1 - 4 = -3 < 0, and immediately raises:
-- ERROR: ERR_INSUFFICIENT_STOCK: موجودی انبار (1) کمتر از مقدار درخواستی (4) است.
-- SQLSTATE: 23514 (check_violation)
ROLLBACK;

-- [VERIFICATION QUERY]
SELECT quantity_on_hand
FROM public.warehouse_stock
WHERE warehouse_id = (SELECT id FROM public.warehouses WHERE code = 'WH-CENTRAL')
  AND variant_id = (SELECT id FROM public.product_variants WHERE sku = 'CNA-APL-16PM-256-DES');
-- Expected: quantity_on_hand = 1 (Zero negative stock balance).
*/


-- ==============================================================================
-- AUTOMATED IN-SESSION SERIALIZED SIMULATION (Non-Destructive)
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_wh_id UUID;
  v_var_id UUID;
  v_res1 JSONB;
  v_res2 JSONB;
  v_stock_final INT;
BEGIN
  SELECT id INTO STRICT v_wh_id FROM public.warehouses WHERE code = 'WH-CENTRAL';
  SELECT id INTO STRICT v_var_id FROM public.product_variants WHERE sku = 'CNA-APL-16PM-256-DES';

  -- Test Serialization: Step 1
  v_res1 := public.rpc_record_stock_movement(
    p_warehouse_id := v_wh_id,
    p_variant_id := v_var_id,
    p_quantity_change := 1,
    p_movement_type := 'purchase_inflow',
    p_shelf_location := 'B-14',
    p_idempotency_key := 'TEST-SERIAL-RACE-001'
  );

  -- Test Serialization: Step 2 with identical key
  v_res2 := public.rpc_record_stock_movement(
    p_warehouse_id := v_wh_id,
    p_variant_id := v_var_id,
    p_quantity_change := 1,
    p_movement_type := 'purchase_inflow',
    p_shelf_location := 'B-14',
    p_idempotency_key := 'TEST-SERIAL-RACE-001'
  );

  IF (v_res1->>'status') <> 'recorded' OR (v_res2->>'status') <> 'idempotent_duplicate' THEN
    RAISE EXCEPTION 'Concurrency test failed: Expected recorded then idempotent_duplicate';
  END IF;

  IF (v_res1->>'movement_id') <> (v_res2->>'movement_id') THEN
    RAISE EXCEPTION 'Concurrency test failed: Movement IDs differ between idempotent calls';
  END IF;

  RAISE NOTICE '✓ [Concurrency Simulation] Serialized duplicate calls safely deduplicated to single movement ID.';
END $$;

ROLLBACK;
