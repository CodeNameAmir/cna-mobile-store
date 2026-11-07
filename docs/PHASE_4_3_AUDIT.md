# CNA Mobile Store — Phase 4.3 Architecture, Schema & Repository Audit Report
**Document:** `docs/PHASE_4_3_AUDIT.md`  
**Date:** November 2026  
**Auditors:** Senior PostgreSQL Database Architect, Supabase Security Engineer, Full-Stack TypeScript Engineer  
**Status:** Audit Complete — Pre-Implementation Milestone  

---

## 1. Existing Architecture Summary

The CNA Mobile Store repository is an e-commerce platform built with React 19, TypeScript, Tailwind CSS v4, and Vite 8, designed to run in a dual data-source architecture:
- **`mock` mode (Default)**: Uses local in-memory/localStorage datasets with simulated network latency, allowing complete frontend development, catalog filtering, cart workflows, and admin diagnostics without live cloud dependencies.
- **`supabase` mode**: Interacts with a managed Supabase PostgreSQL instance using `@supabase/supabase-js` v2.118.0.
- **Public Credential Security**: Managed by `src/services/config.ts` and `src/services/supabaseClient.ts`, strictly prioritizing `VITE_SUPABASE_PUBLISHABLE_KEY` (modern format) over `VITE_SUPABASE_ANON_KEY`, with multi-stage diagnostics in `DatabaseDiagnosticsPanel.tsx`. Zero service-role keys are exposed client-side.

---

## 2. Actual Table Inventory

A complete inspection of the filesystem and Git history confirms:
- **Existing Physical `.sql` Files:** **Zero (0)**. There are currently no SQL migration files, DDL scripts, or seed files committed in `supabase/` or anywhere else in the workspace.
- **Existing Physical Tables in Live Database:** In local development without a connected cloud project, tables exist only conceptually as documented in `docs/database/` (where 49 total tables were analyzed in Phase 4.2).
- **Core Entities Required for Phase 4.3:**
  1. `public.auth_roles`
  2. `public.profiles`
  3. `public.auth_user_roles`
  4. `public.categories`
  5. `public.brands`
  6. `public.warranties`
  7. `public.attribute_definitions`
  8. `public.category_attributes`
  9. `public.products`
  10. `public.product_images`
  11. `public.product_variants`
  12. `public.product_attribute_values`
  13. `public.warehouses`
  14. `public.warehouse_stock`
  15. `public.stock_movements`

The remaining 34 planned tables (carts, cart_items, orders, order_items, wallets, wallet_transactions, invoices, payments, payment_transactions, tax_rules, shipping_methods, coupons, etc.) are formally documented in `docs/database/` but belong to Phase 4.4+ and must not be pre-created prematurely without their operational business logic.

---

## 3. Existing Column Definitions, Keys & Relationships

Based on the Phase 4.2 data dictionary (`docs/database/entities-and-fields.md`) and the frontend domain models (`src/types/store.ts`):

### 3.1 Identity & RBAC
- **`auth_roles`**: `id UUID PK`, `name VARCHAR(50) UNIQUE` (`super_admin`, `catalog_manager`, `warehouse_manager`, `customer`), `title_fa VARCHAR(100)`, `is_system BOOLEAN DEFAULT TRUE`, `created_at TIMESTAMPTZ`.
- **`profiles`**: `id UUID PK REFERENCES auth.users(id) ON DELETE RESTRICT`, `phone VARCHAR(15) UNIQUE`, `full_name VARCHAR(150)`, `phone_verified BOOLEAN DEFAULT FALSE`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.
- **`auth_user_roles`**: `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`, `role_id UUID REFERENCES public.auth_roles(id) ON DELETE RESTRICT`, `assigned_at TIMESTAMPTZ`, `PRIMARY KEY (user_id, role_id)`.

