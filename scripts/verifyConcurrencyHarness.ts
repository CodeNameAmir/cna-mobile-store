/**
 * CNA Mobile Store — Automated Two-Connection Concurrency Harness
 * Uses two independent PostgreSQL clients via the 'pg' library to verify:
 *   1. Simultaneous transfer requests using the same idempotency key (advisory lock serialization)
 *   2. Simultaneous stock reductions exceeding available stock (FOR UPDATE row lock serialization)
 *
 * Execution:
 *   DATABASE_URL="postgres://postgres:<password>@<host>:5432/postgres" npx tsx scripts/verifyConcurrencyHarness.ts
 */

import { Client } from 'pg';

async function runConcurrencyHarness() {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  console.log('======================================================================');
  console.log('>>> [CNA Mobile Store] Automated Two-Connection Concurrency Harness');
  console.log('======================================================================');

  if (!dbUrl) {
    console.log('[Concurrency Harness] INFO: No DATABASE_URL or SUPABASE_DB_URL environment variable provided.');
    console.log('[Concurrency Harness] Status: NOT TESTED (Live PostgreSQL runtime not present in container).');
    console.log('[Concurrency Harness] To run against a live database:');
    console.log('  DATABASE_URL="postgres://postgres:<pwd>@<host>:5432/postgres" npx tsx scripts/verifyConcurrencyHarness.ts');
    return;
  }

  const client1 = new Client({ connectionString: dbUrl });
  const client2 = new Client({ connectionString: dbUrl });

  try {
    console.log('[Concurrency Harness] Connecting two independent PostgreSQL clients...');
    await Promise.all([client1.connect(), client2.connect()]);
    console.log('[Concurrency Harness] Both client connections established successfully.');

    // Pre-test discovery: fetch warehouse and variant IDs
    const { rows: whRows } = await client1.query(
      `SELECT id, code FROM public.warehouses WHERE is_active = true ORDER BY is_central DESC LIMIT 2;`
    );
    const { rows: varRows } = await client1.query(
      `SELECT id, sku FROM public.product_variants WHERE is_published = true LIMIT 1;`
    );

    if (whRows.length < 1 || varRows.length < 1) {
      throw new Error('Database is unseeded. Run supabase/seed.sql before executing concurrency harness.');
    }

    const sourceWhId = whRows[0].id;
    const variantId = varRows[0].id;

    // Ensure a second warehouse exists for transfer tests
    let destWhId: string;
    if (whRows.length >= 2) {
      destWhId = whRows[1].id;
    } else {
      const { rows: newWh } = await client1.query(`
        INSERT INTO public.warehouses (code, name_fa, address, is_central, is_active)
        VALUES ('WH-HARNESS-SEC', 'انبار تست همزمانی', 'تهران، انبار مرکزی', false, true)
        ON CONFLICT (code) DO UPDATE SET is_active = true
        RETURNING id;
      `);
      destWhId = newWh[0].id;
    }

    // -------------------------------------------------------------------------
    // TEST 1: Simultaneous Transfer Requests with Same Idempotency Key
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Simultaneous Transfer Requests with Same Idempotency Key ---');
    const transferIdempKey = `HARNESS-RACE-XFER-${Date.now()}`;

    // Ensure source has sufficient stock
    await client1.query(`
      INSERT INTO public.warehouse_stock (warehouse_id, variant_id, shelf_location, quantity_on_hand, reserved_qty, updated_at)
      VALUES ('${sourceWhId}', '${variantId}', 'A-01', 50, 0, NOW())
      ON CONFLICT (warehouse_id, variant_id) DO UPDATE SET quantity_on_hand = GREATEST(warehouse_stock.quantity_on_hand, 50);
    `);

    // Fire two simultaneous transfer calls across two independent connections
    console.log(`[Test 1] Dispatching simultaneous requests across Client 1 and Client 2 (Key: ${transferIdempKey})...`);
    const [res1, res2] = await Promise.all([
      client1.query(`
        SELECT public.rpc_transfer_warehouse_stock(
          p_source_warehouse_id := '${sourceWhId}'::uuid,
          p_destination_warehouse_id := '${destWhId}'::uuid,
          p_variant_id := '${variantId}'::uuid,
          p_quantity := 2,
          p_shelf_location_dest := 'SEC-HARNESS',
          p_notes := 'Client 1 race transfer',
          p_idempotency_key := '${transferIdempKey}'
        ) AS result;
      `),
      client2.query(`
        SELECT public.rpc_transfer_warehouse_stock(
          p_source_warehouse_id := '${sourceWhId}'::uuid,
          p_destination_warehouse_id := '${destWhId}'::uuid,
          p_variant_id := '${variantId}'::uuid,
          p_quantity := 2,
          p_shelf_location_dest := 'SEC-HARNESS',
          p_notes := 'Client 2 race transfer',
          p_idempotency_key := '${transferIdempKey}'
        ) AS result;
      `),
    ]);

    const out1 = res1.rows[0].result;
    const out2 = res2.rows[0].result;

    console.log('[Test 1] Client 1 result status:', out1.status);
    console.log('[Test 1] Client 2 result status:', out2.status);

    const statuses = [out1.status, out2.status].sort();
    if (statuses[0] !== 'idempotent_duplicate' || statuses[1] !== 'transferred') {
      throw new Error(`Test 1 Failed: Expected one 'transferred' and one 'idempotent_duplicate', got: ${JSON.stringify(statuses)}`);
    }

    // Verify movement IDs match
    if (out1.transfer_out_id !== out2.transfer_out_id || out1.transfer_in_id !== out2.transfer_in_id) {
      throw new Error('Test 1 Failed: Transfer IDs differed between concurrent requests!');
    }

    // Verify exactly one pair of ledger movements exists
    const { rows: legRows } = await client1.query(`
      SELECT COUNT(*) AS count
      FROM public.stock_movements
      WHERE idempotency_key IN ('${transferIdempKey}:OUT', '${transferIdempKey}:IN');
    `);

    if (parseInt(legRows[0].count, 10) !== 2) {
      throw new Error(`Test 1 Failed: Expected exactly 2 ledger movements (one OUT, one IN), found ${legRows[0].count}`);
    }
    console.log('✓ [Test 1 Passed] Simultaneous transfers serialized: 1 primary commit, 1 cached duplicate, 0 duplicate ledger legs.');

    // -------------------------------------------------------------------------
    // TEST 2: Simultaneous Stock Reductions Exceeding Available Stock
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Simultaneous Stock Reductions Exceeding Available Stock ---');

    // Force variant stock to exactly 5 units
    await client1.query(`
      UPDATE public.warehouse_stock
      SET quantity_on_hand = 5, reserved_qty = 0
      WHERE warehouse_id = '${sourceWhId}' AND variant_id = '${variantId}';
    `);

    const saleKey1 = `HARNESS-SALE-1-${Date.now()}`;
    const saleKey2 = `HARNESS-SALE-2-${Date.now()}`;

    console.log('[Test 2] Stock set to 5 units. Launching simultaneous reductions of 4 units (-4) each...');
    const results = await Promise.allSettled([
      client1.query(`
        SELECT public.rpc_record_stock_movement(
          p_warehouse_id := '${sourceWhId}'::uuid,
          p_variant_id := '${variantId}'::uuid,
          p_quantity_change := -4,
          p_movement_type := 'order_sale',
          p_shelf_location := 'A-01',
          p_notes := 'Concurrent reduction 1',
          p_idempotency_key := '${saleKey1}'
        ) AS result;
      `),
      client2.query(`
        SELECT public.rpc_record_stock_movement(
          p_warehouse_id := '${sourceWhId}'::uuid,
          p_variant_id := '${variantId}'::uuid,
          p_quantity_change := -4,
          p_movement_type := 'order_sale',
          p_shelf_location := 'A-01',
          p_notes := 'Concurrent reduction 2',
          p_idempotency_key := '${saleKey2}'
        ) AS result;
      `),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    console.log(`[Test 2] Fulfilled calls: ${fulfilled.length}, Rejected calls: ${rejected.length}`);

    if (fulfilled.length !== 1 || rejected.length !== 1) {
      throw new Error(`Test 2 Failed: Expected exactly 1 success and 1 overdraft rejection, got ${fulfilled.length} successes and ${rejected.length} rejections.`);
    }

    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason.message;
    console.log('[Test 2] Rejected call error message:', rejectionReason);

    // Verify stock balance is 5 - 4 = 1, NOT negative
    const { rows: balanceRows } = await client1.query(`
      SELECT quantity_on_hand
      FROM public.warehouse_stock
      WHERE warehouse_id = '${sourceWhId}' AND variant_id = '${variantId}';
    `);

    const finalStock = balanceRows[0].quantity_on_hand;
    console.log('[Test 2] Final warehouse stock on hand:', finalStock);

    if (finalStock !== 1) {
      throw new Error(`Test 2 Failed: Expected final stock to be exactly 1, but found ${finalStock}`);
    }

    // Verify global zero-negative constraint
    const { rows: negRows } = await client1.query(`
      SELECT COUNT(*) AS count FROM public.warehouse_stock WHERE quantity_on_hand < 0;
    `);

    if (parseInt(negRows[0].count, 10) !== 0) {
      throw new Error('Test 2 Failed: Negative stock row detected in warehouse_stock!');
    }

    console.log('✓ [Test 2 Passed] Row-level locking serialized concurrent reductions: 1 succeeded, 1 rejected with overdraft error, 0 negative stock.');

    console.log('\n======================================================================');
    console.log('>>> [Concurrency Harness] ALL REAL TWO-CONNECTION TESTS PASSED! <<<');
    console.log('======================================================================');
  } catch (err) {
    console.error('[Concurrency Harness] ERROR during execution:', err);
    process.exitCode = 1;
  } finally {
    await Promise.allSettled([client1.end(), client2.end()]);
  }
}

runConcurrencyHarness();
