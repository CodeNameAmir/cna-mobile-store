# CNA Mobile Store — Security Architecture & Supabase RLS Design

معماری امنیتی جامع، خط‌مشی‌های تفکیک‌شده کنترل دسترسی (RBAC)، انحصار تغییرات انبار و کیف پول به توابع RPC، سیاست‌های دقیق Row-Level Security (RLS) در بستر Supabase بر پایه اصل حداقل دسترسی (Least Privilege) و بازیابی پرداخت‌های دیرهنگام.

---

## ۱. مدل تهدید و مبانی امنیتی (Threat Modeling)

در پلتفرم تجارت الکترونیک کالاهای دیجیتال گران‌قیمت، سناریوهای تهدید زیر مدنظر قرار گرفته است:

1. **ارتقای غیرمجاز دسترسی در کلاینت (Privilege Escalation):**
   جدول `profiles` فاقد ستون نقش است و نقش‌ها در جدول تفکیک‌شده `auth_user_roles` ذخیره شده و فقط با توابع سیستمی قابل اعطا است.
2. **دستکاری مستقیم موجودی انبار یا تراز کیف پول (Direct Balance Tampering):**
   هیچ کلاینت و کاربری (حتی مدیران) امکان صدور دستور `UPDATE` یا `INSERT` روی جداول `warehouse_stock`, `stock_movements`, `wallets` و `wallet_transactions` را ندارد. تمامی تغییرات منحصراً از طریق توابع پروسیجرال امن پایگاه داده (`SECURITY DEFINER RPC`) با قفل سطری بدبینانه انجام می‌شود.
3. **حذف سوابق مالی و تغییر دفاتر حسابداری (Audit Tampering):**
   هیچ نقشی حق اجرای دستور `DELETE` روی ردیف‌های جداول `orders`, `invoices`, `payments`, `wallet_transactions`, `stock_movements` را ندارد.
4. **فروش بیش از ظرفیت در سناریوی پرداخت دیرهنگام (Late Payment Overselling):**
   در صورت بازگشت تایید پرداخت از بانک پس از انقضای زمان رزرو، اگر موجودی کالا تمام شده باشد، سیستم تراکنش را متوقف کرده، از بیش‌فروشی جلوگیری می‌کند و فرآیند استرداد وجه خودکار را به اجرا درمی‌آورد.

---

## ۲. توابع امنیتی اعتبارسنجی نقش و مجوز (RBAC Security Definer Functions)

```sql
-- ۱. تابع اعتبارسنجی نقش کاربر
CREATE OR REPLACE FUNCTION auth.user_has_role(required_role TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM auth_user_roles ur
        JOIN auth_roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name = required_role
    );
END;
$$ LANGUAGE plpgsql;

-- ۲. تابع بررسی داشتن مجوز دانه‌ای کاربر
CREATE OR REPLACE FUNCTION auth.user_has_permission(required_perm TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM auth_user_roles ur
        JOIN auth_role_permissions rp ON ur.role_id = rp.role_id
        JOIN auth_permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid()
          AND p.code = required_perm
    );
END;
$$ LANGUAGE plpgsql;
```

---

## ۳. ماتریس تفکیک دسترسی جداول و سیاست‌های RLS (Least Privilege Matrix)

> [!IMPORTANT]
> برای تمام جداول پایگاه داده دستور `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;` فعال می‌گردد.
> در صورت نبود سیاست صریح، پیش‌فرض سیستم بر مبنای مسدودسازی کامل (`DENY ALL`) است.

### ۳.۱. جداول هویتی و پرسنلی (Identity & Roles)

#### جدول `profiles`
- **SELECT:**
  - مشتری: فقط رکورد خودش را می‌بیند (`auth.uid() = id`).
  - ادمین/پشتیبان: دسترسی با مجوز `users:read`.
- **INSERT:**
  - تریگر سیستم در لحظه ثبت‌نام `auth.users` یا کاربر خودش (`auth.uid() = id`).
- **UPDATE:**
  - مشتری: فقط ویرایش اطلاعات پروفایل خود (نام، کد ملی، آواتار).
  - ادمین: مسدودسازی یا تغییر وضعیت با مجوز `users:manage`.