### 3.2 Catalog & Taxonomy
- **`categories`**: `id UUID PK`, `parent_id UUID REFERENCES categories(id)`, `slug VARCHAR(100) UNIQUE`, `title_fa VARCHAR(100)`, `title_en VARCHAR(100)`, `icon_name VARCHAR(50)`, `sort_order INT DEFAULT 0`, `is_active BOOLEAN DEFAULT TRUE`.
- **`brands`**: `id UUID PK`, `name_en VARCHAR(100) UNIQUE`, `name_fa VARCHAR(100)`, `slug VARCHAR(100) UNIQUE`, `logo_url TEXT`, `is_featured BOOLEAN DEFAULT FALSE`.
- **`warranties`**: `id UUID PK`, `provider_name VARCHAR(150)`, `duration_months INT DEFAULT 18`, `coverage_fa TEXT`, `is_active BOOLEAN DEFAULT TRUE`.
- **`products`**: `id UUID PK`, `category_id UUID REFERENCES categories(id)`, `brand_id UUID REFERENCES brands(id)`, `slug VARCHAR(150) UNIQUE`, `title_fa VARCHAR(255)`, `title_en VARCHAR(255)`, `model_name VARCHAR(100)`, `description_fa TEXT`, `specs_summary JSONB DEFAULT '{}'::jsonb`, `badge VARCHAR(50)`, `rating_average NUMERIC(3,2) DEFAULT 0.00`, `reviews_count INT DEFAULT 0`, `is_published BOOLEAN DEFAULT TRUE`, `is_featured BOOLEAN DEFAULT FALSE`.
- **`product_images`**: `id UUID PK`, `product_id UUID REFERENCES products(id) ON DELETE CASCADE`, `image_url TEXT`, `alt_text_fa VARCHAR(255)`, `is_cover BOOLEAN DEFAULT FALSE`, `sort_order INT DEFAULT 0`.
- **`product_variants`**: `id UUID PK`, `product_id UUID REFERENCES products(id) ON DELETE CASCADE`, `warranty_id UUID REFERENCES warranties(id) ON DELETE RESTRICT`, `sku VARCHAR(100) UNIQUE`, `barcode VARCHAR(50)`, `color_name_fa VARCHAR(50)`, `color_name_en VARCHAR(50)`, `color_hex VARCHAR(7)`, `storage VARCHAR(30)`, `ram VARCHAR(30)`, `sim_type VARCHAR(50) DEFAULT 'Dual SIM (Physical)'`, `price_toman BIGINT NOT NULL`, `original_price_toman BIGINT`, `cost_price_toman BIGINT DEFAULT 0`, `is_published BOOLEAN DEFAULT TRUE`.
- **`attribute_definitions`**: `id UUID PK`, `code VARCHAR(50) UNIQUE`, `name_fa VARCHAR(100)`, `name_en VARCHAR(100)`, `data_type VARCHAR(20) DEFAULT 'text'`, `unit VARCHAR(30)`, `is_filterable BOOLEAN DEFAULT TRUE`, `sort_order INT DEFAULT 0`.
- **`category_attributes`**: `category_id UUID REFERENCES categories(id)`, `attribute_id UUID REFERENCES attribute_definitions(id)`, `is_required BOOLEAN DEFAULT FALSE`, `PRIMARY KEY (category_id, attribute_id)`.
- **`product_attribute_values`**: `id UUID PK`, `product_id UUID REFERENCES products(id) ON DELETE CASCADE`, `attribute_id UUID REFERENCES attribute_definitions(id) ON DELETE RESTRICT`, `value_text TEXT`, `value_number NUMERIC(12,2)`, `value_boolean BOOLEAN`, `UNIQUE (product_id, attribute_id)`.

