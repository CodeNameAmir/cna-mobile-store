/**
 * CNA Mobile Store — Automated Two-Connection Concurrency & Database Security Harness
 * 
 * Verifies real multi-client database behaviors across two independent PostgreSQL connections:
 *   1. Concurrent identical transfer requests (advisory lock serialization)
 *   2. Conflicting transfer retries (5-parameter conflict validation)
 *   3. Concurrent stock reductions (FOR UPDATE row lock serialization)
 *   4. Insufficient stock overdraft rejection (ERRCODE 23514)
 *   5. Single-movement idempotency (cached duplicate recognition)
 *   6. Shelf-location conflict rejection (ERRCODE 23505)
 *   7. Full inventory ledger reconciliation (quantity_on_hand = SUM(quantity_change) via FULL OUTER JOIN)
 *   8. PostgreSQL Role, JWT Context, and RLS Verification across anon, customer, manager, and service_role
 *
 * Rules:
 *   - Strictly isolated to dedicated test entities:
 *     * Warehouses: WH-TEST-CONCURRENCY-SRC, WH-TEST-CONCURRENCY-DST
 *     * Product: cna-test-concurrency-prod
 *     * Variant: CNA-TEST-CONCURRENCY
 *   - Zero direct mutations on warehouse_stock (all inventory created via authoritative ledger RPCs)
 *   - Production seed data (WH-CENTRAL, 26 products, 46 SKUs, 296 units) remains completely untouched
 *
 * Execution:
 *   DATABASE_URL="postgres://postgres:<password>@<host>:5432/postgres" npx tsx scripts/verifyConcurrencyHarness.ts
 */

import { Client } from 'pg';

interface AuthContext {
  role: 'anon' | 'authenticated' | 'service_role';
  sub?: string;
  email?: string;
}

const ALLOWED_DATABASE_ROLES = new Set<string>(['anon', 'authenticated', 'service_role']);

const TEST_MANAGER_ID = '00000000-0000-0000-0000-0000000000aa';
const TEST_CUSTOMER_ID = '00000000-0000-0000-0000-0000000000bb';

/**
 * Executes a callback within a transaction initialized with simulated PostgREST JWT context.
 *
 * Architectural Note on Session Setup:
 * 1. SET LOCAL ROLE <role>:
 *    PostgreSQL does not support parameterizing the target role in `SET ROLE $1`.
 *    Therefore, we strictly validate the role against `ALLOWED_DATABASE_ROLES` before interpolation.
 *    Setting the role establishes table-level (GRANT/REVOKE) privileges, column-level privileges,
 *    and default RLS evaluation context.
 *
 * 2. Parameterized set_config('request.jwt.claims', $1, true):
 *    PostgREST injects caller claims into session GUCs within each request transaction.
 *    Using PostgreSQL's built-in `set_config(name, value, is_local = true)` with parameterized bindings
 *    completely prevents SQL injection, escaping defects, and raw string concatenation while scoping
 *    the configuration strictly to the current transaction.
 *
 * 3. Safe Rollback:
 *    If an error occurs in the query block, `ROLLBACK;` is attempted safely, and the original error
 *    is re-thrown without being masked by any rollback failure.
 */