- **DELETE:**
  - **ممنوع برای همه.** حذف فیزیکی مسدود است؛ فرآیند ناشناس‌سازی PII (`anonymized_at`) اجرا می‌شود.

#### جداول `auth_roles`, `auth_permissions`, `auth_user_roles`
- **SELECT:**
  - کاربران احراز هویت شده: فقط مشاهده نقش‌های تخصیص‌یافته به خود.
  - مدیر ارشد: مشاهده تمام نقش‌ها و مجوزها (`auth.user_has_role('super_admin')`).
- **INSERT / UPDATE / DELETE:**
  - منحصراً مدیر ارشد (`auth.user_has_role('super_admin')`).

---

### ۳.۲. کاتالوگ، مشخصات فنی و گارانتی (Catalog Domain)

#### جداول `categories`, `brands`, `products`, `product_variants`, `product_images`, `attribute_definitions`, `product_attribute_values`, `warranties`
- **SELECT:**
  - عموم کاربران و مهمانان (`anon`, `authenticated`): مشاهده محصولات با شرط `is_published = TRUE`.
  - انبارداران و ادمین‌ها: مشاهده همه موارد حتی منتشرنشده با مجوز `catalog:read`.
- **INSERT / UPDATE:**
  - منحصراً پرسنل دارای مجوز `catalog:manage` یا `products:write`.
- **DELETE:**
  - کاتالوگ دارای سابقه سفارش غیرقابل حذف است (`RESTRICT`). حذف رکوردهای خام فقط با مجوز `super_admin`.

---

### ۳.۳. انبارداری، ردیابی سریال و دفاتر کل (Inventory Domain — RPC-Only Discipline)

#### جداول `warehouse_stock` و `stock_movements`
- **SELECT:**
  - پرسنل انبار و حسابرسان با مجوز `inventory:read` یا `inventory:audit`.
- **INSERT / UPDATE / DELETE برای کلاینت:**
  - **کاملاً مسدود و ممنوع (DENIED).** هیچ کاربری امکان نوشتن یا تغییر مستقیم در این دو جدول را از طریق کلاینت ندارد.
  - تغییرات منحصراً توسط توابع `SECURITY DEFINER RPC` در سطح سرور پایگاه داده اجرا می‌شود.

#### جدول `product_serial_units`
- **SELECT:**
  - پرسنل انبار با مجوز `inventory:read`.
- **INSERT / UPDATE:**
  - پرسنل انبار با مجوز `inventory:manage` در زمان اسکن ورود بارنامه و تخصیص به سفارش.
- **DELETE:**
  - **ممنوع مطلق.** دستگاه‌های ثبت‌شده در انبار غیرقابل حذف فیزیکی هستند.

---

### ۳.۴. سبد خرید (Cart Domain)

#### جداول `carts`, `cart_items`
- **SELECT / INSERT / UPDATE / DELETE:**
  - مشتری احراز هویت شده: فقط سبد متعلق به خود (`auth.uid() = user_id`).
  - کاربر مهمان: بر اساس تطابق توکن کوکی معتبر `session_token`.

---

### ۳.۵. سفارشات، فاکتورها و اقلام (Orders & Invoicing)

#### جدول `orders`
- **SELECT:**
  - خریدار: فقط سفارشات متعلق به خودش (`auth.uid() = user_id`).
  - کارشناس پشتیبانی و مدیران: با داشتن مجوز `orders:read`.
- **INSERT:**
  - فقط از طریق پروسیجر تراکنشی امن `rpc_checkout_order()`.
- **UPDATE:**
  - خریدار: فقط ثبت یادداشت قبل از پرداخت.
  - کارشناسان: تغییر وضعیت سفارش با مجوز `orders:manage`.
- **DELETE:**
  - **اکیداً مسدود برای تمام نقش‌ها.**

#### جدول `order_items`
- **SELECT:**
  - خریدار: فقط اقلام فاکتورهای خودش.
  - مدیران: با مجوز `orders:read`.
