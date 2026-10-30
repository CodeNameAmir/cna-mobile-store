# CNA Mobile Store — Constraints, Sequences & Indexing Strategy

مستندات مهندسی محدودیت‌های یکتایی، چک کانستارینت‌های اعتبارسنجی داده، ایندکس‌های بهینه‌ساز B-Tree، ایندکس‌های فیلترشده (Partial)، جستجوی تمام‌متن فارسی (GIN)، کلیدهای ضدتکرار (Idempotency) و مکانیزم تولید ایمن شماره سفارشات با سال پویا.

---

## ۱. محدودیت‌های کلید اصلی و یکتایی (Primary Keys & Unique Constraints)

### ۱.۱. کلیدهای اصلی تک‌ستونی (Single-Column Primary Keys)
تمامی جداول به استثنای جداول واسط خالص N:M، دارای کلید اصلی `id` از نوع `UUID` با پیش‌فرض `gen_random_uuid()` هستند تا از حملات حدس عددی (ID Enumeration Attacks) جلوگیری شود.

### ۱.۲. محدودیت‌های یکتایی تجاری و کلیدهای ضدتکرار (Business & Idempotency Unique Constraints)

| نام جدول | ستون(های) یکتا | نام ایندکس یکتا | توجیه بیزینسی و امنیتی |
| :--- | :--- | :--- | :--- |
| `profiles` | `phone` | `uq_profiles_phone` | هر شماره همراه منحصراً متعلق به یک حساب کاربری است |
| `auth_roles` | `name` | `uq_auth_roles_name` | جلوگیری از تعریف نام تکراری برای نقش‌های سیستمی |
| `auth_permissions` | `code` | `uq_auth_permissions_code` | کدهای دسترسی در برنامه‌نویسی ثابت و یکتا هستند |
| `categories` | `slug` | `uq_categories_slug` | نشانی اینترنتی دسته‌ها در وب‌سایت باید یکتا باشد |
| `brands` | `slug` | `uq_brands_slug` | نشانی اینترنتی برندها در سئو باید یکتا باشد |
| `brands` | `name_en` | `uq_brands_name_en` | نام تجاری بین‌المللی سازنده کالا |
| `products` | `slug` | `uq_products_slug` | لینک صفحه محصول در فروشگاه |
| `attribute_definitions` | `code` | `uq_attribute_definitions_code` | شناسه فنی ویژگی (مانند `ram`, `storage`) |
| `product_variants` | `sku` | `uq_product_variants_sku` | کد انبارداری اختصاصی کالا در سطح کشور |
| `product_serial_units` | `imei1` | `uq_product_serial_imei1` | شناسه یکتای سخت‌افزاری دستگاه در سامانه همتا |
| `product_serial_units` | `serial_number` | `uq_product_serial_number` | شماره سریال کارخانه روی جعبه گوشی |
| `warehouses` | `code` | `uq_warehouses_code` | کد سیستمی انبار (مانند `WH-CENTRAL`) |
| `orders` | `order_number` | `uq_orders_order_number` | شماره پیگیری سفارش برای فاکتور و مشتری |
| `invoices` | `invoice_number`| `uq_invoices_invoice_number` | شماره رسمی صورتحساب فروشگاه |
| `invoices` | `order_id` | `uq_invoices_order_id` | هر سفارش دقیقاً یک صورتحساب رسمی دارد |
| `wallets` | `user_id` | `uq_wallets_user_id` | هر کاربر حداکثر یک کیف پول اعتباری دارد |
| `wallet_transactions` | `idempotency_key`| `uq_wallet_tx_idemp` | **کلید ضدتکرار تراکنش‌های کیف پول جهت پیشگیری از سند تکراری** |
| `stock_movements` | `idempotency_key`| `uq_stock_movements_idemp` | **کلید ضدتکرار اسناد انبار جهت پیشگیری از ورود یا خروج مضاعف** |
| `payment_transactions` | `idempotency_key`| `uq_payment_tx_idemp` | جلوگیری از ارسال تراکنش تکراری به درگاه |
| `payment_refund_attempts` | `idempotency_key`| `uq_refund_attempts_idemp` | **کلید ضدتکرار کلاینت/سرویس جهت منع تکرار تلاش استرداد در سطح رابطه** |
| `payment_refund_attempts` | `attempt_id` | `uq_refund_attempts_attempt_id` | **شناسه یکتای هر تلاش واقعی استرداد جهت ممیزی مستقل** |
| `payment_webhook_logs` | `idempotency_key`| `uq_payment_webhooks_idemp` | جلوگیری از پردازش مضاعف وب‌هوک‌های ارسالی بانک |
| `shipping_methods` | `code` | `uq_shipping_methods_code` | کد متد ارسال (مانند `tipax`, `express_tehran`) |
| `shipments` | `shipment_number`| `uq_shipments_number` | شناسه بارنامه داخلی مرسوله |
| `coupons` | `code` | `uq_coupons_code` | کد تخفیف واردشده توسط خریدار |
| `store_settings` | `key` | `pk_store_settings_key` | کلید متغیر تنظیمات فروشگاه |