async function executeTx<T>(
  client: Client,
  authCtx: AuthContext,
  queryBlock: (txClient: Client) => Promise<T>
): Promise<T> {
  if (!ALLOWED_DATABASE_ROLES.has(authCtx.role)) {
    throw new Error(
      `[executeTx] Invalid or unapproved database role: '${authCtx.role}'. Must be one of: ${Array.from(ALLOWED_DATABASE_ROLES).join(', ')}`
    );
  }

  await client.query('BEGIN;');
  try {
    // 1. Set transaction-local PostgreSQL role (validated via allowlist)
    await client.query(`SET LOCAL ROLE ${authCtx.role};`);

    // 2. Safely inject simulated PostgREST JWT claims via parameterized set_config
    const jwtClaims = JSON.stringify({
      role: authCtx.role,
      sub: authCtx.sub || null,
      email: authCtx.email || null,
    });
    await client.query(`SELECT pg_catalog.set_config('request.jwt.claims', $1, true);`, [jwtClaims]);
    await client.query(`SELECT pg_catalog.set_config('request.jwt.claim.role', $1, true);`, [authCtx.role]);
    if (authCtx.sub) {
      await client.query(`SELECT pg_catalog.set_config('request.jwt.claim.sub', $1, true);`, [authCtx.sub]);
    }
    if (authCtx.email) {
      await client.query(`SELECT pg_catalog.set_config('request.jwt.claim.email', $1, true);`, [authCtx.email]);
    }

    const result = await queryBlock(client);
    await client.query('COMMIT;');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK;');
    } catch (rollbackErr) {
      console.error('[executeTx] Safe rollback failed:', rollbackErr);
    }
    throw err;
  }
}

