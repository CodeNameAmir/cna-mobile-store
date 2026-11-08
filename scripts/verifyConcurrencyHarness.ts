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
 *   8. Explicit Dual-Assertion Authorization (Manager permitted vs Customer denied, zero side-effects)
 *   9. PostgreSQL Role, JWT Context, and RLS Verification across anon, customer, manager, and service_role
 *
 * Strict Isolation & Safety Rules:
 *   - Zero fixed test-user UUIDs: dynamically generated unique UUIDs per run
 *   - Zero risk of privilege escalation: warehouse_manager role attached ONLY to fresh, newly created test accounts
 *   - Fail-closed identity provisioning: aborts immediately if user provisioning cannot be guaranteed safe
 *   - Strictly isolated test fixtures with run-specific identifiers satisfying database column constraints:
 *     * Warehouses: W_<token>_SRC, W_<token>_DST (code <= 20 chars)
 *     * Product: cna-test-<token>-prod (slug <= 150 chars)
 *     * Variants: CNA-VAR-<token>, CNA-RED-<token>, CNA-AUT-<token> (sku <= 100 chars)
 *   - Zero ON CONFLICT DO UPDATE mutations on existing records
 *   - Structured Fixture Registry tracking every provisioned entity
 *   - Safe cleanup strategy deleting exclusively run-owned identities, while respecting immutable-ledger constraints
 *   - Zero direct mutations on warehouse_stock (all inventory created via authoritative ledger RPCs)
 *   - Production seed data (WH-CENTRAL, 26 products, 46 SKUs, 296 units) remains completely untouched
 *
 * Execution:
 *   DATABASE_URL="postgres://postgres:<password>@<host>:5432/postgres" npx tsx scripts/verifyConcurrencyHarness.ts
 */

import { Client } from 'pg';
import crypto from 'crypto';

interface AuthContext {
  role: 'anon' | 'authenticated' | 'service_role';
  sub?: string;
  email?: string;
}

interface FixtureRegistry {
  runId: string;
  runToken: string;
  warehouses: { id: string; code: string }[];
  products: { id: string; slug: string }[];
  variants: { id: string; sku: string }[];
  users: { id: string; email: string; createdInAuth: boolean }[];
  profiles: { id: string }[];
  userRoles: { userId: string; roleId: string }[];
}

const ALLOWED_DATABASE_ROLES = new Set<string>(['anon', 'authenticated', 'service_role']);

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

/**
 * Safely cleans up harness test fixtures.
 *
 * Cleanup Rules:
 * 1. Only deletes entities explicitly tracked in the fixture registry as created by the current run.
 * 2. Deletes user roles, profiles, and auth.users records in strict reverse foreign-key order.
 * 3. Respects immutable ledger constraints: stock_movements records are protected by database trigger
 *    (trg_prevent_stock_movement_update_delete) and cannot be deleted. Consequently, warehouses and
 *    variants referenced by stock_movements are protected by ON DELETE RESTRICT foreign keys.
 *    These ledger-associated records are safely preserved with their unique run namespace and will
 *    never be reused.
 * 4. Never touches production entities or fixtures created by other runs.
 */