### ۱.۳. محدودیت‌های یکتایی کامپوزیت (Composite Unique Constraints)
- `auth_role_permissions`: `PRIMARY KEY (role_id, permission_id)`
- `auth_user_roles`: `PRIMARY KEY (user_id, role_id)`
- `category_attributes`: `PRIMARY KEY (category_id, attribute_id)`
- `product_attribute_values`: `UNIQUE (product_id, attribute_id)`
- `warehouse_stock`: `UNIQUE (warehouse_id, variant_id)`
- `cart_items`: `UNIQUE (cart_id, variant_id)`
- `wishlists`: `UNIQUE (user_id, product_id)`

---

## ۲. چک کانستارینت‌های اعتبارسنجی داده (Data Validation Check Constraints)

```sql
-- ۱. اعتبارسنجی شماره موبایل ایران در پروفایل (الگوی 09xxxxxxxxx)
ALTER TABLE profiles 
  ADD CONSTRAINT chk_profiles_phone 
  CHECK (phone ~ '^09[0-9]{9}$');

-- ۲. اعتبارسنجی کد ملی در پروفایل (رشته ۱۰ رقمی عددی)
ALTER TABLE profiles 
  ADD CONSTRAINT chk_profiles_national_id 
  CHECK (national_id IS NULL OR national_id ~ '^[0-9]{10}$');

-- ۳. اعتبارسنجی کد پستی ۱۰ رقمی در آدرس‌ها
ALTER TABLE user_addresses 
  ADD CONSTRAINT chk_addresses_postal_code 
  CHECK (postal_code ~ '^[0-9]{10}$');

-- ۴. مبالغ پولی تومان الزماً باید عدد صحیح نامنفی یا مثبت باشند
ALTER TABLE product_variants 
  ADD CONSTRAINT chk_variants_price_positive 
  CHECK (price_toman > 0);

ALTER TABLE order_items 
  ADD CONSTRAINT chk_order_items_qty_positive 
  CHECK (quantity > 0 AND unit_selling_price_toman >= 0);

ALTER TABLE orders 
  ADD CONSTRAINT chk_orders_total_positive 
  CHECK (total_amount_toman >= 0);

ALTER TABLE wallets 
  ADD CONSTRAINT chk_wallet_balance_non_negative 
  CHECK (cached_balance_toman >= 0);

-- ۵. انبارداری و مقادیر نامنفی
ALTER TABLE warehouse_stock 
  ADD CONSTRAINT chk_stock_on_hand_non_negative 
  CHECK (quantity_on_hand >= 0 AND reserved_qty >= 0);

-- ۶. امتیازدهی بین ۱ تا ۵ ستاره
ALTER TABLE reviews 
  ADD CONSTRAINT chk_reviews_rating_range 
  CHECK (rating >= 1 AND rating <= 5);

-- ۷. بازه زمانی قوانین مالیاتی و کوپن‌ها
ALTER TABLE tax_rules 
  ADD CONSTRAINT chk_tax_rules_effective_dates 
  CHECK (effective_to IS NULL OR effective_to >= effective_from);

ALTER TABLE coupons 
  ADD CONSTRAINT chk_coupons_validity_dates 
  CHECK (valid_to >= valid_from);

-- ۸. کنترل ساختاریافته نوع تراکنش پرداخت و استرداد
ALTER TABLE payment_transactions 
  ADD CONSTRAINT chk_payment_tx_type 
  CHECK (transaction_type IN ('payment', 'refund', 'reversal'));
```

---

## ۳. تولید پویا، ایمن و ضدتداخل شماره سفارشات و فاکتورها (Thread-Safe Sequences with Dynamic Year)