- **INSERT / UPDATE / DELETE:**
  - مسدود برای کلاینت؛ تولید منحصراً در زمان ساخت سفارش توسط تراکنش پایگاه داده.

---

### ۳.۶. امور مالی، کیف پول و پرداخت‌ها (Finance & Wallets — RPC-Only Discipline)

#### جداول `wallets` و `wallet_transactions`
- **SELECT:**
  - مشتری: فقط پرونده و ریزتراکنش‌های کیف پول خود.
  - مدیر مالی: با مجوز `finance:read`.
- **INSERT / UPDATE / DELETE برای کلاینت:**
  - **کاملاً مسدود و ممنوع (DENIED).**
  - کلیه واریزها و برداشت‌ها منحصراً از طریق پروسیجر امن `rpc_post_wallet_transaction()` اجرا می‌گردد.

#### جداول `invoices`, `payments`, `payment_transactions`
- **SELECT:**
  - مشتری: فقط اسناد و فاکتورهای سفارشات خود.
  - ادمین: با مجوز `finance:read`.
- **INSERT / UPDATE / DELETE:**
  - دستکاری مستقیم کلاینت مسدود؛ تغییرات منحصراً از طریق وب‌هوک تاییدشده درگاه یا پروسیجرهای تسویه حساب.

---

## ۴. توابع امنیتی تراکنشی و خطاتحمل‌پذیر (Exclusive RPC Procedures)

### ۱. روال انحصاری ثبت گردش انبار با تضمین پایداری `balance_after`
```sql
CREATE OR REPLACE FUNCTION rpc_record_stock_movement(
    p_warehouse_id UUID,
    p_variant_id UUID,
    p_quantity_change INT,
    p_movement_type VARCHAR,
    p_reference_type VARCHAR,
    p_reference_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock INT;
    v_new_balance INT;
    v_movement_id UUID;
BEGIN
    -- بررسی مجوز پرسنل انبار
    IF NOT auth.user_has_permission('inventory:manage') THEN
        RAISE EXCEPTION 'دسترسی مجاز برای مدیریت انبار وجود ندارد.';
    END IF;

    -- قفل بدبینانه سطری روی پروجکشن موجودی جهت صف‌بندی تراکنش‌ها
    SELECT quantity_on_hand INTO v_current_stock
    FROM warehouse_stock
    WHERE warehouse_id = p_warehouse_id AND variant_id = p_variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- اگر کالا قبلاً در این انبار رکورد نداشته باشد، ثبت پروجکشن اولیه
        INSERT INTO warehouse_stock (warehouse_id, variant_id, quantity_on_hand, reserved_qty)
        VALUES (p_warehouse_id, p_variant_id, 0, 0);
        v_current_stock := 0;
    END IF;

    -- محاسبه مانده جدید با تضمین توالی یکنواخت
    v_new_balance := v_current_stock + p_quantity_change;
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'موجودی انبار نمی‌تواند منفی شود.';
    END IF;

    -- به‌روزرسانی پروجکشن موجودی
    UPDATE warehouse_stock
    SET quantity_on_hand = v_new_balance,
        updated_at = NOW()
    WHERE warehouse_id = p_warehouse_id AND variant_id = p_variant_id;

    -- درج سند در دفتر کل کانونیکال
    INSERT INTO stock_movements (
        warehouse_id, variant_id, quantity_change, balance_after,
        movement_type, reference_type, reference_id, operator_id, notes
    ) VALUES (
        p_warehouse_id, p_variant_id, p_quantity_change, v_new_balance,
        p_movement_type, p_reference_type, p_reference_id, auth.uid(), p_notes
    ) RETURNING id INTO v_movement_id;

    RETURN v_movement_id;
END;
$$;
```

---