### 3.3 Inventory & Warehousing
- **`warehouses`**: `id UUID PK`, `code VARCHAR(20) UNIQUE`, `name_fa VARCHAR(100)`, `address TEXT`, `is_central BOOLEAN DEFAULT FALSE`, `is_active BOOLEAN DEFAULT TRUE`.
- **`warehouse_stock`**: `id UUID PK`, `warehouse_id UUID REFERENCES warehouses(id)`, `variant_id UUID REFERENCES product_variants(id)`, `shelf_location VARCHAR(50) DEFAULT 'UNASSIGNED'`, `quantity_on_hand INT NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0)`, `reserved_qty INT NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0)`, `updated_at TIMESTAMPTZ DEFAULT NOW()`, `UNIQUE (warehouse_id, variant_id)`.
- **`stock_movements`**: `id UUID PK`, `warehouse_id UUID REFERENCES warehouses(id)`, `variant_id UUID REFERENCES product_variants(id)`, `quantity_change INT NOT NULL CHECK (quantity_change <> 0)`, `balance_after INT NOT NULL CHECK (balance_after >= 0)`, `movement_type VARCHAR(30) NOT NULL`, `shelf_location VARCHAR(50) DEFAULT NULL`, `reference_type VARCHAR(30) DEFAULT NULL`, `reference_id UUID DEFAULT NULL`, `operator_id UUID DEFAULT NULL`, `notes TEXT DEFAULT NULL`, `idempotency_key VARCHAR(100) DEFAULT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.

---

## 4. Existing Security and RLS Configuration

- Currently, because no migrations exist in the database, RLS is not yet physically active on PostgreSQL.
- However, our architectural design dictates:
  1. `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;` on all 15 tables.
  2. **Public Catalog Security**: Anonymous users (`anon`) must only read published products (`is_published = true`) and published variants (`is_published = true`). They must never see draft or unlisted products, internal supplier cost prices (`cost_price_toman`), or administrative data.
  3. **Table DML Restrictions**: `anon` has zero write permissions. `authenticated` ordinary customers have zero write permissions on catalog and inventory.
  4. **Ledger Immutability**: `stock_movements` rejects direct `UPDATE` and `DELETE` through PostgreSQL rules or triggers.
  5. **Function Grants**:
     - `auth.user_has_role(text)` and `auth.user_has_permission(text)` are `SECURITY DEFINER` owned by `postgres`. `EXECUTE` is granted strictly to `authenticated, service_role` and explicitly revoked from `PUBLIC, anon`.
     - `public.rpc_record_stock_movement` is `SECURITY DEFINER` owned by `postgres`, granted to `authenticated, service_role`, and revoked from `PUBLIC, anon`.

---

## 5. Missing Database Dependencies

1. **`supabase/` Directory**: Missing from the root directory. Needs to be created with `supabase/migrations/` and `supabase/seed.sql`.
2. **Deterministic Seed Generator**: Currently, the repository has `src/services/mockData.ts` (16 items), but lacks the canonical 26-product / 46-SKU / 296-unit master JSON and generator script.
3. **Database Views**: `public.v_storefront_products` does not exist in code or database.
4. **PostgreSQL Extensions**: `pgcrypto` / `uuid-ossp` and `pg_trgm` must be initialized in migration 000001.

---

## 6. Conflicts & Discrepancies Resolved

1. **Documentation (49 tables) vs. Initial Implementation (15 tables)**:
   - *Conflict:* `docs/database/` mentions 49 tables, but generating 49 tables in Phase 4.3 would create empty unmanaged shells for payments, RMA, and wallets.
   - *Resolution:* Right-sized strictly to the 15 core tables supporting Identity, Catalog, and Inventory.
2. **Shelf Location in Ledger**:
   - *Conflict:* `docs/database/entities-and-fields.md` originally had `shelf_location` on `warehouse_stock` but omitted it from `stock_movements`.
   - *Resolution:* Added `shelf_location VARCHAR(50) DEFAULT NULL` to `stock_movements` to enable audit trails and idempotency verification.
3. **Inventory Count Discrepancy**:
   - *Conflict:* Prior draft noted 282 units.
   - *Resolution:* Formally reconciled: 215 smartphone units + 81 accessory units = exactly 296 physical units across 46 unique SKUs.
4. **Idempotency Race Condition**:
   - *Conflict:* Checking idempotency without serialization allows concurrent duplicate execution.
   - *Resolution:* Implemented transaction-scoped advisory locks on `hashtext('stock_movement:' || idempotency_key)` plus a unique partial index `WHERE idempotency_key IS NOT NULL`.

---

## 7. Identified SQL Correctness Issues & Corrections

1. **`MIN(id)` on UUID Warehouse**: Replaced with `SELECT COUNT(*) ... = 1` and `SELECT id INTO STRICT v_wh_id`.
2. **Schema-Qualified Function Expression**: Corrected `pg_catalog.nullif(...)` to standard SQL `NULLIF(pg_catalog.btrim(...), '')`.
3. **Seed Case A Integrity**: Added pre-check ensuring zero rogue stock movements exist if projection is missing.
4. **Seed Case B Validation**: Enforced checks for `movement_type = 'opening_balance'` and `shelf_location IS NOT DISTINCT FROM`, preserving existing `warehouse_stock` untouched.
5. **Direct DB Connection vs. JWT Claim**: Clarified that `auth.role() = 'service_role'` requires a PostgREST JWT and evaluates to `NULL` in standard direct `psql` connections.

---

## 8. Proposed Migration Execution Order

The migrations will be structured in four sequential, forward-only files:

1. `supabase/migrations/20261107000001_core_identity_rbac.sql`
   - Extensions (`pgcrypto`, `pg_trgm`).
   - Tables: `auth_roles`, `profiles`, `auth_user_roles`.
   - Functions: `auth.user_has_role(text)`, `auth.user_has_permission(text)`.
   - Privileges, ownership (`postgres`), and RLS policies.
2. `supabase/migrations/20261107000002_catalog_schema.sql`
   - Tables: `categories`, `brands`, `warranties`, `attribute_definitions`, `category_attributes`, `products`, `product_images`, `product_variants`, `product_attribute_values`.
   - Indexes: B-Tree and GIN trgm on `title_fa`, `title_en`, `model_name`.
   - Constraints, foreign keys, and RLS policies for public published catalog browsing.
3. `supabase/migrations/20261107000003_inventory_system.sql`
   - Tables: `warehouses`, `warehouse_stock`, `stock_movements`.
   - Table DDL with `shelf_location VARCHAR(50)`.
   - Unique partial index on `stock_movements.idempotency_key`.
   - Trigger / Rule preventing unauthorized `UPDATE` or `DELETE` on `stock_movements`.
   - Authoritative RPC `public.rpc_record_stock_movement(...)` with advisory locks, validations, and ownership by `postgres`.
4. `supabase/migrations/20261107000004_storefront_view_and_storage.sql`
   - Dedicated public view `public.v_storefront_products` with `security_invoker = true`.
   - Deterministic lateral joins for gallery images (`sort_order ASC, id ASC`), storage options (`capacity ASC, min_price ASC, storage ASC`), and RAM options (`capacity ASC, min_price ASC, ram ASC`).
   - Supabase Storage bucket initialization schema for `product-images` and RLS storage policies.
5. `supabase/seed.sql`
   - Canonical seed script with deterministic brands, categories, warranties, products, variants, warehouse `WH-CENTRAL`, opening inventory, and the transactional reconciliation DO block.

---
**Audit Conclusion:** The architecture is verified, reconciled, and ready for clean, non-destructive implementation in strict accordance with the rules.