```sql
-- ایجاد توالی‌های مستقل در پایگاه داده
CREATE SEQUENCE IF NOT EXISTS cna_order_number_seq START WITH 10001 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS cna_invoice_number_seq START WITH 50001 INCREMENT BY 1;

-- تابع ایجاد شناسه سفارش با سال پویا
CREATE OR REPLACE FUNCTION generate_cna_order_number()
RETURNS TRIGGER AS $$
DECLARE
    dynamic_year VARCHAR(4);
    seq_val BIGINT;
BEGIN
    dynamic_year := TO_CHAR(NOW(), 'YYYY');
    seq_val := nextval('cna_order_number_seq');
    NEW.order_number := 'CNA-' || dynamic_year || '-' || seq_val::TEXT;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_cna_order_number
BEFORE INSERT ON orders
FOR EACH ROW
WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
EXECUTE FUNCTION generate_cna_order_number();

-- تابع ایجاد شناسه فاکتور با سال پویا
CREATE OR REPLACE FUNCTION generate_cna_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    dynamic_year VARCHAR(4);
    seq_val BIGINT;
BEGIN
    dynamic_year := TO_CHAR(NOW(), 'YYYY');
    seq_val := nextval('cna_invoice_number_seq');
    NEW.invoice_number := 'CNA-INV-' || dynamic_year || '-' || seq_val::TEXT;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_cna_invoice_number
BEFORE INSERT ON invoices
FOR EACH ROW
WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
EXECUTE FUNCTION generate_cna_invoice_number();
```

---

## ۴. استراتژی ایندکس‌گذاری جامع (Indexing Architecture)

### ۴.۱. ایندکس‌های کلید خارجی جهت شتاب‌بخشی به Joinها و جلوگیری از Table Scan
```sql
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_product_images_product ON product_images(product_id, sort_order);
CREATE INDEX idx_user_addresses_user ON user_addresses(user_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_variant ON order_items(variant_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payment_transactions_payment ON payment_transactions(payment_id);
CREATE INDEX idx_payment_transactions_parent ON payment_transactions(parent_transaction_id);
CREATE INDEX idx_payment_transactions_type ON payment_transactions(transaction_type, status);
CREATE INDEX idx_warehouse_stock_variant ON warehouse_stock(variant_id);
CREATE INDEX idx_stock_movements_variant ON stock_movements(variant_id);
CREATE INDEX idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_product_serial_units_variant ON product_serial_units(variant_id);
CREATE INDEX idx_refund_attempts_tx ON payment_refund_attempts(refund_transaction_id);
```

### ۴.۲. ایندکس‌های کانونیکال مشخصات فنی برای فیلترهای چندمعیاره (Faceted Filtering)
```sql
-- فیلتر سریع بازه قیمت، دسته‌بندی و کالاهای فعال
CREATE INDEX idx_catalog_facets 
ON product_variants (product_id, price_toman, is_published);

-- ایندکس مقادیر مشخصات فنی کانونیکال برای فیلترهای اسلایدر و چک‌باکس
CREATE INDEX idx_product_attr_numeric 
ON product_attribute_values (attribute_id, value_number) 
WHERE value_number IS NOT NULL;

CREATE INDEX idx_product_attr_text 
ON product_attribute_values (attribute_id, value_text) 
WHERE value_text IS NOT NULL;
```

### ۴.۳. ایندکس‌های جزئی و بهینه‌ساز عملکرد (Partial Indexes)
```sql
-- ۱. ایندکس محصولات منتشرشده در ویترین (نادیده گرفتن پیش‌نویس‌ها)
CREATE INDEX idx_products_active_published 
ON products (category_id, brand_id, created_at DESC) 
WHERE is_published = TRUE;

-- ۲. ایندکس رزروهای فعال کالا جهت بررسی انقضای ۱۵ دقیقه‌ای توسط کرون‌جاب
CREATE INDEX idx_stock_reservations_active 
ON stock_reservations (expires_at) 
WHERE status = 'active';

-- ۳. ایندکس سفارشات در انتظار پرداخت بانکی
CREATE INDEX idx_orders_pending_payment 
ON orders (user_id, created_at) 
WHERE status = 'pending_payment';

-- ۴. ایندکس دستگاه‌های فیزیکی آزاد موجود در قفسه انبار
CREATE INDEX idx_serial_units_available 
ON product_serial_units (variant_id, warehouse_id) 
WHERE status = 'in_stock';
```

### ۴.۴. ایندکس جستجوی تمام‌متن فارسی (GIN Persian Full-Text Search)
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- جستجوی متنی ترکیبی روی نام فارسی، انگلیسی و مدل
CREATE INDEX idx_products_search_gin 
ON products USING GIN (
  to_tsvector('simple', title_fa || ' ' || title_en || ' ' || model_name)
);

-- جستجوی فازی سه‌حرفی (Trigram) برای تصحیح غلط املایی نام برند و گوشی
CREATE INDEX idx_products_title_fa_trgm 
ON products USING GIN (title_fa gin_trgm_ops);

CREATE INDEX idx_products_title_en_trgm 
ON products USING GIN (title_en gin_trgm_ops);
```