async function cleanupHarnessFixtures(client: Client, registry: FixtureRegistry) {
  console.log(`\n[Cleanup] Starting safe cleanup for Run ID: ${registry.runId}...`);

  // 1. Clean up user role assignments created by this run
  for (const ur of registry.userRoles) {
    try {
      await client.query(
        'DELETE FROM public.auth_user_roles WHERE user_id = $1::uuid AND role_id = $2::uuid;',
        [ur.userId, ur.roleId]
      );
      console.log(`[Cleanup] Deleted test role assignment for user: ${ur.userId}`);
    } catch (err) {
      console.warn(`[Cleanup] Warning: Failed to delete auth_user_role for ${ur.userId}:`, (err as Error).message);
    }
  }

  // 2. Clean up profiles created by this run
  for (const p of registry.profiles) {
    try {
      await client.query('DELETE FROM public.profiles WHERE id = $1::uuid;', [p.id]);
      console.log(`[Cleanup] Deleted test profile: ${p.id}`);
    } catch (err) {
      console.warn(`[Cleanup] Warning: Failed to delete profile ${p.id}:`, (err as Error).message);
    }
  }

  // 3. Clean up auth.users created by this run
  for (const u of registry.users) {
    if (u.createdInAuth) {
      try {
        await client.query('DELETE FROM auth.users WHERE id = $1::uuid;', [u.id]);
        console.log(`[Cleanup] Deleted test auth.users identity: ${u.id}`);
      } catch (err) {
        console.warn(`[Cleanup] Warning: Failed to delete auth.users ${u.id}:`, (err as Error).message);
      }
    }
  }

  // 4. If no ledger movements were recorded for the run's warehouses (e.g. failure prior to Test 1),
  // safe cleanup of catalog and warehouse fixtures is permitted.
  try {
    const whIds = registry.warehouses.map((w) => w.id);
    if (whIds.length > 0) {
      const { rows: movCheck } = await client.query(
        `SELECT COUNT(*) AS count FROM public.stock_movements WHERE warehouse_id = ANY($1::uuid[]);`,
        [whIds]
      );
      const movCount = parseInt(movCheck[0].count, 10);

      if (movCount === 0) {
        // Zero movements recorded: safe to clean up catalog fixtures
        for (const v of registry.variants) {
          await client.query('DELETE FROM public.warehouse_stock WHERE variant_id = $1::uuid;', [v.id]);
          await client.query('DELETE FROM public.product_variants WHERE id = $1::uuid;', [v.id]);
        }
        for (const p of registry.products) {
          await client.query('DELETE FROM public.products WHERE id = $1::uuid;', [p.id]);
        }
        for (const w of registry.warehouses) {
          await client.query('DELETE FROM public.warehouses WHERE id = $1::uuid;', [w.id]);
        }
        console.log('[Cleanup] Unused catalog fixtures safely removed (zero ledger movements existed).');
      } else {
        console.log(
          `[Cleanup] Ledger Notice: ${movCount} immutable stock movements exist for this run. ` +
          `By design (trg_prevent_stock_movement_update_delete & ON DELETE RESTRICT), ` +
          `these records and their parent warehouses/variants are preserved under unique namespace '${registry.runToken}' and will never be reused.`
        );
      }
    }
  } catch (err) {
    console.warn('[Cleanup] Catalog cleanup evaluation notice:', (err as Error).message);
  }

  console.log('[Cleanup] Safe cleanup sequence completed.');
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

  // Generate unique run tokens satisfying database column length limits
  // warehouses.code: VARCHAR(20) -> W_<8 hex>_SRC (14 chars <= 20)
  // products.slug: VARCHAR(150) -> cna-test-<8 hex>-prod (22 chars <= 150)
  // product_variants.sku: VARCHAR(100) -> CNA-VAR-<8 hex> (16 chars <= 100)
  const runToken = crypto.randomBytes(4).toString('hex'); // 8 hex characters
  const runId = `h${Date.now().toString(36)}_${runToken}`;

  const registry: FixtureRegistry = {
    runId,
    runToken,
    warehouses: [],
    products: [],
    variants: [],
    users: [],
    profiles: [],
    userRoles: [],
  };

  try {
    console.log('[Concurrency Harness] Connecting two independent PostgreSQL clients...');
    await Promise.all([client1.connect(), client2.connect()]);
    console.log('[Concurrency Harness] Both client connections established successfully.');

    console.log(`[Concurrency Harness] Initializing isolated test fixtures (Run ID: ${runId}, Token: ${runToken})...`);

    // -------------------------------------------------------------------------
    // STEP 0: Fixture Preparation with Zero Privilege Escalation & Strict Isolation
    // -------------------------------------------------------------------------

    // 0.1 Generate completely unique test-user UUIDs and emails (Issue 1)
    const testManagerId = crypto.randomUUID();
    const testCustomerId = crypto.randomUUID();
    const managerEmail = `test-mgr-${runToken}@concurrency.test`;
    const customerEmail = `test-cust-${runToken}@concurrency.test`;

    const srcWhCode = `W_${runToken}_SRC`;
    const dstWhCode = `W_${runToken}_DST`;
    const testProdSlug = `cna-test-${runToken}-prod`;
    const testVariantSku = `CNA-VAR-${runToken}`;
    const reduceVariantSku = `CNA-RED-${runToken}`;
    const authVariantSku = `CNA-AUT-${runToken}`;

    // Verify identifiers satisfy column limits
    if (srcWhCode.length > 20 || dstWhCode.length > 20) {
      throw new Error(`Generated warehouse code exceeds VARCHAR(20) limit: ${srcWhCode}`);
    }
    if (testProdSlug.length > 150) {
      throw new Error(`Generated product slug exceeds VARCHAR(150) limit: ${testProdSlug}`);
    }
    if (testVariantSku.length > 100 || reduceVariantSku.length > 100 || authVariantSku.length > 100) {
      throw new Error(`Generated variant SKU exceeds VARCHAR(100) limit: ${testVariantSku}`);
    }

    // 0.2 Collision Pre-Check: Verify all generated identifiers are completely unused
    console.log('[Fixture Provisioning] Running collision pre-check on generated identifiers...');
    const collisionChecks = await Promise.all([
      client1.query(`SELECT code FROM public.warehouses WHERE code IN ($1, $2);`, [srcWhCode, dstWhCode]),
      client1.query(`SELECT slug FROM public.products WHERE slug = $1;`, [testProdSlug]),
      client1.query(`SELECT sku FROM public.product_variants WHERE sku IN ($1, $2, $3);`, [
        testVariantSku,
        reduceVariantSku,
        authVariantSku,
      ]),
      client1.query(`SELECT id FROM public.profiles WHERE id IN ($1::uuid, $2::uuid);`, [
        testManagerId,
        testCustomerId,
      ]),
    ]);

    for (const check of collisionChecks) {
      if (check.rows.length > 0) {
        throw new Error(
          `[Fixture Collision] Generated identifier already exists in database! Pre-check failed closed: ${JSON.stringify(
            check.rows
          )}`
        );
      }
    }
    console.log('[Fixture Provisioning] Collision pre-check passed: All identifiers are completely unique.');

    // 0.3 Safe Test Identity Provisioning (Issue 1: Fail Closed)
    // Verify system role 'warehouse_manager' exists before doing anything
    const { rows: roleRows } = await client1.query(
      `SELECT id FROM public.auth_roles WHERE name = 'warehouse_manager';`
    );
    if (!roleRows.length) {
      throw new Error(
        'Precondition Failed: Required system role "warehouse_manager" not found in public.auth_roles. Run migrations first.'
      );
    }
    const warehouseManagerRoleId = roleRows[0].id;

    // Check if auth.users table is present in the database
    const { rows: authTableRows } = await client1.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'auth' AND table_name = 'users'
      ) AS exists;
    `);
    const authUsersTableExists = authTableRows[0].exists;

    // Acquire transaction-scoped advisory lock during user setup to eliminate race conditions between concurrent runs
    await client1.query('BEGIN;');
    try {
      await client1.query(`SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('cna_harness_identity_provisioning'));`);

      if (authUsersTableExists) {
        // Inspect available columns in auth.users to construct a safe, compliant insert
        const { rows: colRows } = await client1.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'auth' AND table_name = 'users';
        `);
        const authCols = new Set(colRows.map((r) => r.column_name));

        const hasInstanceId = authCols.has('instance_id');
        const hasAud = authCols.has('aud');
        const hasRole = authCols.has('role');
        const hasRawAppMeta = authCols.has('raw_app_meta_data');
        const hasRawUserMeta = authCols.has('raw_user_meta_data');

        const insertUserSql = `
          INSERT INTO auth.users (
            id, email
            ${hasInstanceId ? ', instance_id' : ''}
            ${hasAud ? ', aud' : ''}
            ${hasRole ? ', role' : ''}
            ${hasRawAppMeta ? ', raw_app_meta_data' : ''}
            ${hasRawUserMeta ? ', raw_user_meta_data' : ''}
          )
          VALUES (
            $1::uuid, $2
            ${hasInstanceId ? ", '00000000-0000-0000-0000-000000000000'::uuid" : ''}
            ${hasAud ? ", 'authenticated'" : ''}
            ${hasRole ? ", 'authenticated'" : ''}
            ${hasRawAppMeta ? ", '{\"provider\":\"email\",\"providers\":[\"email\"]}'::jsonb" : ''}
            ${hasRawUserMeta ? ", '{}'::jsonb" : ''}
          )
          RETURNING id;
        `;

        await client1.query(insertUserSql, [testManagerId, managerEmail]);
        registry.users.push({ id: testManagerId, email: managerEmail, createdInAuth: true });

        await client1.query(insertUserSql, [testCustomerId, customerEmail]);
        registry.users.push({ id: testCustomerId, email: customerEmail, createdInAuth: true });
      }

      // Insert profiles for both test accounts
      await client1.query(
        `INSERT INTO public.profiles (id, full_name, phone)
         VALUES ($1::uuid, 'Isolated Harness Manager', NULL),
                ($2::uuid, 'Isolated Harness Customer', NULL)
         RETURNING id;`,
        [testManagerId, testCustomerId]
      );
      registry.profiles.push({ id: testManagerId }, { id: testCustomerId });

      // Attach warehouse_manager role ONLY to the newly created manager account
      // Guaranteed safe: identity was positively established and exclusively owned by this run
      await client1.query(
        `INSERT INTO public.auth_user_roles (user_id, role_id)
         VALUES ($1::uuid, $2::uuid)
         RETURNING user_id, role_id;`,
        [testManagerId, warehouseManagerRoleId]
      );
      registry.userRoles.push({ userId: testManagerId, roleId: warehouseManagerRoleId });

      await client1.query('COMMIT;');
    } catch (provisionErr) {
      await client1.query('ROLLBACK;');
      throw new Error(`[Safe Provisioning Failed] Failed to provision isolated test identities: ${(provisionErr as Error).message}`);
    }

    console.log('[Fixture Provisioning] Test identities safely provisioned with zero privilege escalation risk.');

    // 0.4 Provision dedicated isolated test warehouses (Issue 2)
    const { rows: srcWhRows } = await client1.query(
      `INSERT INTO public.warehouses (code, name_fa, address, is_central, is_active)
       VALUES ($1, 'انبار تست همزمانی مبدا', 'تهران، انبار اختصاصی تست ایزوله', false, true)
       RETURNING id, code;`,
      [srcWhCode]
    );
    const srcWhId = srcWhRows[0].id;
    registry.warehouses.push({ id: srcWhId, code: srcWhCode });

    const { rows: dstWhRows } = await client1.query(
      `INSERT INTO public.warehouses (code, name_fa, address, is_central, is_active)
       VALUES ($1, 'انبار تست همزمانی مقصد', 'تبریز، انبار اختصاصی تست ایزوله', false, true)
       RETURNING id, code;`,
      [dstWhCode]
    );
    const dstWhId = dstWhRows[0].id;
    registry.warehouses.push({ id: dstWhId, code: dstWhCode });

    // 0.5 Fetch baseline catalog taxonomy
    const { rows: catRows } = await client1.query(`SELECT id FROM public.categories WHERE is_active = true LIMIT 1;`);
    const { rows: brandRows } = await client1.query(`SELECT id FROM public.brands LIMIT 1;`);
    const { rows: warRows } = await client1.query(`SELECT id FROM public.warranties WHERE is_active = true LIMIT 1;`);

    if (!catRows.length || !brandRows.length || !warRows.length) {
      throw new Error('Database lacks baseline catalog taxonomy (categories/brands/warranties). Run seed.sql first.');
    }

    const catId = catRows[0].id;
    const brandId = brandRows[0].id;
    const warId = warRows[0].id;

    // 0.6 Provision dedicated test product and variants
    const { rows: prodRows } = await client1.query(
      `INSERT INTO public.products (
         slug, category_id, brand_id, title_fa, title_en, model_name,
         description_fa, is_published, is_featured
       )
       VALUES (
         $1, $2::uuid, $3::uuid,
         'محصول تست همزمانی ایزوله', 'CNA Concurrency Test Product Isolated', 'TEST-CONCURRENCY',
         'محصول اختصاصی آزمون‌های همزمانی با شناسه یکتای اجرا', true, false
       )
       RETURNING id, slug;`,
      [testProdSlug, catId, brandId]
    );
    const testProdId = prodRows[0].id;
    registry.products.push({ id: testProdId, slug: testProdSlug });

    // Primary variant for transfers and idempotency
    const { rows: varRows } = await client1.query(
      `INSERT INTO public.product_variants (
         product_id, warranty_id, sku, part_number, color_name_fa, color_name_en, color_hex,
         storage, price_toman, cost_price_toman, is_published
       )
       VALUES (
         $1::uuid, $2::uuid, $3, $4,
         'مشکی تستی', 'Test Black', '#000000',
         '256GB', 15000000, 12000000, true
       )
       RETURNING id, sku;`,
      [testProdId, warId, testVariantSku, `PN-VAR-${runToken}`]
    );
    const testVariantId = varRows[0].id;
    registry.variants.push({ id: testVariantId, sku: testVariantSku });

    // Dedicated variant for concurrent reductions
    const { rows: reduceVarRows } = await client1.query(
      `INSERT INTO public.product_variants (
         product_id, warranty_id, sku, part_number, color_name_fa, color_name_en, color_hex,
         storage, price_toman, cost_price_toman, is_published
       )
       VALUES (
         $1::uuid, $2::uuid, $3, $4,
         'سفید تستی', 'Test White', '#FFFFFF',
         '128GB', 12000000, 10000000, true
       )
       RETURNING id, sku;`,
      [testProdId, warId, reduceVariantSku, `PN-RED-${runToken}`]
    );
    const reduceVariantId = reduceVarRows[0].id;
    registry.variants.push({ id: reduceVariantId, sku: reduceVariantSku });

    // Dedicated variant for explicit authorization test (Issue 3)
    const { rows: authVarRows } = await client1.query(
      `INSERT INTO public.product_variants (
         product_id, warranty_id, sku, part_number, color_name_fa, color_name_en, color_hex,
         storage, price_toman, cost_price_toman, is_published
       )
       VALUES (
         $1::uuid, $2::uuid, $3, $4,
         'خاکستری تستی', 'Test Grey', '#808080',
         '512GB', 18000000, 15000000, true
       )
       RETURNING id, sku;`,
      [testProdId, warId, authVariantSku, `PN-AUT-${runToken}`]
    );
    const authVariantId = authVarRows[0].id;
    registry.variants.push({ id: authVariantId, sku: authVariantSku });

    const managerAuth: AuthContext = {
      role: 'authenticated',
      sub: testManagerId,
      email: managerEmail,
    };

    const customerAuth: AuthContext = {
      role: 'authenticated',
      sub: testCustomerId,
      email: customerEmail,
    };

    console.log('[Concurrency Harness] Genuinely isolated test entities successfully provisioned.');

    // -------------------------------------------------------------------------
    // TEST 1: Concurrent Identical Transfer Requests (Advisory Lock Serialization)
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing Concurrent Identical Transfer Requests ---');
    const transferKey = `XFER-${runToken}`; // Length 13 chars (base <= 96 chars)

    // Initialize inventory strictly through authoritative ledger RPC (zero direct projection mutations)
    await executeTx(client1, managerAuth, async (tx) => {
      await tx.query(`
        SELECT public.rpc_record_stock_movement(
          p_warehouse_id := $1::uuid,
          p_variant_id := $2::uuid,
          p_quantity_change := 20,
          p_movement_type := 'purchase_inflow',
          p_shelf_location := 'A-SRC-01',
          p_notes := 'Initial test opening stock',
          p_idempotency_key := $3
        );
      `, [srcWhId, testVariantId, `SETUP-IN-${runToken}`]);
    });

    console.log(`[Test 1] Dispatching simultaneous transfers across Client 1 and Client 2 (Key: ${transferKey})...`);
    const transferSql = `
      SELECT public.rpc_transfer_warehouse_stock(
        p_source_warehouse_id := $1::uuid,
        p_destination_warehouse_id := $2::uuid,
        p_variant_id := $3::uuid,
        p_quantity := 3,
        p_shelf_location_dest := 'B-DST-01',
        p_notes := 'Concurrent transfer execution',
        p_idempotency_key := $4
      ) AS result;
    `;

    const [res1, res2] = await Promise.all([
      executeTx(client1, managerAuth, (tx) => tx.query(transferSql, [srcWhId, dstWhId, testVariantId, transferKey])),
      executeTx(client2, managerAuth, (tx) => tx.query(transferSql, [srcWhId, dstWhId, testVariantId, transferKey])),
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
      WHERE idempotency_key IN ($1, $2);
    `, [`${transferKey}:OUT`, `${transferKey}:IN`]);

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
            p_source_warehouse_id := $1::uuid,
            p_destination_warehouse_id := $2::uuid,
            p_variant_id := $3::uuid,
            p_quantity := 99, -- Conflicting quantity (original was 3)
            p_shelf_location_dest := 'B-DST-01',
            p_idempotency_key := $4
          );
        `, [srcWhId, dstWhId, testVariantId, transferKey]);
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
          p_warehouse_id := $1::uuid,
          p_variant_id := $2::uuid,
          p_quantity_change := 5,
          p_movement_type := 'purchase_inflow',
          p_shelf_location := 'A-SRC-RED',
          p_notes := 'Setup exactly 5 units for reduction race test',
          p_idempotency_key := $3
        );
      `, [srcWhId, reduceVariantId, `SETUP-RED-${runToken}`]);
    });

    console.log('[Test 3] Available stock is 5 units. Launching simultaneous sales of 4 units (-4) each...');
    const saleKey1 = `SALE-1-${runToken}`;
    const saleKey2 = `SALE-2-${runToken}`;

    const reduceSql = `
      SELECT public.rpc_record_stock_movement(
        p_warehouse_id := $1::uuid,
        p_variant_id := $2::uuid,
        p_quantity_change := -4,
        p_movement_type := 'order_sale',
        p_shelf_location := 'A-SRC-RED',
        p_notes := 'Concurrent reduction execution',
        p_idempotency_key := $3
      ) AS result;
    `;

    const reductionResults = await Promise.allSettled([
      executeTx(client1, managerAuth, (tx) => tx.query(reduceSql, [srcWhId, reduceVariantId, saleKey1])),
      executeTx(client2, managerAuth, (tx) => tx.query(reduceSql, [srcWhId, reduceVariantId, saleKey2])),
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
      WHERE warehouse_id = $1::uuid AND variant_id = $2::uuid;
    `, [srcWhId, reduceVariantId]);
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
            p_warehouse_id := $1::uuid,
            p_variant_id := $2::uuid,
            p_quantity_change := -99999,
            p_movement_type := 'order_sale',
            p_shelf_location := 'A-SRC-RED',
            p_idempotency_key := $3
          );
        `, [srcWhId, reduceVariantId, `MASSIVE-OVERDRAFT-${runToken}`]);
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
    const singleKey = `SINGLE-IDEMP-${runToken}`;
    const singleSql = `
      SELECT public.rpc_record_stock_movement(
        p_warehouse_id := $1::uuid,
        p_variant_id := $2::uuid,
        p_quantity_change := 1,
        p_movement_type := 'purchase_inflow',
        p_shelf_location := 'A-SRC-01',
        p_idempotency_key := $3
      ) AS result;
    `;

    const sRes1 = await executeTx(client1, managerAuth, (tx) => tx.query(singleSql, [srcWhId, testVariantId, singleKey]));
    const sRes2 = await executeTx(client1, managerAuth, (tx) => tx.query(singleSql, [srcWhId, testVariantId, singleKey]));

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
            p_warehouse_id := $1::uuid,
            p_variant_id := $2::uuid,
            p_quantity_change := 1,
            p_movement_type := 'purchase_inflow',
            p_shelf_location := 'CONFLICTING-SHELF-99', -- Conflicting shelf
            p_idempotency_key := $3
          );
        `, [srcWhId, testVariantId, singleKey]);
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
    // TEST 7: Strict Inventory Ledger Reconciliation Invariant (FULL OUTER JOIN)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Testing Strict Inventory Ledger Reconciliation Invariant ---');
    // FULL OUTER JOIN strictly scoped to the current run's dedicated warehouse and variant UUIDs
    const reconciliationQuery = `
      WITH ledger_totals AS (
        SELECT
          warehouse_id,
          variant_id,
          SUM(quantity_change) AS ledger_sum,
          COUNT(*) AS movement_count
        FROM public.stock_movements
        WHERE warehouse_id IN ($1::uuid, $2::uuid)
          AND variant_id = ANY($3::uuid[])
        GROUP BY warehouse_id, variant_id
      ),
      projection AS (
        SELECT
          warehouse_id,
          variant_id,
          quantity_on_hand AS projection_stock
        FROM public.warehouse_stock
        WHERE warehouse_id IN ($1::uuid, $2::uuid)
          AND variant_id = ANY($3::uuid[])
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

    const { rows: reconRows } = await client1.query(reconciliationQuery, [
      srcWhId,
      dstWhId,
      [testVariantId, reduceVariantId],
    ]);

    // Problem 1 Prevention: Assert non-empty result set and strict count
    if (!reconRows || reconRows.length === 0) {
      throw new Error('Test 7 Failed: Ledger reconciliation returned 0 rows! Expected test inventory combinations were not found.');
    }

    const expectedCombinations = [
      { wh: srcWhId, variant: testVariantId, expectedStock: 18, label: 'Source WH + Test Variant (20 inflow - 3 transfer out + 1 single = 18)' },
      { wh: dstWhId, variant: testVariantId, expectedStock: 3, label: 'Destination WH + Test Variant (3 transfer in = 3)' },
      { wh: srcWhId, variant: reduceVariantId, expectedStock: 1, label: 'Source WH + Reduction Variant (5 inflow - 4 sale = 1)' },
    ];

    if (reconRows.length !== expectedCombinations.length) {
      throw new Error(`Test 7 Failed: Expected exactly ${expectedCombinations.length} test inventory combinations, found ${reconRows.length}.`);
    }

    for (const exp of expectedCombinations) {
      const match = reconRows.find(
        (r) => r.warehouse_id === exp.wh && r.variant_id === exp.variant
      );
      if (!match) {
        throw new Error(`Test 7 Failed: Expected combination missing from reconciliation results: ${exp.label} (${exp.wh}, ${exp.variant})`);
      }
      if (match.projection_stock !== exp.expectedStock) {
        throw new Error(`Test 7 Failed: Expected stock ${exp.expectedStock} for ${exp.label}, got projection ${match.projection_stock}`);
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
    // TEST 8: Explicit Dual-Assertion Warehouse Manager & Customer Authorization Suite (Issue 3)
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Testing Explicit Manager-Positive & Customer-Negative Authorization ---');
    const authDeniedKey = `AUTH-DENIED-${runToken}`;
    const authPermittedKey = `AUTH-PERMITTED-${runToken}`;

    // 8.1 Customer Negative Assertion: Unprivileged customer CANNOT execute inventory RPC
    console.log('[Test 8.1] Customer attempting unprivileged inventory RPC...');
    try {
      await executeTx(client1, customerAuth, async (tx) => {
        await tx.query(`
          SELECT public.rpc_record_stock_movement(
            p_warehouse_id := $1::uuid,
            p_variant_id := $2::uuid,
            p_quantity_change := 10,
            p_movement_type := 'purchase_inflow',
            p_shelf_location := 'SEC-AUTH-01',
            p_idempotency_key := $3
          );
        `, [srcWhId, authVariantId, authDeniedKey]);
      });
      throw new Error('Test 8.1 Failed: Unprivileged customer was able to execute inventory RPC!');
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (!msg.includes('دسترسی غیرمجاز') && !msg.includes('42501')) {
        throw new Error(`Test 8.1 Failed: Unexpected error for customer denial: ${msg}`);
      }
      console.log('✓ [Test 8.1 Passed] Customer rejected with SQLSTATE 42501 / ERR_INSUFFICIENT_PRIVILEGE.');
    }

    // 8.2 Verify Zero Side-Effects on Denial: No ledger movement and no projection mutation
    const { rows: deniedLedgerRows } = await client1.query(`
      SELECT COUNT(*) AS count FROM public.stock_movements WHERE idempotency_key = $1;
    `, [authDeniedKey]);
    if (parseInt(deniedLedgerRows[0].count, 10) !== 0) {
      throw new Error('Test 8.2 Failed: Denied customer request created an orphan ledger movement!');
    }

    const { rows: deniedProjectionRows } = await client1.query(`
      SELECT quantity_on_hand FROM public.warehouse_stock
      WHERE warehouse_id = $1::uuid AND variant_id = $2::uuid;
    `, [srcWhId, authVariantId]);
    if (deniedProjectionRows.length > 0 && deniedProjectionRows[0].quantity_on_hand !== 0) {
      throw new Error(`Test 8.2 Failed: Denied customer request altered stock projection: ${deniedProjectionRows[0].quantity_on_hand}`);
    }
    console.log('✓ [Test 8.2 Passed] Zero side-effects verified: Rejected request created 0 ledger rows and 0 stock change.');

    // 8.3 Manager Positive Assertion: Warehouse manager CAN execute inventory RPC
    console.log('[Test 8.3] Authorized warehouse manager executing permitted inventory RPC...');
    const managerAuthRes = await executeTx(client1, managerAuth, async (tx) => {
      const { rows } = await tx.query(`
        SELECT public.rpc_record_stock_movement(
          p_warehouse_id := $1::uuid,
          p_variant_id := $2::uuid,
          p_quantity_change := 10,
          p_movement_type := 'purchase_inflow',
          p_shelf_location := 'SEC-AUTH-01',
          p_idempotency_key := $3
        ) AS result;
      `, [srcWhId, authVariantId, authPermittedKey]);
      return rows[0].result;
    });

    if (managerAuthRes.status !== 'recorded' || !managerAuthRes.movement_id) {
      throw new Error(`Test 8.3 Failed: Manager RPC execution did not return 'recorded': ${JSON.stringify(managerAuthRes)}`);
    }
    console.log('✓ [Test 8.3 Passed] Warehouse manager successfully recorded inventory movement.');

    // 8.4 Reconcile Resulting Inventory Against Ledger for Auth Test Fixture
    const { rows: authReconRows } = await client1.query(`
      WITH ledger AS (
        SELECT SUM(quantity_change) AS sum_qty, COUNT(*) AS count_mov
        FROM public.stock_movements
        WHERE warehouse_id = $1::uuid AND variant_id = $2::uuid
      ),
      stock AS (
        SELECT quantity_on_hand FROM public.warehouse_stock
        WHERE warehouse_id = $1::uuid AND variant_id = $2::uuid
      )
      SELECT stock.quantity_on_hand, ledger.sum_qty, ledger.count_mov
      FROM stock, ledger;
    `, [srcWhId, authVariantId]);

    if (!authReconRows.length || authReconRows[0].quantity_on_hand !== 10 || parseInt(authReconRows[0].sum_qty, 10) !== 10) {
      throw new Error(`Test 8.4 Failed: Auth test fixture ledger reconciliation discrepancy: ${JSON.stringify(authReconRows)}`);
    }
    if (parseInt(authReconRows[0].count_mov, 10) !== 1) {
      throw new Error(`Test 8.4 Failed: Expected exactly 1 movement, got ${authReconRows[0].count_mov}`);
    }
    console.log('✓ [Test 8.4 Passed] Authorization test fixture strictly reconciled against ledger (stock: 10, ledger: 10, movements: 1).');

    // -------------------------------------------------------------------------
    // TEST 9: PostgreSQL Role, JWT Context, and RLS Verification Across Roles
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Testing PostgreSQL Role, JWT Context, and RLS Verification Across Roles ---');

    // Scope Clarification:
    // This test suite verifies PostgreSQL-level authorization:
    // - Column-level grants (cost_price_toman denied for anon)
    // - Table-level grants (warehouse_stock denied for anon)
    // - View security (v_storefront_products granted to anon)
    // - Row-Level Security (RLS) policies filtering warehouse_stock for unprivileged authenticated users
    // - Administrative privileges for service_role
    //
    // Note: Because this test connects directly to PostgreSQL via node-postgres (pg), it tests the database's
    // internal authorization logic under simulated PostgREST GUC context (request.jwt.claims).
    // It does NOT test the HTTP PostgREST API Gateway (header parsing, JWT cryptographic signature validation,
    // or token expiry). PostgREST gateway tests must be run against the HTTP API endpoint.

    // 9.1 anon: Cannot select cost_price_toman
    const anonAuth: AuthContext = { role: 'anon' };
    try {
      await executeTx(client1, anonAuth, async (tx) => {
        await tx.query(`SELECT cost_price_toman FROM public.product_variants LIMIT 1;`);
      });
      throw new Error('Test 9.1 Failed: anon was able to select cost_price_toman!');
    } catch (err: unknown) {
      if (!(err as Error).message.includes('permission denied') && !(err as Error).message.includes('42501')) {
        throw err;
      }
      console.log('✓ [Security: anon] Column cost_price_toman denied with SQLSTATE 42501.');
    }

    // 9.2 anon: Cannot select from warehouse_stock
    try {
      await executeTx(client1, anonAuth, async (tx) => {
        await tx.query(`SELECT * FROM public.warehouse_stock LIMIT 1;`);
      });
      throw new Error('Test 9.2 Failed: anon was able to select warehouse_stock!');
    } catch (err: unknown) {
      if (!(err as Error).message.includes('permission denied') && !(err as Error).message.includes('42501')) {
        throw err;
      }
      console.log('✓ [Security: anon] Table warehouse_stock denied with SQLSTATE 42501.');
    }

    // 9.3 anon: CAN select from v_storefront_products
    await executeTx(client1, anonAuth, async (tx) => {
      const { rows } = await tx.query(`SELECT id, slug, name, price, "stockCount" FROM public.v_storefront_products LIMIT 1;`);
      if (!rows.length) {
        throw new Error('Test 9.3 Failed: anon could not read v_storefront_products');
      }
    });
    console.log('✓ [Security: anon] Public storefront view read granted and functional.');

    // 9.4 authenticated customer: Filtered to 0 rows by RLS on warehouse_stock
    await executeTx(client1, customerAuth, async (tx) => {
      const { rows } = await tx.query(`SELECT COUNT(*) AS count FROM public.warehouse_stock;`);
      if (parseInt(rows[0].count, 10) !== 0) {
        throw new Error(`Test 9.4 Failed: Unprivileged customer saw ${rows[0].count} warehouse_stock rows through RLS!`);
      }
    });
    console.log('✓ [Security: customer] warehouse_stock rows strictly filtered to 0 for unprivileged customer.');

    // 9.5 service_role: Has full administrative permissions
    const serviceAuth: AuthContext = { role: 'service_role' };
    await executeTx(client1, serviceAuth, async (tx) => {
      const { rows } = await tx.query(`SELECT cost_price_toman FROM public.product_variants LIMIT 1;`);
      if (!rows.length) {
        throw new Error('Test 9.5 Failed: service_role could not read product_variants');
      }
    });
    console.log('✓ [Security: service_role] Administrative table and confidential column access verified.');

    console.log('\n======================================================================');
    console.log('>>> [Concurrency Harness] ALL PRE-STAGING SUITES PASSED! <<<');
    console.log('======================================================================');
  } catch (err) {
    console.error('[Concurrency Harness] FATAL ERROR:', err);
    process.exitCode = 1;
  } finally {
    // Execute safe cleanup before disconnecting clients
    try {
      if (client1) {
        await cleanupHarnessFixtures(client1, registry);
      }
    } catch (cleanupErr) {
      console.error('[Concurrency Harness] Cleanup error:', cleanupErr);
    }
    await Promise.allSettled([client1.end(), client2.end()]);
  }
}

runConcurrencyHarness();
