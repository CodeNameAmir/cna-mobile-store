/**
 * CNA Mobile Store - Deterministic Seed SQL Generator
 * Reads canonicalCatalog.json, validates catalog and inventory invariants programmatically,
 * and outputs supabase/seed.sql with complete transactional fail-fast safety.
 */

import * as fs from 'fs';
import * as path from 'path';

interface Variant {
  sku: string;
  colorNameFa: string;
  colorNameEn: string;
  colorHex: string;
  storage: string;
  ram?: string;
  priceToman: number;
  originalPriceToman?: number;
  shelfLocation: string;
  initialStock: number;
}

interface Product {
  id: string;
  slug: string;
  brandSlug: string;
  categorySlug: string;
  titleFa: string;
  titleEn: string;
  modelName: string;
  badge?: string;
  ratingAverage: number;
  reviewsCount: number;
  isPublished: boolean;
  isFeatured: boolean;
  warrantyIndex: number;
  descriptionFa: string;
  specs: Record<string, unknown>;
  images: string[];
  variants: Variant[];
}

interface CanonicalCatalog {
  version: string;
  warehouse: {
    code: string;
    nameFa: string;
    address: string;
    postalCode: string;
    phone: string;
    managerName: string;
    isCentral: boolean;
    isActive: boolean;
  };
  brands: Array<{ slug: string; nameEn: string; nameFa: string; isFeatured: boolean }>;
  categories: Array<{ slug: string; titleFa: string; titleEn: string; iconName: string; sortOrder: number }>;
  warranties: Array<{ providerName: string; durationMonths: number; coverageFa: string }>;
  products: Product[];
}

