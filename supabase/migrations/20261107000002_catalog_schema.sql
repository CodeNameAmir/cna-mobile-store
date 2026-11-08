-- ==============================================================================
-- Migration: 20261107000002_catalog_schema.sql
-- Domain: Categories, Brands, Warranties, Catalog Products, Variants & Specs
-- ==============================================================================

-- 1. Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT,
  slug VARCHAR(100) NOT NULL UNIQUE,
  title_fa VARCHAR(100) NOT NULL,
  title_en VARCHAR(100) NOT NULL,
  description_fa TEXT,
  icon_name VARCHAR(50) NOT NULL DEFAULT 'Folder',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Brands
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en VARCHAR(100) NOT NULL UNIQUE,
  name_fa VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  logo_url TEXT,
  website_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Warranties (Dynamic Provider & Duration)
CREATE TABLE IF NOT EXISTS public.warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name VARCHAR(150) NOT NULL UNIQUE,
  duration_months INT NOT NULL DEFAULT 18,
  coverage_fa TEXT NOT NULL,
  terms_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 4. Attribute Definitions
CREATE TABLE IF NOT EXISTS public.attribute_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name_fa VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  data_type VARCHAR(20) NOT NULL DEFAULT 'text',
  unit VARCHAR(30),
  is_filterable BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0
);

-- 5. Category Attributes Mapping
CREATE TABLE IF NOT EXISTS public.category_attributes (
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES public.attribute_definitions(id) ON DELETE CASCADE,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (category_id, attribute_id)
);

-- 6. Products Core Entity
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE RESTRICT,
  slug VARCHAR(150) NOT NULL UNIQUE,
  title_fa VARCHAR(255) NOT NULL,
  title_en VARCHAR(255) NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  description_fa TEXT,
  specs_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  badge VARCHAR(50),
  rating_average NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  reviews_count INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Product Images Gallery
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text_fa VARCHAR(255),
  is_cover BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Product Variants (SKU Units - Strictly Integer Toman BIGINT)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warranty_id UUID NOT NULL REFERENCES public.warranties(id) ON DELETE RESTRICT,
  sku VARCHAR(100) NOT NULL UNIQUE,
  barcode VARCHAR(50),
  color_name_fa VARCHAR(50) NOT NULL,
  color_name_en VARCHAR(50) NOT NULL,
  color_hex VARCHAR(7) NOT NULL,
  storage VARCHAR(30) NOT NULL,
  ram VARCHAR(30),
  sim_type VARCHAR(50) NOT NULL DEFAULT 'Dual SIM (Physical)',
  price_toman BIGINT NOT NULL CHECK (price_toman > 0),
  original_price_toman BIGINT CHECK (original_price_toman IS NULL OR original_price_toman >= price_toman),
  cost_price_toman BIGINT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Product Attribute Values (Canonical Specifications Source)
CREATE TABLE IF NOT EXISTS public.product_attribute_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES public.attribute_definitions(id) ON DELETE RESTRICT,
  value_text TEXT,
  value_number NUMERIC(12,2),
  value_boolean BOOLEAN,
  UNIQUE (product_id, attribute_id)
);

-- 10. Performance & Search Indexes
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products (brand_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_published ON public.products (is_published);
CREATE INDEX IF NOT EXISTS idx_products_trgm_title_fa ON public.products USING gin (title_fa gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_trgm_title_en ON public.products USING gin (title_en gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants (product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants (sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_is_published ON public.product_variants (is_published);
CREATE INDEX IF NOT EXISTS idx_product_images_product_sort ON public.product_images (product_id, sort_order ASC, id ASC);

-- 11. Table Grants & Secure RLS Policies
-- Grants
GRANT SELECT ON TABLE public.categories, public.brands, public.warranties, public.attribute_definitions, public.category_attributes TO anon, authenticated;
GRANT ALL ON TABLE public.categories, public.brands, public.warranties, public.attribute_definitions, public.category_attributes TO service_role;

GRANT SELECT ON TABLE public.products, public.product_images, public.product_variants, public.product_attribute_values TO anon, authenticated;
GRANT ALL ON TABLE public.products, public.product_images, public.product_variants, public.product_attribute_values TO service_role;

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribute_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attribute_values ENABLE ROW LEVEL SECURITY;

-- Public Published Catalog Browsing Policies
CREATE POLICY "Public Read Active Categories" ON public.categories FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Public Read Brands" ON public.brands FOR SELECT TO public USING (true);
CREATE POLICY "Public Read Active Warranties" ON public.warranties FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Public Read Attributes" ON public.attribute_definitions FOR SELECT TO public USING (true);
CREATE POLICY "Public Read Category Attributes" ON public.category_attributes FOR SELECT TO public USING (true);

-- Published Products Policy (Anonymous visitors NEVER see unpublished drafts)
CREATE POLICY "Public Read Published Products" ON public.products FOR SELECT TO public USING (is_published = true);

-- Product Images Policy
CREATE POLICY "Public Read Published Product Images" ON public.product_images FOR SELECT TO public
USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_published = true));

-- Product Variants Policy (Public only sees published variants)
CREATE POLICY "Public Read Published Variants" ON public.product_variants FOR SELECT TO public USING (is_published = true);

-- Product Attribute Values Policy
CREATE POLICY "Public Read Published Attribute Values" ON public.product_attribute_values FOR SELECT TO public
USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_published = true));

-- Administrative DML Policies (Enforces catalog:manage permission for writes)
CREATE POLICY "Catalog Managers Manage Products" ON public.products FOR ALL TO authenticated
USING (public.user_has_permission('catalog:manage')) WITH CHECK (public.user_has_permission('catalog:manage'));

CREATE POLICY "Catalog Managers Manage Variants" ON public.product_variants FOR ALL TO authenticated
USING (public.user_has_permission('catalog:manage')) WITH CHECK (public.user_has_permission('catalog:manage'));

CREATE POLICY "Catalog Managers Manage Images" ON public.product_images FOR ALL TO authenticated
USING (public.user_has_permission('catalog:manage')) WITH CHECK (public.user_has_permission('catalog:manage'));

CREATE POLICY "Catalog Managers Manage Categories" ON public.categories FOR ALL TO authenticated
USING (public.user_has_permission('catalog:manage')) WITH CHECK (public.user_has_permission('catalog:manage'));

CREATE POLICY "Catalog Managers Manage Brands" ON public.brands FOR ALL TO authenticated
USING (public.user_has_permission('catalog:manage')) WITH CHECK (public.user_has_permission('catalog:manage'));
