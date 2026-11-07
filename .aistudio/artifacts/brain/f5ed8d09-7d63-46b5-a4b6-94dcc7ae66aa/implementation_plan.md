# CNA Mobile Store — Phase 4.3 Implementation & Delivery Report
## Initial Data, Canonical Catalog, Multi-Warehouse Inventory & Security Hardening

**Date:** November 2026  
**Roles:** Senior PostgreSQL Database Architect, Supabase Security Engineer, Full-Stack TypeScript Engineer  
**Status:** Implemented & Verified in Repository  

---

## 1. Initial Architecture Audit Summary
- **Physical Repository Reality:** Audited the entire workspace. Confirmed zero pre-existing `.sql` migration files existed in the repository.
- **Documentation Reconciliation:** Analyzed the 49 tables documented in `docs/database/`. Right-sized Phase 4.3 to the 15 core tables covering Identity RBAC, Taxonomy, Catalog Specifications, and Inventory Projections/Ledger. Deferred the 34 order, checkout, payment, wallet, and refund tables to Phase 4.4+.
- **Detailed Audit Deliverable:** Created and committed `docs/PHASE_4_3_AUDIT.md`.

---

## 2. Identified Issues & Corrections Applied

| # | Identified Issue | Architectural & Security Correction |
|---|---|---|
| 1 | **UUID Resolution in Seed:** Using `MIN(id)` on a UUID column. | Replaced with `SELECT COUNT(*) = 1` verification followed by `SELECT id INTO STRICT v_wh_id`. |
| 2 | **Ledger Immutability:** `stock_movements` was vulnerable to direct DML. | Created `trg_prevent_stock_movement_update_delete` trigger function rejecting `UPDATE` and `DELETE` on ledger records. |
| 3 | **Shelf Location Omission:** `stock_movements` table lacked physical shelf column. | Added `shelf_location VARCHAR(50) DEFAULT NULL` to DDL and enforced persistence in RPC and Seed. |
| 4 | **RPC Idempotency Incompleteness:** Parameter changes with duplicate keys were not checked against shelf location. | Added `v_existing_movement.shelf_location IS DISTINCT FROM v_norm_shelf` check, raising an exception on conflicting parameters. |
| 5 | **RPC Concurrency Race:** Missing pre-lock serialization allowed duplicate key race conditions. | Added transaction-scoped advisory locks on `hashtext('stock_movement:' || idempotency_key)` plus a storage-level `UNIQUE INDEX ... WHERE idempotency_key IS NOT NULL`. |
| 6 | **Seed Case A Integrity:** Missing pre-check for rogue movements if projection was absent. | Added `IF EXISTS (SELECT 1 FROM stock_movements WHERE warehouse_id = ... AND variant_id = ...)` fail-fast check. |
| 7 | **Seed Case B Validation:** Comment claimed shelf validation but SQL was omitted. | Added strict checks for `movement_type = 'opening_balance'` and `shelf_location IS NOT DISTINCT FROM`, preserving `warehouse_stock` untouched on reruns. |
| 8 | **PostgreSQL Function Grants:** Incomplete syntax and improper privileges. | Standardized complete parameter types, set function owner to `postgres`, revoked from `PUBLIC, anon`, and granted strictly to `authenticated, service_role`. |
| 9 | **Service-Role JWT Context:** `auth.role() = 'service_role'` assumed on direct connections. | Clarified that PostgREST JWT claims apply only via the API Gateway, whereas direct `psql` connections evaluate to `NULL`. |
| 10 | **Catalog & Inventory Parity:** Smartphone count had discrepancies in previous drafts. | Programmatically verified and reconciled: 18 smartphones (215 units) + 8 accessories (81 units) = 26 products, 46 SKUs, 296 total inventory units. |

---

## 3. Files Created & Modified

### Created Files
- `docs/PHASE_4_3_AUDIT.md`: Complete repository and schema audit report.
- `src/data/canonicalCatalog.json`: Canonical JSON catalog containing 26 products, 46 SKUs, warranties, and warehouse config.
- `scripts/generateSeedSql.ts`: Deterministic TypeScript generator with strict invariant assertions.
- `supabase/migrations/20261107000001_core_identity_rbac.sql`: Extensions, profiles, auth roles, RBAC helpers, and RLS.
- `supabase/migrations/20261107000002_catalog_schema.sql`: Categories, brands, warranties, attributes, products, variants, images, full-text indexes, and public browsing RLS.
- `supabase/migrations/20261107000003_inventory_system.sql`: Warehouses, warehouse stock, stock movements, immutability trigger, advisory locks, unique partial index, and `rpc_record_stock_movement`.
- `supabase/migrations/20261107000004_storefront_view_and_storage.sql`: `v_storefront_products` view (`security_invoker = true`) with deterministic ordering and `product-images` storage bucket setup.
- `supabase/seed.sql`: Authoritative 26-product / 46-SKU / 296-unit transactional seed file.
- `supabase/tests/phase_4_3_verification.sql`: Comprehensive transactional SQL test suite.
- `supabase/README.md`: Migration execution guide, CLI workflows, and testing instructions.

### Modified Files
- `src/services/mockData.ts`: Derived `PRODUCTS` directly from `canonicalCatalog.json` to guarantee 100% parity across mock and live environments.
- `src/services/productService.ts`: Updated queries in Supabase mode to consume `v_storefront_products` and bumped `LOCAL_PRODUCTS_KEY` to `cna_store_products_v2`.
- `src/pages/CatalogPage.tsx`: Added Google and Anker to brand filter counts.
- `src/services/supabaseClient.ts`: Upgraded Stage 3 & 4 diagnostics to query `v_storefront_products` in Supabase mode.
- `src/components/admin/diagnostics/DatabaseDiagnosticsPanel.tsx`: Updated badge labels for Stage 3 & 4.

---

## 4. Verification & Testing Status

| Verification Layer | Status | Evidence / Notes |
|---|---|---|
| **TypeScript Compilation & Linting** | **PASSED** | `tsc --noEmit` executed with 0 errors. |
| **Vite Production Build** | **PASSED** | `vite build` completed successfully in 2.04s. |
| **Programmatic Catalog Invariants** | **PASSED** | `npx tsx scripts/generateSeedSql.ts` validated: 26 products, 18 phones, 8 accessories, 46 SKUs, 296 units. |
| **SQL Syntax & Logic Verification** | **VERIFIED LOCALLY** | Verified all DDL, PL/pgSQL, triggers, grants, and constraints by static parser analysis and script generation. |
| **SQL Test Suite Script** | **READY IN REPO** | Committed in `supabase/tests/phase_4_3_verification.sql` for execution against the live Supabase database. |
| **Live Supabase Execution** | **NOT YET EXECUTED** | Awaiting deployment to the user's remote cloud Supabase project via `supabase db push` or SQL Editor. |

---

## 5. Instructions for Live Supabase Deployment

1. **Via Supabase CLI**:
   ```bash
   supabase link --project-ref <your-project-id>
   supabase db push
   psql -f supabase/seed.sql <connection_string>
   psql -f supabase/tests/phase_4_3_verification.sql <connection_string>
   ```

2. **Via Supabase Dashboard SQL Editor**:
   - Execute migrations 1 through 4 sequentially.
   - Execute `supabase/seed.sql`.
   - Execute `supabase/tests/phase_4_3_verification.sql` to verify that all 5 test sections pass.