function escapeSql(str: string | undefined | null): string {
  if (str === undefined || str === null) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

export function generateSeedSql(): { sql: string; stats: Record<string, number> } {
  const catalogPath = path.resolve(process.cwd(), 'src/data/canonicalCatalog.json');
  const raw = fs.readFileSync(catalogPath, 'utf-8');
  const catalog: CanonicalCatalog = JSON.parse(raw);

  // Invariant Validations
  const totalProducts = catalog.products.length;
  const phoneProducts = catalog.products.filter((p) => p.categorySlug === 'phones').length;
  const accessoryProducts = totalProducts - phoneProducts;

  const allVariants = catalog.products.flatMap((p) => p.variants);
  const totalSkus = allVariants.length;
  const uniqueSkus = new Set(allVariants.map((v) => v.sku));

  let totalStock = 0;
  let phoneStock = 0;
  let accStock = 0;

  for (const p of catalog.products) {
    for (const v of p.variants) {
      totalStock += v.initialStock;
      if (p.categorySlug === 'phones') {
        phoneStock += v.initialStock;
      } else {
        accStock += v.initialStock;
      }
    }
  }

  // Strict Invariant Assertions
  if (totalProducts !== 26) {
    throw new Error(`Catalog invariant failed: expected 26 products, found ${totalProducts}`);
  }
  if (phoneProducts !== 18) {
    throw new Error(`Catalog invariant failed: expected 18 smartphones, found ${phoneProducts}`);
  }
  if (accessoryProducts !== 8) {
    throw new Error(`Catalog invariant failed: expected 8 accessories, found ${accessoryProducts}`);
  }
  if (totalSkus !== 46 || uniqueSkus.size !== 46) {
    throw new Error(`Catalog invariant failed: expected 46 unique SKUs, found ${totalSkus} (unique: ${uniqueSkus.size})`);
  }
  if (totalStock !== 296 || phoneStock !== 215 || accStock !== 81) {
    throw new Error(`Inventory invariant failed: expected 296 total (215 phones + 81 accessories), found ${totalStock} (${phoneStock} + ${accStock})`);
  }

  const lines: string[] = [];

  lines.push('-- ==============================================================================');
  lines.push('-- CNA Mobile Store — Authoritative Canonical Seed Dataset');
  lines.push('-- Auto-generated from src/data/canonicalCatalog.json');
  lines.push('-- Invariants: 26 Products, 46 SKUs, 296 Initial Units (215 Phones + 81 Accessories)');
  lines.push('-- Currency: Strictly Integer Toman (BIGINT)');
  lines.push('-- ==============================================================================');
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  // 1. Central Warehouse
  lines.push('-- 1. Central Logistics Warehouse');
  lines.push(`INSERT INTO public.warehouses (code, name_fa, address, postal_code, phone, manager_name, is_central, is_active)`);
  lines.push(`VALUES (${escapeSql(catalog.warehouse.code)}, ${escapeSql(catalog.warehouse.nameFa)}, ${escapeSql(catalog.warehouse.address)}, ${escapeSql(catalog.warehouse.postalCode)}, ${escapeSql(catalog.warehouse.phone)}, ${escapeSql(catalog.warehouse.managerName)}, ${catalog.warehouse.isCentral}, ${catalog.warehouse.isActive})`);
  lines.push(`ON CONFLICT (code) DO UPDATE SET`);
  lines.push(`  name_fa = EXCLUDED.name_fa,`);
  lines.push(`  address = EXCLUDED.address,`);
  lines.push(`  phone = EXCLUDED.phone,`);
  lines.push(`  manager_name = EXCLUDED.manager_name;`);
  lines.push('');

  // 2. Brands
  lines.push('-- 2. Brands');
  for (const b of catalog.brands) {
    lines.push(`INSERT INTO public.brands (slug, name_en, name_fa, is_featured)`);
    lines.push(`VALUES (${escapeSql(b.slug)}, ${escapeSql(b.nameEn)}, ${escapeSql(b.nameFa)}, ${b.isFeatured})`);
    lines.push(`ON CONFLICT (slug) DO UPDATE SET name_fa = EXCLUDED.name_fa, is_featured = EXCLUDED.is_featured;`);
  }
  lines.push('');

  // 3. Categories
  lines.push('-- 3. Categories');
  for (const c of catalog.categories) {
    lines.push(`INSERT INTO public.categories (slug, title_fa, title_en, icon_name, sort_order, is_active)`);
    lines.push(`VALUES (${escapeSql(c.slug)}, ${escapeSql(c.titleFa)}, ${escapeSql(c.titleEn)}, ${escapeSql(c.iconName)}, ${c.sortOrder}, true)`);
    lines.push(`ON CONFLICT (slug) DO UPDATE SET title_fa = EXCLUDED.title_fa, sort_order = EXCLUDED.sort_order;`);
  }
  lines.push('');

  // 4. Warranties
  lines.push('-- 4. Warranties');
  lines.push(`CREATE TEMP TABLE temp_warranties_seed (
    idx INT PRIMARY KEY,
    provider_name VARCHAR(150),
    duration_months INT,
    coverage_fa TEXT
  ) ON COMMIT DROP;`);

  catalog.warranties.forEach((w, idx) => {
    lines.push(`INSERT INTO temp_warranties_seed VALUES (${idx}, ${escapeSql(w.providerName)}, ${w.durationMonths}, ${escapeSql(w.coverageFa)});`);
  });

  lines.push(`INSERT INTO public.warranties (provider_name, duration_months, coverage_fa, is_active)
SELECT provider_name, duration_months, coverage_fa, true
FROM temp_warranties_seed
ON CONFLICT (provider_name) DO UPDATE SET duration_months = EXCLUDED.duration_months;`);
  lines.push('');

  // 5. Products & Product Variants & Images
  lines.push('-- 5. Products, Variants, and Images');
  for (const p of catalog.products) {
    lines.push(`-- Product: ${p.slug}`);
    lines.push(`DO $$
DECLARE
  v_prod_id UUID;
  v_cat_id UUID;
  v_brand_id UUID;
  v_war_id UUID;
BEGIN
  SELECT id INTO STRICT v_cat_id FROM public.categories WHERE slug = ${escapeSql(p.categorySlug)};
  SELECT id INTO STRICT v_brand_id FROM public.brands WHERE slug = ${escapeSql(p.brandSlug)};
  SELECT id INTO STRICT v_war_id FROM public.warranties WHERE provider_name = ${escapeSql(catalog.warranties[p.warrantyIndex].providerName)};

  INSERT INTO public.products (
    slug, category_id, brand_id, title_fa, title_en, model_name,
    description_fa, badge, rating_average, reviews_count, is_published, is_featured, specs_summary
  )
  VALUES (
    ${escapeSql(p.slug)}, v_cat_id, v_brand_id, ${escapeSql(p.titleFa)}, ${escapeSql(p.titleEn)}, ${escapeSql(p.modelName)},
    ${escapeSql(p.descriptionFa)}, ${escapeSql(p.badge)}, ${p.ratingAverage}, ${p.reviewsCount}, ${p.isPublished}, ${p.isFeatured},
    ${escapeSql(JSON.stringify(p.specs))}::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_fa = EXCLUDED.title_fa,
    title_en = EXCLUDED.title_en,
    specs_summary = EXCLUDED.specs_summary,
    badge = EXCLUDED.badge
  RETURNING id INTO v_prod_id;

  -- Images
  DELETE FROM public.product_images WHERE product_id = v_prod_id;
`);

    p.images.forEach((imgUrl, imgIdx) => {
      lines.push(`  INSERT INTO public.product_images (product_id, image_url, is_cover, sort_order)
  VALUES (v_prod_id, ${escapeSql(imgUrl)}, ${imgIdx === 0}, ${imgIdx});`);
    });

    lines.push('');
    lines.push('  -- Variants');
    for (const v of p.variants) {
      lines.push(`  INSERT INTO public.product_variants (
    product_id, warranty_id, sku, color_name_fa, color_name_en, color_hex,
    storage, ram, price_toman, original_price_toman, cost_price_toman, is_published
  )
  VALUES (
    v_prod_id, v_war_id, ${escapeSql(v.sku)}, ${escapeSql(v.colorNameFa)}, ${escapeSql(v.colorNameEn)}, ${escapeSql(v.colorHex)},
    ${escapeSql(v.storage)}, ${escapeSql(v.ram || null)}, ${v.priceToman}, ${v.originalPriceToman || 'NULL'},
    ${Math.round(v.priceToman * 0.85)}, true
  )
  ON CONFLICT (sku) DO UPDATE SET
    price_toman = EXCLUDED.price_toman,
    original_price_toman = EXCLUDED.original_price_toman;`);
    }

    lines.push('END $$;');
    lines.push('');
  }

  // 6. Authoritative Fail-Fast Opening Stock Reconciliation DO Block
  lines.push('-- ==============================================================================');
  lines.push('-- 6. Authoritative Transactional Opening Stock Reconciliation DO Block');
  lines.push('-- ==============================================================================');
  lines.push(`DO $$
DECLARE
  v_wh_id UUID;
  v_wh_count INT;
  v_expected_sku_count INT := 46;
  v_matched_sku_count INT;
  v_existing_ws public.warehouse_stock%ROWTYPE;
  v_existing_sm public.stock_movements%ROWTYPE;
  v_global_sm public.stock_movements%ROWTYPE;
  v_idemp_key TEXT;
  v_ledger_sum INT;
  v_cur RECORD;
BEGIN
  -- 1. Validate Warehouse Resolution: Verify exactly one WH-CENTRAL warehouse exists
  SELECT COUNT(*) INTO v_wh_count
  FROM public.warehouses
  WHERE code = 'WH-CENTRAL';

  IF v_wh_count <> 1 THEN
    RAISE EXCEPTION 'خطای اعتبارسنجی انبار داده‌های اولیه: انبار با کد WH-CENTRAL دقیقاً یک رکورد نیست (تعداد: %).', v_wh_count;
  END IF;

  -- Retrieve warehouse ID strictly without aggregate functions on UUID
  SELECT id INTO STRICT v_wh_id
  FROM public.warehouses
  WHERE code = 'WH-CENTRAL';

  -- 2. Canonical In-Memory Seed Source
  CREATE TEMP TABLE temp_opening_seed (
    sku VARCHAR(100) PRIMARY KEY,
    initial_stock INT NOT NULL CHECK (initial_stock > 0),
    shelf_location VARCHAR(50) NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO temp_opening_seed (sku, initial_stock, shelf_location) VALUES
`);

  const seedValues = allVariants.map((v) => `    ('${v.sku}', ${v.initialStock}, '${v.shelfLocation}')`).join(',\n');
  lines.push(seedValues + ';');
  lines.push('');

  lines.push(`  -- 3. Verify All Expected SKUs Exist in product_variants
  SELECT COUNT(*) INTO v_matched_sku_count
  FROM temp_opening_seed s
  JOIN public.product_variants pv ON s.sku = pv.sku;

  IF v_matched_sku_count <> v_expected_sku_count THEN
    RAISE EXCEPTION 'خطای انطباق کاتالوگ: از % تنوع مورد انتظار، فقط % تنوع در جدول product_variants یافت شد.',
      v_expected_sku_count, v_matched_sku_count;
  END IF;

  -- 4. Safe Fail-Fast Processing & Full Ledger Reconciliation for Every SKU
  FOR v_cur IN 
    SELECT s.sku, s.initial_stock, s.shelf_location, pv.id AS variant_id 
    FROM temp_opening_seed s 
    JOIN public.product_variants pv ON s.sku = pv.sku 
  LOOP
    v_idemp_key := 'OPENING-WH-CENTRAL-' || v_cur.sku;

    -- Global Idempotency Key Validation: Ensure key is not registered under a different warehouse or variant
    SELECT * INTO v_global_sm
    FROM public.stock_movements
    WHERE idempotency_key = v_idemp_key;

    IF FOUND AND (v_global_sm.warehouse_id <> v_wh_id OR v_global_sm.variant_id <> v_cur.variant_id) THEN
      RAISE EXCEPTION 'تداخل جهانی کلید افتتاحیه: کلید % برای انبار یا تنوع دیگری ثبت شده است.', v_idemp_key;
    END IF;

    -- Fetch current projection state
    SELECT * INTO v_existing_ws
    FROM public.warehouse_stock
    WHERE warehouse_id = v_wh_id AND variant_id = v_cur.variant_id;

    -- Fetch current opening ledger state
    SELECT * INTO v_existing_sm
    FROM public.stock_movements
    WHERE warehouse_id = v_wh_id AND variant_id = v_cur.variant_id AND idempotency_key = v_idemp_key;

    IF v_existing_ws.variant_id IS NULL AND v_existing_sm.id IS NULL THEN
      -- Case A Integrity Pre-check: Ensure NO rogue stock movements exist for this variant/warehouse
      IF EXISTS (
        SELECT 1 FROM public.stock_movements
        WHERE warehouse_id = v_wh_id AND variant_id = v_cur.variant_id
      ) THEN
        RAISE EXCEPTION 'فساد داده‌ای در بذردهی انبار: برای تنوع % هیچ پروجکشن یا سند افتتاحیه یافت نشد، اما اسناد گردش انبار متفرقه‌ای از قبل ثبت شده است.',
          v_cur.sku;
      END IF;

      -- Case A: Neither exists -> Atomically create both projection and opening ledger
      INSERT INTO public.warehouse_stock (
        warehouse_id,
        variant_id,
        shelf_location,
        quantity_on_hand,
        reserved_qty,
        updated_at
      )
      VALUES (
        v_wh_id,
        v_cur.variant_id,
        v_cur.shelf_location,
        v_cur.initial_stock,
        0,
        NOW()
      );

      INSERT INTO public.stock_movements (
        warehouse_id,
        variant_id,
        quantity_change,
        balance_after,
        movement_type,
        shelf_location,
        notes,
        idempotency_key,
        created_at
      )
      VALUES (
        v_wh_id,
        v_cur.variant_id,
        v_cur.initial_stock,
        v_cur.initial_stock,
        'opening_balance',
        v_cur.shelf_location,
        'Initial opening inventory seed',
        v_idemp_key,
        NOW()
      );

    ELSIF v_existing_ws.variant_id IS NOT NULL AND v_existing_sm.id IS NOT NULL THEN
      -- Case B: Both exist -> Validate opening movement_type, quantity, shelf_location, and balance_after
      IF v_existing_sm.movement_type <> 'opening_balance' THEN
        RAISE EXCEPTION 'ناسازگاری نوع سند افتتاحیه تنوع %: نوع سند ثبت‌شده قبلی (%) برابر با opening_balance نیست.',
          v_cur.sku, v_existing_sm.movement_type;
      END IF;

      IF v_existing_sm.quantity_change <> v_cur.initial_stock THEN
        RAISE EXCEPTION 'ناسازگاری داده سند افتتاحیه تنوع %: مقدار سند قبلی (%) با مقدار اولیه (%) همخوانی ندارد.',
          v_cur.sku, v_existing_sm.quantity_change, v_cur.initial_stock;
      END IF;

      IF v_existing_sm.shelf_location IS DISTINCT FROM v_cur.shelf_location THEN
        RAISE EXCEPTION 'ناسازگاری موقعیت قفسه سند افتتاحیه تنوع %: قفسه ثبت‌شده (%) با مقدار اولیه (%) همخوانی ندارد.',
          v_cur.sku, v_existing_sm.shelf_location, v_cur.shelf_location;
      END IF;

      IF v_existing_sm.balance_after <> v_cur.initial_stock THEN
        RAISE EXCEPTION 'ناسازگاری موجودی پس از سند افتتاحیه تنوع %: تراز ثبت‌شده (%) با مقدار اولیه (%) همخوانی ندارد.',
          v_cur.sku, v_existing_sm.balance_after, v_cur.initial_stock;
      END IF;

      -- Validate full ledger sum against current projection
      SELECT COALESCE(SUM(quantity_change), 0) INTO v_ledger_sum
      FROM public.stock_movements
      WHERE warehouse_id = v_wh_id AND variant_id = v_cur.variant_id;

      IF v_existing_ws.quantity_on_hand <> v_ledger_sum THEN
        RAISE EXCEPTION 'ناسازگاری دفتر کل و پروجکشن تنوع %: موجودی جاری (%) با مجموع اسناد دفتر کل (%) مغایرت دارد.',
          v_cur.sku, v_existing_ws.quantity_on_hand, v_ledger_sum;
      END IF;

      -- State is verified consistent: preserve existing warehouse_stock shelf location and stock untouched!

    ELSIF v_existing_ws.variant_id IS NOT NULL AND v_existing_sm.id IS NULL THEN
      -- Case C: Inconsistent state (Projection exists without opening ledger entry)
      RAISE EXCEPTION 'خطای بحرانی ساختار انبار: برای تنوع % پروجکشن موجودی (%) وجود دارد اما سند افتتاحیه مفقود است.',
        v_cur.sku, v_existing_ws.quantity_on_hand;

    ELSE
      -- Case D: Inconsistent state (Ledger exists without projection)
      RAISE EXCEPTION 'خطای بحرانی ساختار انبار: برای تنوع % سند افتتاحیه (%) ثبت شده اما ردیف پروجکشن انبار مفقود است.',
        v_cur.sku, v_existing_sm.quantity_change;
    END IF;
  END LOOP;
END $$;
`);

  lines.push('');
  lines.push('COMMIT;');
  lines.push('');

  return {
    sql: lines.join('\n'),
    stats: {
      totalProducts,
      phoneProducts,
      accessoryProducts,
      totalSkus,
      totalStock,
      phoneStock,
      accStock,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { sql, stats } = generateSeedSql();
  const outDir = path.resolve(process.cwd(), 'supabase');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outFile = path.join(outDir, 'seed.sql');
  fs.writeFileSync(outFile, sql, 'utf-8');
  console.log(`[Seed Generator] Generated ${outFile}`);
  console.log(`[Seed Generator] Invariants verified:`, stats);
}