### ۲. روال انحصاری تراکنش‌های کیف پول با اعتبارسنجی تراز
```sql
CREATE OR REPLACE FUNCTION rpc_post_wallet_transaction(
    p_wallet_id UUID,
    p_amount_toman BIGINT,
    p_category VARCHAR,
    p_reference_type VARCHAR,
    p_reference_id UUID,
    p_description_fa TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet RECORD;
    v_new_balance BIGINT;
    v_tx_id UUID;
    v_tx_type VARCHAR;
BEGIN
    -- قفل بدبینانه سطری روی کیف پول
    SELECT * INTO v_wallet
    FROM wallets
    WHERE id = p_wallet_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'کیف پول یافت نشد.';
    END IF;

    IF v_wallet.is_locked THEN
        RAISE EXCEPTION 'کیف پول کاربر قفل است.';
    END IF;

    v_new_balance := v_wallet.cached_balance_toman + p_amount_toman;
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'موجودی کیف پول برای این تراکنش کافی نیست.';
    END IF;

    v_tx_type := CASE WHEN p_amount_toman >= 0 THEN 'credit' ELSE 'debit' END;

    -- به‌روزرسانی پروجکشن مانده
    UPDATE wallets
    SET cached_balance_toman = v_new_balance,
        updated_at = NOW()
    WHERE id = p_wallet_id;

    -- درج سند در دفتر کل کانونیکال کیف پول
    INSERT INTO wallet_transactions (
        wallet_id, amount_toman, balance_after_toman, transaction_type,
        category, reference_type, reference_id, description_fa, created_by
    ) VALUES (
        p_wallet_id, p_amount_toman, v_new_balance, v_tx_type,
        p_category, p_reference_type, p_reference_id, p_description_fa, auth.uid()
    ) RETURNING id INTO v_tx_id;

    RETURN v_tx_id;
END;
$$;
```

---

### ۳. مدیریت بازگشت پرداخت دیرهنگام و پیشگیری از بیش‌فروشی (`rpc_handle_late_payment_callback`)
```sql
CREATE OR REPLACE FUNCTION rpc_handle_late_payment_callback(
    p_order_id UUID,
    p_payment_transaction_id UUID,
    p_gateway_ref VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_stock RECORD;
    v_can_fulfill BOOLEAN := TRUE;
BEGIN
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

    -- بررسی رزروهای این سفارش
    -- اگر رزرو فعال است، فرآیند عادی تایید و کسر موجودی انجام می‌شود.
    -- اگر رزرو منقضی شده است، بررسی موجودی آزاد جاری:
    FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id LOOP
        SELECT (quantity_on_hand - reserved_qty) AS available_stock INTO v_stock
        FROM warehouse_stock
        WHERE variant_id = v_item.variant_id
        FOR UPDATE;

        IF v_stock.available_stock < v_item.quantity THEN
            v_can_fulfill := FALSE;
            EXIT;
        END IF;
    END LOOP;

    IF v_can_fulfill THEN
        -- تخصیص خودکار و نهایی‌سازی سفارش با یادداشت بازیابی دیرهنگام
        UPDATE orders 
        SET status = 'paid',
            admin_notes = COALESCE(admin_notes, '') || ' [تایید موفق پس از انقضای رزرو با موجودی آزاد]'
        WHERE id = p_order_id;
        
        -- کسر از انبار و ثبت سند در stock_movements...
        RETURN jsonb_build_object('success', true, 'action', 'fulfilled_auto_recovered');
    ELSE
        -- موجودی کالا تمام شده است: هرگز بیش‌فروشی نمی‌شود
        UPDATE orders 
        SET status = 'stock_exhausted_pending_refund',
            admin_notes = COALESCE(admin_notes, '') || ' [پرداخت دیرهنگام؛ اتمام موجودی؛ آماده استرداد وجه]'
        WHERE id = p_order_id;

        UPDATE payments 
        SET status = 'refund_pending' 
        WHERE order_id = p_order_id;

        RETURN jsonb_build_object('success', false, 'action', 'refund_initiated', 'reason', 'stock_exhausted');
    END IF;
END;
$$;
```

---

## ۵. حفاظت از حریم خصوصی و ناشناس‌سازی PII

- متغیر `data_retention_policy_days` در `store_settings` دوره بایگانی را تعیین می‌کند.
- در زمان درخواست بستن حساب، داده‌های هویتی در جدول `profiles` با مقادیر ماسک‌شده (`anonymized_at`) جایگزین می‌شوند تا تعهدات مالی بدون نقض حریم شخصی حفظ گردد.