async function runConcurrencyHarness() {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  console.log('======================================================================');
  console.log('>>> [CNA Mobile Store] Pre-Staging Concurrency & Database Security Harness');
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

    const runId = Date.now().toString(36);
    console.log(`[Concurrency Harness] Initializing isolated test fixtures (Run ID: ${runId})...`);

    // -------------------------------------------------------------------------
    // STEP 0: Fixture Preparation (Isolated Test Warehouses & Variants)
    // -------------------------------------------------------------------------
    // 0.1 Setup test users and roles
    await client1.query(`
      -- Ensure warehouse_manager role exists
      INSERT INTO public.auth_roles (name, title_fa, description, is_system)
      VALUES ('warehouse_manager', 'مدیر انبار و لجستیک', 'مدیریت گردش انبار', true)
      ON CONFLICT (name) DO NOTHING;

      -- Create mock users in auth.users if available, and link in public.profiles
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
          INSERT INTO auth.users (id, email)
          VALUES ('${TEST_MANAGER_ID}', 'concurrency-manager@cna.local'),
                 ('${TEST_CUSTOMER_ID}', 'concurrency-customer@cna.local')
          ON CONFLICT (id) DO NOTHING;
        END IF;
      END $$;

      INSERT INTO public.profiles (id, full_name, phone)
      VALUES ('${TEST_MANAGER_ID}', 'Concurrency Test Manager', '09129990001'),
             ('${TEST_CUSTOMER_ID}', 'Concurrency Test Customer', '09129990002')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.auth_user_roles (user_id, role_id)
      VALUES ('${TEST_MANAGER_ID}', (SELECT id FROM public.auth_roles WHERE name = 'warehouse_manager'))
      ON CONFLICT (user_id, role_id) DO NOTHING;
    `);

    // 0.2 Provision dedicated isolated test warehouses
    const { rows: srcWhRows } = await client1.query(`
      INSERT INTO public.warehouses (code, name_fa, address, is_central, is_active)
      VALUES ('WH-TEST-CONCURRENCY-SRC', 'انبار تست همزمانی مبدا', 'تهران، انبار اختصاصی تست', false, true)
      ON CONFLICT (code) DO UPDATE SET is_active = true
      RETURNING id;
    `);
    const srcWhId = srcWhRows[0].id;

    const { rows: dstWhRows } = await client1.query(`
      INSERT INTO public.warehouses (code, name_fa, address, is_central, is_active)
      VALUES ('WH-TEST-CONCURRENCY-DST', 'انبار تست همزمانی مقصد', 'تبریز، انبار اختصاصی تست', false, true)
      ON CONFLICT (code) DO UPDATE SET is_active = true
      RETURNING id;
    `);
    const dstWhId = dstWhRows[0].id;

    // 0.3 Provision dedicated test category, brand, product & variants
    const { rows: catRows } = await client1.query(`
      SELECT id FROM public.categories WHERE is_active = true LIMIT 1;
    `);
    const { rows: brandRows } = await client1.query(`
      SELECT id FROM public.brands LIMIT 1;
    `);
    const { rows: warRows } = await client1.query(`
      SELECT id FROM public.warranties WHERE is_active = true LIMIT 1;
    `);

    if (!catRows.length || !brandRows.length || !warRows.length) {
      throw new Error('Database lacks baseline catalog taxonomy (categories/brands/warranties). Run seed.sql first.');
    }

    const catId = catRows[0].id;
    const brandId = brandRows[0].id;
    const warId = warRows[0].id;

    const { rows: prodRows } = await client1.query(`
      INSERT INTO public.products (
        slug, category_id, brand_id, title_fa, title_en, model_name,
        description_fa, is_published, is_featured
      )
      VALUES (
        'cna-test-concurrency-prod', '${catId}', '${brandId}',
        'محصول تست همزمانی', 'CNA Concurrency Test Product', 'TEST-CONCURRENCY',
        'محصول اختصاصی جهت آزمون‌های همزمانی و مسابقه تراکنش‌ها', true, false
      )
      ON CONFLICT (slug) DO UPDATE SET is_published = true
      RETURNING id;
    `);
    const testProdId = prodRows[0].id;

    // Dedicated variant for transfers and general idempotency
    const { rows: varRows } = await client1.query(`
      INSERT INTO public.product_variants (
        product_id, warranty_id, sku, part_number, color_name_fa, color_name_en, color_hex,
        storage, price_toman, cost_price_toman, is_published
      )
      VALUES (
        '${testProdId}', '${warId}', 'CNA-TEST-CONCURRENCY', 'PN-CONCURRENCY',
        'مشکی تستی', 'Test Black', '#000000',
        '256GB', 15000000, 12000000, true
      )
      ON CONFLICT (sku) DO UPDATE SET is_published = true
      RETURNING id;
    `);
    const testVariantId = varRows[0].id;

    // Dedicated variant for concurrent reductions
    const reduceSku = `CNA-TEST-CONCURRENCY-RED-${runId}`;
    const { rows: reduceVarRows } = await client1.query(`
      INSERT INTO public.product_variants (
        product_id, warranty_id, sku, part_number, color_name_fa, color_name_en, color_hex,
        storage, price_toman, cost_price_toman, is_published
      )
      VALUES (
        '${testProdId}', '${warId}', '${reduceSku}', 'PN-CONCURRENCY-RED',
        'سفید تستی', 'Test White', '#FFFFFF',
        '128GB', 12000000, 10000000, true
      )
      ON CONFLICT (sku) DO UPDATE SET is_published = true
      RETURNING id;
    `);
    const reduceVariantId = reduceVarRows[0].id;

    const managerAuth: AuthContext = {
      role: 'authenticated',
      sub: TEST_MANAGER_ID,
      email: 'concurrency-manager@cna.local',
    };

    console.log('[Concurrency Harness] Isolated test entities successfully provisioned.');

    // -------------------------------------------------------------------------
    // TEST 1: Concurrent Identical Transfer Requests (Advisory Lock Serialization)
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing Concurrent Identical Transfer Requests ---');
    const transferKey = `HARNESS-XFER-${runId}`;

    // Initialize inventory strictly through authoritative ledger RPC (zero direct projection mutations)
    await executeTx(client1, managerAuth, async (tx) => {
      await tx.query(`
        SELECT public.rpc_record_stock_movement(
          p_warehouse_id := '${srcWhId}'::uuid,
          p_variant_id := '${testVariantId}'::uuid,
          p_quantity_change := 20,
          p_movement_type := 'purchase_inflow',
          p_shelf_location := 'A-SRC-01',
          p_notes := 'Initial test opening stock',
          p_idempotency_key := 'HARNESS-SETUP-INFLOW-${runId}'
        );
      `);
    });

    console.log(`[Test 1] Dispatching simultaneous transfers across Client 1 and Client 2 (Key: ${transferKey})...`);
    const transferSql = `
      SELECT public.rpc_transfer_warehouse_stock(
        p_source_warehouse_id := '${srcWhId}'::uuid,
        p_destination_warehouse_id := '${dstWhId}'::uuid,
        p_variant_id := '${testVariantId}'::uuid,
        p_quantity := 3,
        p_shelf_location_dest := 'B-DST-01',
        p_notes := 'Concurrent transfer execution',
        p_idempotency_key := '${transferKey}'
      ) AS result;
    `;

    const [res1, res2] = await Promise.all([
      executeTx(client1, managerAuth, (tx) => tx.query(transferSql)),
      executeTx(client2, managerAuth, (tx) => tx.query(transferSql)),
    ]);

    const out1 = res1.rows[0].result;
    const out2 = res2.rows[0].result;

    console.log('[Test 1] Client 1 result status:', out1.status);
    console.log('[Test 1] Client 2 result status:', out2.status);

    const xferStatuses = [out1.status, out2.status].sort();
    if (xferStatuses[0] !== 'idempotent_duplicate' || xferStatuses[1] !== 'transferred') {
      throw new Error(`Test 1 Failed: Expected one 'transferred' and one 'idempotent_duplicate', got: ${JSON.stringify(xferStatuses)}`);
    }

    if (out1.transfer_out_id !== out2.transfer_out_id || out1.transfer_in_id !== out2.transfer_in_id) {
      throw new Error('Test 1 Failed: Transfer movement IDs differed between concurrent requests!');
    }

    const { rows: xferLegs } = await client1.query(`
      SELECT COUNT(*) AS count
      FROM public.stock_movements
      WHERE idempotency_key IN ('${transferKey}:OUT', '${transferKey}:IN');
    `);

    if (parseInt(xferLegs[0].count, 10) !== 2) {
      throw new Error(`Test 1 Failed: Expected exactly 2 ledger movements (one OUT, one IN), found ${xferLegs[0].count}`);
    }
    console.log('✓ [Test 1 Passed] Simultaneous transfers serialized: 1 primary commit, 1 cached duplicate, exactly 2 ledger legs.');

    // -------------------------------------------------------------------------
    // TEST 2: Conflicting Transfer Retries (5-Parameter Conflict Validation)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Conflicting Transfer Retries ---');
    try {
      await executeTx(client1, managerAuth, async (tx) => {
        await tx.query(`
          SELECT public.rpc_transfer_warehouse_stock(
            p_source_warehouse_id := '${srcWhId}'::uuid,
            p_destination_warehouse_id := '${dstWhId}'::uuid,
            p_variant_id := '${testVariantId}'::uuid,
            p_quantity := 99, -- Conflicting quantity (original was 3)
            p_shelf_location_dest := 'B-DST-01',
            p_idempotency_key := '${transferKey}'
          );
        `);
      });
      throw new Error('Test 2 Failed: Conflicting retry was not rejected!');
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (!msg.includes('ERR_IDEMPOTENCY_CONFLICT') && !msg.includes('23505')) {
        throw new Error(`Test 2 Failed: Unexpected exception message: ${msg}`);
      }
      console.log('✓ [Test 2 Passed] Conflicting transfer retry rejected with ERR_IDEMPOTENCY_CONFLICT (SQLSTATE 23505).');
    }

    // -------------------------------------------------------------------------
    // TEST 3: Concurrent Stock Reductions (FOR UPDATE Row Lock Serialization)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing Concurrent Stock Reductions (Race Overdraft Prevention) ---');
    // Initialize exactly 5 units on hand via authorized ledger RPC
    await executeTx(client1, managerAuth, async (tx) => {
      await tx.query(`
        SELECT public.rpc_record_stock_movement(
          p_warehouse_id := '${srcWhId}'::uuid,
          p_variant_id := '${reduceVariantId}'::uuid,
          p_quantity_change := 5,
          p_movement_type := 'purchase_inflow',
          p_shelf_location := 'A-SRC-RED',
          p_notes := 'Setup exactly 5 units for reduction race test',
          p_idempotency_key := 'HARNESS-SETUP-RED-${runId}'
        );
      `);
    });

    console.log('[Test 3] Available stock is 5 units. Launching simultaneous sales of 4 units (-4) each...');
    const saleKey1 = `HARNESS-SALE-1-${runId}`;
    const saleKey2 = `HARNESS-SALE-2-${runId}`;

    const reduceSql = (key: string) => `
      SELECT public.rpc_record_stock_movement(
        p_warehouse_id := '${srcWhId}'::uuid,
        p_variant_id := '${reduceVariantId}'::uuid,
        p_quantity_change := -4,
        p_movement_type := 'order_sale',
        p_shelf_location := 'A-SRC-RED',
        p_notes := 'Concurrent reduction execution',
        p_idempotency_key := '${key}'
      ) AS result;
    `;

    const reductionResults = await Promise.allSettled([
      executeTx(client1, managerAuth, (tx) => tx.query(reduceSql(saleKey1))),
      executeTx(client2, managerAuth, (tx) => tx.query(reduceSql(saleKey2))),
    ]);

    const fulfilled = reductionResults.filter((r) => r.status === 'fulfilled');
    const rejected = reductionResults.filter((r) => r.status === 'rejected');

    if (fulfilled.length !== 1 || rejected.length !== 1) {
      throw new Error(`Test 3 Failed: Expected exactly 1 success and 1 overdraft rejection, got ${fulfilled.length} successes and ${rejected.length} rejections.`);
    }

    const rejectionMsg = (rejected[0] as PromiseRejectedResult).reason.message;
    if (!rejectionMsg.includes('ERR_INSUFFICIENT_STOCK') && !rejectionMsg.includes('23514')) {
      throw new Error(`Test 3 Failed: Overdraft rejection error did not match expected 23514 / ERR_INSUFFICIENT_STOCK: ${rejectionMsg}`);
    }

    const { rows: redBalRows } = await client1.query(`
      SELECT quantity_on_hand
      FROM public.warehouse_stock
      WHERE warehouse_id = '${srcWhId}' AND variant_id = '${reduceVariantId}';
    `);
    const remainingStock = redBalRows[0].quantity_on_hand;

    if (remainingStock !== 1) {
      throw new Error(`Test 3 Failed: Expected remaining stock to be 1 (5 - 4), but found ${remainingStock}`);
    }
    console.log('✓ [Test 3 Passed] Row-level locking serialized concurrent reductions: 1 committed, 1 rejected with overdraft error, balance = 1.');

    // -------------------------------------------------------------------------
    // TEST 4: Insufficient Stock Overdraft Rejection
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Insufficient Stock Overdraft Rejection ---');
    try {
      await executeTx(client1, managerAuth, async (tx) => {
        await tx.query(`
          SELECT public.rpc_record_stock_movement(
            p_warehouse_id := '${srcWhId}'::uuid,
            p_variant_id := '${reduceVariantId}'::uuid,
            p_quantity_change := -99999,
            p_movement_type := 'order_sale',
            p_shelf_location := 'A-SRC-RED',
            p_idempotency_key := 'HARNESS-MASSIVE-OVERDRAFT-${runId}'
          );
        `);
      });
      throw new Error('Test 4 Failed: Massive overdraft was permitted!');
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (!msg.includes('ERR_INSUFFICIENT_STOCK') && !msg.includes('23514')) {
        throw new Error(`Test 4 Failed: Expected 23514 / ERR_INSUFFICIENT_STOCK, got: ${msg}`);
      }
      console.log('✓ [Test 4 Passed] Insufficient stock decrement rejected with ERRCODE 23514.');
    }

    // -------------------------------------------------------------------------
    // TEST 5: Single-Movement Idempotency
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing Single-Movement Idempotency ---');
    const singleKey = `HARNESS-SINGLE-IDEMP-${runId}`;
    const singleSql = `
      SELECT public.rpc_record_stock_movement(
        p_warehouse_id := '${srcWhId}'::uuid,
        p_variant_id := '${testVariantId}'::uuid,
        p_quantity_change := 1,
        p_movement_type := 'purchase_inflow',
        p_shelf_location := 'A-SRC-01',
        p_idempotency_key := '${singleKey}'
      ) AS result;
    `;

    const sRes1 = await executeTx(client1, managerAuth, (tx) => tx.query(singleSql));
    const sRes2 = await executeTx(client1, managerAuth, (tx) => tx.query(singleSql));

    if (sRes1.rows[0].result.status !== 'recorded' || sRes2.rows[0].result.status !== 'idempotent_duplicate') {
      throw new Error(`Test 5 Failed: Expected 'recorded' then 'idempotent_duplicate', got: ${sRes1.rows[0].result.status}, ${sRes2.rows[0].result.status}`);
    }
    console.log('✓ [Test 5 Passed] Single-movement repeat returned cached idempotent_duplicate.');

    // -------------------------------------------------------------------------
    // TEST 6: Shelf-Location Conflict Rejection
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Testing Shelf-Location Conflict Rejection ---');
    try {
      await executeTx(client1, managerAuth, async (tx) => {
        await tx.query(`
          SELECT public.rpc_record_stock_movement(
            p_warehouse_id := '${srcWhId}'::uuid,
            p_variant_id := '${testVariantId}'::uuid,
            p_quantity_change := 1,
            p_movement_type := 'purchase_inflow',
            p_shelf_location := 'CONFLICTING-SHELF-99', -- Conflicting shelf
            p_idempotency_key := '${singleKey}'
          );
        `);
      });
      throw new Error('Test 6 Failed: Conflicting shelf location was not rejected!');
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (!msg.includes('تداخل کلید ضدتکرار') && !msg.includes('23505')) {
        throw new Error(`Test 6 Failed: Expected 23505 conflict, got: ${msg}`);
      }
      console.log('✓ [Test 6 Passed] Reused key with conflicting shelf location rejected with SQLSTATE 23505.');
    }

    // -------------------------------------------------------------------------
    // TEST 7: Inventory Ledger Reconciliation Invariant (FULL OUTER JOIN)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Testing Inventory Ledger Reconciliation Invariant ---');
    // Using FULL OUTER JOIN between warehouse_stock projection and stock_movements ledger totals.
    // Parameterized with dedicated test warehouse UUIDs to ensure complete isolation.
    const reconciliationQuery = `
      WITH ledger_totals AS (
        SELECT
          warehouse_id,
          variant_id,
          SUM(quantity_change) AS ledger_sum,
          COUNT(*) AS movement_count
        FROM public.stock_movements
        WHERE warehouse_id IN ($1::uuid, $2::uuid)
        GROUP BY warehouse_id, variant_id
      ),
      projection AS (
        SELECT
          warehouse_id,
          variant_id,
          quantity_on_hand AS projection_stock
        FROM public.warehouse_stock
        WHERE warehouse_id IN ($1::uuid, $2::uuid)
      )
      SELECT
        COALESCE(p.warehouse_id, l.warehouse_id) AS warehouse_id,
        COALESCE(p.variant_id, l.variant_id) AS variant_id,
        p.projection_stock,
        COALESCE(l.ledger_sum, 0) AS ledger_sum,
        COALESCE(l.movement_count, 0) AS movement_count,
        (p.warehouse_id IS NOT NULL AND l.warehouse_id IS NOT NULL AND p.projection_stock = COALESCE(l.ledger_sum, 0)) AS is_reconciled
      FROM projection p
      FULL OUTER JOIN ledger_totals l
        ON p.warehouse_id = l.warehouse_id AND p.variant_id = l.variant_id;
    `;

    const { rows: reconRows } = await client1.query(reconciliationQuery, [srcWhId, dstWhId]);

    // Problem 1 Prevention: Assert non-empty result set and presence of all expected combinations
    if (!reconRows || reconRows.length === 0) {
      throw new Error('Test 7 Failed: Ledger reconciliation returned 0 rows! Expected test inventory combinations were not found.');
    }

    if (reconRows.length < 3) {
      throw new Error(`Test 7 Failed: Expected at least 3 test inventory combinations in reconciliation, found only ${reconRows.length}.`);
    }

    const expectedCombinations = [
      { wh: srcWhId, variant: testVariantId, label: 'Source WH + Test Variant (after inflow & transfer out)' },
      { wh: dstWhId, variant: testVariantId, label: 'Destination WH + Test Variant (after transfer in)' },
      { wh: srcWhId, variant: reduceVariantId, label: 'Source WH + Reduction Variant (after inflow & sale reduction)' },
    ];

    for (const exp of expectedCombinations) {
      const match = reconRows.find(
        (r) => r.warehouse_id === exp.wh && r.variant_id === exp.variant
      );
      if (!match) {
        throw new Error(`Test 7 Failed: Expected test combination missing from reconciliation results: ${exp.label} (${exp.wh}, ${exp.variant})`);
      }
    }

    // Problem 2 Prevention: Detect orphan projection or orphan ledger rows and verify reconciliation
    for (const r of reconRows) {
      if (r.projection_stock === null || r.projection_stock === undefined) {
        throw new Error(
          `Test 7 Failed: Orphan ledger movement detected without corresponding warehouse_stock row! Warehouse: ${r.warehouse_id}, Variant: ${r.variant_id}, Ledger Sum: ${r.ledger_sum}`
        );
      }
      if (r.movement_count === 0 || r.movement_count === '0') {
        throw new Error(
          `Test 7 Failed: Orphan warehouse_stock projection row detected without any ledger movements! Warehouse: ${r.warehouse_id}, Variant: ${r.variant_id}, Stock: ${r.projection_stock}`
        );
      }
      if (!r.is_reconciled) {
        throw new Error(
          `Test 7 Failed: Ledger discrepancy detected! Warehouse: ${r.warehouse_id}, Variant: ${r.variant_id}, Projection: ${r.projection_stock}, Ledger: ${r.ledger_sum}, Movements: ${r.movement_count}`
        );
      }
    }
    console.log(`✓ [Test 7 Passed] Ledger invariant strictly reconciled: FULL OUTER JOIN confirmed projection === ledger sum across ${reconRows.length} test inventory combinations.`);

    // -------------------------------------------------------------------------
    // TEST 8: Database Authorization, Simulated JWT Context & RLS Verification Across Roles
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Testing PostgreSQL Role, JWT Context, and RLS Verification Across Roles ---');

    // Scope Clarification:
    // This test suite verifies PostgreSQL-level authorization:
    // - Column-level grants (cost_price_toman denied for anon)
    // - Table-level grants (warehouse_stock denied for anon)
    // - View security (v_storefront_products granted to anon)
    // - Row-Level Security (RLS) policies filtering warehouse_stock for unprivileged authenticated users
    // - RPC execution authorization (rpc_record_stock_movement denied for customer, permitted for warehouse_manager)
    //
    // Note: Because this test connects directly to PostgreSQL via node-postgres (pg), it tests the database's
    // internal authorization logic under simulated PostgREST GUC context (request.jwt.claims).
    // It does NOT test the HTTP PostgREST API Gateway (header parsing, JWT cryptographic signature validation,
    // or token expiry). PostgREST gateway tests must be run against the HTTP API endpoint.

    // 8.1 anon: Cannot select cost_price_toman
    const anonAuth: AuthContext = { role: 'anon' };
    try {
      await executeTx(client1, anonAuth, async (tx) => {
        await tx.query(`SELECT cost_price_toman FROM public.product_variants LIMIT 1;`);
      });
      throw new Error('Test 8.1 Failed: anon was able to select cost_price_toman!');
    } catch (err: unknown) {
      if (!(err as Error).message.includes('permission denied') && !(err as Error).message.includes('42501')) {
        throw err;
      }
      console.log('✓ [Security: anon] Column cost_price_toman denied with SQLSTATE 42501.');
    }

    // 8.2 anon: Cannot select from warehouse_stock
    try {
      await executeTx(client1, anonAuth, async (tx) => {
        await tx.query(`SELECT * FROM public.warehouse_stock LIMIT 1;`);
      });
      throw new Error('Test 8.2 Failed: anon was able to select warehouse_stock!');
    } catch (err: unknown) {
      if (!(err as Error).message.includes('permission denied') && !(err as Error).message.includes('42501')) {
        throw err;
      }
      console.log('✓ [Security: anon] Table warehouse_stock denied with SQLSTATE 42501.');
    }

    // 8.3 anon: CAN select from v_storefront_products
    await executeTx(client1, anonAuth, async (tx) => {
      const { rows } = await tx.query(`SELECT id, slug, name, price, "stockCount" FROM public.v_storefront_products LIMIT 1;`);
      if (!rows.length) {
        throw new Error('Test 8.3 Failed: anon could not read v_storefront_products');
      }
    });
    console.log('✓ [Security: anon] Public storefront view read granted and functional.');

    // 8.4 authenticated customer: Filtered to 0 rows by RLS on warehouse_stock
    const customerAuth: AuthContext = {
      role: 'authenticated',
      sub: TEST_CUSTOMER_ID,
      email: 'concurrency-customer@cna.local',
    };

    await executeTx(client1, customerAuth, async (tx) => {
      const { rows } = await tx.query(`SELECT COUNT(*) AS count FROM public.warehouse_stock;`);
      if (parseInt(rows[0].count, 10) !== 0) {
        throw new Error(`Test 8.4 Failed: Unprivileged customer saw ${rows[0].count} warehouse_stock rows through RLS!`);
      }
    });
    console.log('✓ [Security: customer] warehouse_stock rows strictly filtered to 0 for unprivileged customer.');

    // 8.5 authenticated customer: Cannot execute inventory RPC
    try {
      await executeTx(client1, customerAuth, async (tx) => {
        await tx.query(`
          SELECT public.rpc_record_stock_movement(
            p_warehouse_id := '${srcWhId}'::uuid,
            p_variant_id := '${testVariantId}'::uuid,
            p_quantity_change := 1,
            p_movement_type := 'purchase_inflow'
          );
        `);
      });
      throw new Error('Test 8.5 Failed: Unprivileged customer was able to execute inventory RPC!');
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (!msg.includes('دسترسی غیرمجاز') && !msg.includes('42501')) {
        throw err;
      }
      console.log('✓ [Security: customer] Inventory mutation denied for unprivileged customer.');
    }

    // 8.6 service_role: Has full administrative permissions
    const serviceAuth: AuthContext = { role: 'service_role' };
    await executeTx(client1, serviceAuth, async (tx) => {
      const { rows } = await tx.query(`SELECT cost_price_toman FROM public.product_variants LIMIT 1;`);
      if (!rows.length) {
        throw new Error('Test 8.6 Failed: service_role could not read product_variants');
      }
    });
    console.log('✓ [Security: service_role] Administrative table and confidential column access verified.');

    console.log('\n======================================================================');
    console.log('>>> [Concurrency Harness] ALL 8 PRE-STAGING SUITES PASSED! <<<');
    console.log('======================================================================');
  } catch (err) {
    console.error('[Concurrency Harness] FATAL ERROR:', err);
    process.exitCode = 1;
  } finally {
    await Promise.allSettled([client1.end(), client2.end()]);
  }
}

runConcurrencyHarness();
