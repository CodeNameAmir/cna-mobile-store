# CNA Mobile Store — Security Architecture & Supabase RLS Design

معماری امنیتی جامع، خط‌مشی‌های تفکیک‌شده کنترل دسترسی (RBAC)، توابع پروسیجرال امن، سیاست‌های Row-Level Security (RLS) در بستر Supabase بر پایه اصل حداقل دسترسی (Least Privilege)، بازیابی پرداخت‌های دیرهنگام چندانباره و چرخه تکرارپذیر استرداد وجه.

---

## ۱. مدل تهدید و مبانی امنیتی (Threat Modeling)

در پلتفرم تجارت الکترونیک کالاهای دیجیتال گران‌قیمت، سناریوهای تهدید زیر مدنظر قرار گرفته است:

1. **ارتقای غیرمجاز دسترسی در کلاینت (Privilege Escalation):**
   جدول `profiles` فاقد ستون نقش است و نقش‌ها در جدول تفکیک‌شده `auth_user_roles` ذخیره شده و فقط با توابع سیستمی قابل اعطا است.
2. **شارژ دلخواه کیف پول توسط کلاینت (Arbitrary Wallet Credit Fraud):**
   کاربران هرگز نباید امکان ارسال مقدار دلخواه و ثبت تراکنش بستانکار (`credit`) برای کیف پول خود را داشته باشند. واریز به کیف پول منحصراً از مسیر معتبر وب‌هوک بانکی تاییدشده توسط سرور (`service_role`) یا استرداد تاییدشده سفارش امکان‌پذیر است. کاربر عادی فقط می‌تواند برای پرداخت یک سفارش معتبر در انتظار پرداخت متعلق به خود، دستور کسر وجه (`debit`) معادل مبلغ دقیق سفارش صادر کند.
3. **دستکاری مستقیم موجودی انبار یا تراز کیف پول (Direct Balance Tampering):**
   هیچ کلاینت و کاربری (حتی مدیران) امکان صدور دستور `UPDATE` یا `INSERT` مستقیم روی جداول `warehouse_stock`, `stock_movements`, `wallets` و `wallet_transactions` را ندارد. تمامی تغییرات منحصراً از طریق توابع پروسیجرال امن پایگاه داده (`SECURITY DEFINER RPC`) با قفل سطری بدبینانه انجام می‌شود.
4. **فروش بیش از ظرفیت در سناریوی پرداخت دیرهنگام (Late Payment Overselling):**
   در صورت بازگشت تایید پرداخت از بانک پس از انقضای زمان رزرو، اگر موجودی آزاد در انبارهای مجاز کافی نباشد، سیستم تراکنش را متوقف کرده، از بیش‌فروشی جلوگیری می‌کند و فرآیند استرداد خودکار وجه با ثبت دقیق وضعیت‌ها را به اجرا درمی‌آورد.
5. **سرقت مسیر جستجوی توابع امنیتی (search_path Hijacking):**
   تمامی توابع با سطح دسترسی `SECURITY DEFINER` الزاماً با `SET search_path = public, pg_temp;` مقید شده‌اند تا از حملات اجرای کدهای مخرب در اسکیماهای دیگر جلوگیری شود.
6. **فراخوانی تکراری و تداخل همزمانی (Concurrency & Duplicate Invocations):**
   تمامی توابع مالی و انبارداری از پارامتر کلید ضدتکرار (`idempotency_key`) استفاده کرده و در صورت همزمانی یا فراخوانی مجدد، مانع از ثبت مضاعف یا پرتاب خطای ناهماهنگ می‌شوند.
7. **اجرای غیرمجاز توابع مدیریتی و وب‌هوک توسط کلاینت (Unauthorized RPC Execution):**
   توابع حساسی نظیر `rpc_handle_late_payment_callback` و `rpc_process_gateway_refund` هرگز نباید توسط کاربران عادی احراز هویت شده در دسترس باشند؛ مجوز اجرای آنها منحصراً به `service_role` و نقش‌های مدیریتی خاص محدود شده است.

---

## ۲. توابع امنیتی اعتبارسنجی نقش و مجوز (RBAC Security Definer Functions)

```sql
-- ۱. تابع اعتبارسنجی نقش کاربر با مسیر امن
CREATE OR REPLACE FUNCTION auth.user_has_role(required_role TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- ۲. تابع بررسی داشتن مجوز دانه‌ای کاربر با مسیر امن
CREATE OR REPLACE FUNCTION auth.user_has_permission(required_perm TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- محدودسازی اجرای توابع بررسی مجوز
REVOKE EXECUTE ON FUNCTION auth.user_has_role(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth.user_has_role(TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION auth.user_has_permission(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth.user_has_permission(TEXT) TO authenticated, service_role;
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

#### جداول `auth_roles`, `auth_permissions`, `auth_user_roles`, `auth_role_permissions`
- **SELECT:**
  - کاربران احراز هویت شده: فقط مشاهده نقش‌های تخصیص‌یافته به خود.
  - مدیر ارشد: مشاهده تمام نقش‌ها و مجوزها (`auth.user_has_role('super_admin')`).
- **INSERT / UPDATE / DELETE:**
  - منحصراً مدیر ارشد (`auth.user_has_role('super_admin')`).

---

### ۳.۲. کاتالوگ، مشخصات فنی و گارانتی (Catalog Domain)

#### جداول `categories`, `brands`, `products`, `product_variants`, `product_images`, `attribute_definitions`, `category_attributes`, `product_attribute_values`, `warranties`
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
  - تغییرات منحصراً توسط توابع `SECURITY DEFINER RPC` با مسیر ایمن در سطح سرور پایگاه داده اجرا می‌شود.

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
  - مشتری: فقط پرونده و ریزتراکنش‌های کیف پول خود (`auth.uid() = wallets.user_id`).
  - مدیر مالی: با مجوز `finance:read`.
- **INSERT / UPDATE / DELETE برای کلاینت:**
  - **کاملاً مسدود و ممنوع (DENIED).**
  - کلیه واریزها و برداشت‌ها منحصراً از طریق پروسیجرهای امن سرور اجرا می‌گردد.

#### جداول `invoices`, `payments`, `payment_transactions`
- **SELECT:**
  - مشتری: فقط اسناد و فاکتورهای سفارشات خود.
  - ادمین: با مجوز `finance:read`.
- **INSERT / UPDATE / DELETE:**
  - دستکاری مستقیم کلاینت مسدود؛ تغییرات منحصراً از طریق وب‌هوک تاییدشده درگاه یا پروسیجرهای تسویه حساب و استرداد.

---

## ۴. توابع امنیتی تراکنشی و پروسیجرهای انحصاری (Hardened RPC Procedures)

### ۴.۱. روال امن تراکنش کیف پول با حفاظت ضد کلاهبرداری، مسیر امن و ضدتکرار
> [!IMPORTANT]
> مشتریان هرگز حق ارسال مبلغ مثبت به عنوان شارژ دلخواه را ندارند. برای پرداخت سفارش، مبلغ و شماره سفارش مستقیماً از سطر سفارش خوانده می‌شود. عملیات شارژ منحصراً از طریق `service_role` (درگاه بانکی) یا مدیر مجاز است.

```sql
CREATE OR REPLACE FUNCTION rpc_post_wallet_transaction(
    p_wallet_id UUID,
    p_amount_toman BIGINT,
    p_category VARCHAR,
    p_reference_type VARCHAR,
    p_reference_id UUID,
    p_description_fa TEXT,
    p_idempotency_key VARCHAR DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wallet RECORD;
    v_new_balance BIGINT;
    v_tx_id UUID;
    v_tx_type VARCHAR;
    v_caller_id UUID := auth.uid();
    v_is_service_role BOOLEAN := (COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role');
    v_order RECORD;
BEGIN
    -- ۱. اعتبارسنجی ضدتکرار امن در برابر تداخل همزمانی
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_tx_id 
        FROM wallet_transactions 
        WHERE idempotency_key = p_idempotency_key;
        
        IF FOUND THEN
            RETURN v_tx_id; -- بازگرداندن تراکنش قبلی بدون اعمال مجدد
        END IF;
    END IF;

    -- ۲. قفل بدبینانه سطری روی کیف پول
    SELECT * INTO v_wallet
    FROM wallets
    WHERE id = p_wallet_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'کیف پول مورد نظر یافت نشد.';
    END IF;

    IF v_wallet.is_locked THEN
        RAISE EXCEPTION 'کیف پول کاربر مسدود و قفل است.';
    END IF;

    -- ۳. سیاست سخت‌گیرانه مجاز بودن عملیات بر اساس نقش فراخواننده
    IF v_is_service_role THEN
        -- تماس مطمئن از سمت سرویس‌های پس‌زمینه (شارژ پس از تایید وب‌هوک یا استرداد سیستمی)
        NULL;
    ELSIF auth.user_has_permission('finance:manage') THEN
        -- مدیر مالی مجاز به اعمال اصلاحات حسابداری است
        NULL;
    ELSE
        -- کاربر عادی احراز هویت شده (مشتری):
        -- الف) کاربر فقط مجاز به اقدام روی کیف پول خود است
        IF v_wallet.user_id <> v_caller_id THEN
            RAISE EXCEPTION 'دسترسی غیرمجاز: شما مالک این کیف پول نیستید.';
        END IF;

        -- ب) مشتری هرگز مجاز به شارژ دلخواه (مبلغ مثبت) نیست
        IF p_amount_toman > 0 THEN
            RAISE EXCEPTION 'عملیات غیرمجاز: شارژ مستقیم کیف پول توسط کلاینت ممنوع است.';
        END IF;

        -- ج) مشتری تنها مجاز به پرداخت سفارش در وضعیت معلق است
        IF p_category <> 'order_payment' OR p_reference_type <> 'orders' THEN
            RAISE EXCEPTION 'عملیات غیرمجاز: سرفصل مجاز برای کلاینت صرفاً پرداخت سفارش است.';
        END IF;

        -- د) اعتبارسنجی مبلغ دقیق از روی سفارش سرور (عدم اعتماد به مبلغ ارسالی کلاینت)
        SELECT * INTO v_order FROM orders WHERE id = p_reference_id;
        IF NOT FOUND OR v_order.user_id <> v_caller_id THEN
            RAISE EXCEPTION 'سفارش مرجع معتبر نمی‌باشد.';
        END IF;
        IF v_order.status <> 'pending_payment' THEN
            RAISE EXCEPTION 'وضعیت سفارش جهت پرداخت از کیف پول معتبر نیست.';
        END IF;
        IF p_amount_toman <> -v_order.total_amount_toman THEN
            RAISE EXCEPTION 'مبلغ ارسالی با مبلغ فاکتور سفارش مطابقت ندارد.';
        END IF;
    END IF;

    v_new_balance := v_wallet.cached_balance_toman + p_amount_toman;
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'موجودی کیف پول برای این تراکنش کافی نیست.';
    END IF;

    v_tx_type := CASE WHEN p_amount_toman >= 0 THEN 'credit' ELSE 'debit' END;

    -- ۴. به‌روزرسانی پروجکشن مانده
    UPDATE wallets
    SET cached_balance_toman = v_new_balance,
        updated_at = NOW()
    WHERE id = p_wallet_id;

    -- ۵. درج اتمیک سند در دفتر کل کانونیکال کیف پول با مدیریت خطای همزمانی
    BEGIN
        INSERT INTO wallet_transactions (
            wallet_id, amount_toman, balance_after_toman, transaction_type,
            category, reference_type, reference_id, description_fa, 
            idempotency_key, created_by
        ) VALUES (
            p_wallet_id, p_amount_toman, v_new_balance, v_tx_type,
            p_category, p_reference_type, p_reference_id, p_description_fa,
            p_idempotency_key, COALESCE(v_caller_id, v_wallet.user_id)
        ) RETURNING id INTO v_tx_id;
    EXCEPTION WHEN unique_violation THEN
        IF p_idempotency_key IS NOT NULL THEN
            SELECT id INTO v_tx_id FROM wallet_transactions WHERE idempotency_key = p_idempotency_key;
            RETURN v_tx_id;
        END IF;
        RAISE;
    END;

    RETURN v_tx_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION rpc_post_wallet_transaction FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_post_wallet_transaction TO authenticated, service_role;
```

---

### ۴.۲. روال امن انبارداری با قفل ترتیبی، مقداردهی امن و بررسی اینواریانت موجودی آزاد
```sql
CREATE OR REPLACE FUNCTION rpc_record_stock_movement(
    p_warehouse_id UUID,
    p_variant_id UUID,
    p_quantity_change INT,
    p_movement_type VARCHAR,
    p_reference_type VARCHAR,
    p_reference_id UUID,
    p_notes TEXT DEFAULT NULL,
    p_idempotency_key VARCHAR DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_current_stock INT;
    v_reserved_stock INT;
    v_new_balance INT;
    v_movement_id UUID;
BEGIN
    -- ۱. بررسی مجوز پرسنل انبارداری
    IF NOT auth.user_has_permission('inventory:manage') AND 
       COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
        RAISE EXCEPTION 'دسترسی غیرمجاز برای تغییر اسناد انبار.';
    END IF;

    -- ۲. اعتبارسنجی ضدتکرار
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_movement_id 
        FROM stock_movements 
        WHERE idempotency_key = p_idempotency_key;
        
        IF FOUND THEN
            RETURN v_movement_id;
        END IF;
    END IF;

    -- ۳. اطمینان از وجود سطر در پروجکشن بدون Race Condition
    INSERT INTO warehouse_stock (warehouse_id, variant_id, shelf_location, quantity_on_hand, reserved_qty)
    VALUES (p_warehouse_id, p_variant_id, 'UNASSIGNED', 0, 0)
    ON CONFLICT (warehouse_id, variant_id) DO NOTHING;

    -- ۴. قفل بدبینانه سطری روی سطر قطعی برای صف‌بندی تراکنش‌ها
    SELECT quantity_on_hand, reserved_qty INTO v_current_stock, v_reserved_stock
    FROM warehouse_stock
    WHERE warehouse_id = p_warehouse_id AND variant_id = p_variant_id
    FOR UPDATE;

    v_new_balance := v_current_stock + p_quantity_change;
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'موجودی فیزیکی انبار نمی‌تواند به مقدار منفی تقلیل یابد.';
    END IF;

    -- بررسی اینواریانت رزرو: کاهش موجودی فیزیکی نباید آن را کمتر از سهمیه رزروهای فعال کند
    -- مگر در مواردی که رویداد از نوع فروش سفارش باشد و رزرو همزمان کسر شده باشد
    IF p_movement_type <> 'order_sale' AND v_new_balance < v_reserved_stock THEN
        RAISE EXCEPTION 'تغییر موجودی موجب نقض تعهد رزروهای فعال کالا می‌گردد.';
    END IF;

    -- ۵. به‌روزرسانی پروجکشن موجودی
    UPDATE warehouse_stock
    SET quantity_on_hand = v_new_balance,
        updated_at = NOW()
    WHERE warehouse_id = p_warehouse_id AND variant_id = p_variant_id;

    -- ۶. ثبت قطعی در دفتر کل کانونیکال با کنترل برخورد همزمان کلید ضدتکرار
    BEGIN
        INSERT INTO stock_movements (
            warehouse_id, variant_id, quantity_change, balance_after,
            movement_type, reference_type, reference_id, operator_id, 
            notes, idempotency_key
        ) VALUES (
            p_warehouse_id, p_variant_id, p_quantity_change, v_new_balance,
            p_movement_type, p_reference_type, p_reference_id, auth.uid(), 
            p_notes, p_idempotency_key
        ) RETURNING id INTO v_movement_id;
    EXCEPTION WHEN unique_violation THEN
        IF p_idempotency_key IS NOT NULL THEN
            SELECT id INTO v_movement_id FROM stock_movements WHERE idempotency_key = p_idempotency_key;
            RETURN v_movement_id;
        END IF;
        RAISE;
    END;

    RETURN v_movement_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION rpc_record_stock_movement FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_record_stock_movement TO authenticated, service_role;
```

---

### ۴.۳. بازیابی چندانباره پرداخت دیرهنگام با قفل سراسری ترتیبی و امنیت انحصاری سرور
> [!IMPORTANT]
> این تابع منحصراً برای `service_role` یا ادمین ارشد مالی/سفارشات مجاز است. کاربران کلاینت هرگز نمی‌توانند آن را فراخوانی کنند.
> تراکنش بانکی متناظر باید از پیش در جدول `payment_transactions` تایید و صحت‌سنجی شده باشد.

```sql
CREATE OR REPLACE FUNCTION rpc_handle_late_payment_callback(
    p_order_id UUID,
    p_payment_transaction_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_payment RECORD;
    v_ptx RECORD;
    v_item RECORD;
    v_candidate RECORD;
    v_is_service_role BOOLEAN := (COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role');
    v_all_allocated BOOLEAN := TRUE;
    v_allocated_qty INT;
    v_needed_qty INT;
    v_available INT;
    v_take_qty INT;
    v_refund_tx_id UUID;
    v_plan JSONB := '[]'::jsonb;
    v_alloc RECORD;
BEGIN
    -- ۱. اعتبارسنجی سطح دسترسی سروری (Server-Only Authorization)
    IF NOT v_is_service_role AND 
       NOT (auth.user_has_permission('finance:manage') AND auth.user_has_permission('orders:manage')) THEN
        RAISE EXCEPTION 'دسترسی غیرمجاز: این تابع صرفاً توسط سرویس‌های امن پشتیبان قابل فراخوانی است.';
    END IF;

    -- ۲. قفل قطعی روی سفارش
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'سفارش مورد نظر یافت نشد.';
    END IF;

    -- ۳. بررسی انطباق پرونده پرداخت و تراکنش بانکی معتبر
    SELECT * INTO v_payment FROM payments WHERE order_id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'پرونده پرداخت مربوط به این سفارش یافت نشد.';
    END IF;

    SELECT * INTO v_ptx 
    FROM payment_transactions 
    WHERE id = p_payment_transaction_id AND payment_id = v_payment.id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'تراکنش پرداخت با سفارش مورد نظر مطابقت ندارد.';
    END IF;

    -- تراکنش حتماً باید از کانال معتبر بانکی تایید شده باشد
    IF v_ptx.status <> 'verified' THEN
        RAISE EXCEPTION 'تراکنش بانکی هنوز در درگاه تایید نشده است.';
    END IF;

    -- ۴. مدیریت حالت‌های مختلف وضعیت سفارش
    IF v_order.status = 'paid' THEN
        RETURN jsonb_build_object('success', true, 'status', 'already_paid');
    END IF;

    IF v_order.status IN ('cancelled', 'refunded', 'stock_exhausted_pending_refund') THEN
        -- اگر سفارش قبلاً لغو یا مسترد شده، امکان تحویل کالا وجود ندارد؛ ارجاع به فرآیند استرداد
        UPDATE payments SET status = 'refund_pending' WHERE id = v_payment.id;
        RETURN jsonb_build_object('success', false, 'action', 'refund_required', 'reason', 'order_status_' || v_order.status);
    END IF;

    -- ۵. قفل سراسری و ترتیبی تمام سطرهای موجودی انبارهای فعال (Deterministic Global Lock Ordering)
    -- این ترتیب‌بندی مانع از بروز بن‌بست در تخصیص‌های چندانباره همزمان می‌شود
    PERFORM ws.warehouse_id, ws.variant_id
    FROM warehouse_stock ws
    JOIN warehouses w ON ws.warehouse_id = w.id
    WHERE ws.variant_id IN (SELECT variant_id FROM order_items WHERE order_id = p_order_id)
      AND w.is_active = TRUE
    ORDER BY ws.warehouse_id ASC, ws.variant_id ASC
    FOR UPDATE;

    -- ۶. استراتژی تجمیع موجودی آزاد در کل انبارها به صورت اتمیک (All-or-None)
    FOR v_item IN 
        SELECT variant_id, quantity 
        FROM order_items 
        WHERE order_id = p_order_id 
        ORDER BY variant_id ASC
    LOOP
        v_needed_qty := v_item.quantity;
        v_allocated_qty := 0;

        FOR v_candidate IN 
            SELECT ws.warehouse_id, ws.quantity_on_hand, ws.reserved_qty
            FROM warehouse_stock ws
            JOIN warehouses w ON ws.warehouse_id = w.id
            WHERE ws.variant_id = v_item.variant_id AND w.is_active = TRUE
            ORDER BY w.is_central DESC, ws.warehouse_id ASC
        LOOP
            v_available := GREATEST(0, v_candidate.quantity_on_hand - v_candidate.reserved_qty);
            IF v_available > 0 THEN
                v_take_qty := LEAST(v_needed_qty - v_allocated_qty, v_available);
                v_allocated_qty := v_allocated_qty + v_take_qty;
                
                -- ذخیره گام تخصیص در طرح موقت
                v_plan := v_plan || jsonb_build_object(
                    'warehouse_id', v_candidate.warehouse_id,
                    'variant_id', v_item.variant_id,
                    'quantity', v_take_qty
                );

                IF v_allocated_qty >= v_needed_qty THEN
                    EXIT;
                END IF;
            END IF;
        END LOOP;

        IF v_allocated_qty < v_needed_qty THEN
            v_all_allocated := FALSE;
            EXIT;
        END IF;
    END LOOP;

    -- ۷. تصمیم‌گیری نهایی: تخصیص کامل یا استرداد بدون بیش‌فروشی
    IF v_all_allocated THEN
        -- اجرای طرح تخصیص بر روی پروجکشن و دفتر کل کانونیکال
        FOR v_alloc IN SELECT * FROM jsonb_to_recordset(v_plan) AS (warehouse_id UUID, variant_id UUID, quantity INT) LOOP
            UPDATE warehouse_stock
            SET quantity_on_hand = quantity_on_hand - v_alloc.quantity,
                updated_at = NOW()
            WHERE warehouse_id = v_alloc.warehouse_id AND variant_id = v_alloc.variant_id;

            INSERT INTO stock_movements (
                warehouse_id, variant_id, quantity_change, balance_after,
                movement_type, reference_type, reference_id, operator_id, notes
            ) VALUES (
                v_alloc.warehouse_id, v_alloc.variant_id, -v_alloc.quantity,
                (SELECT quantity_on_hand FROM warehouse_stock WHERE warehouse_id = v_alloc.warehouse_id AND variant_id = v_alloc.variant_id),
                'order_sale', 'orders', p_order_id, NULL, 'تخصیص چندانباره پس از پرداخت دیرهنگام'
            );
        END LOOP;

        UPDATE orders 
        SET status = 'paid',
            admin_notes = COALESCE(admin_notes, '') || ' [پرداخت دیرهنگام: تخصیص اتمیک چندانباره موفق]'
        WHERE id = p_order_id;

        UPDATE payments 
        SET status = 'completed', completed_at = NOW() 
        WHERE id = v_payment.id;

        RETURN jsonb_build_object('success', true, 'action', 'fulfilled_multi_warehouse', 'plan', v_plan);
    ELSE
        -- عدم امکان تامین کامل اقلام؛ جلوگیری از بیش‌فروشی و انتقال به صف استرداد
        UPDATE orders 
        SET status = 'stock_exhausted_pending_refund',
            admin_notes = COALESCE(admin_notes, '') || ' [هشدار: کسری موجودی کالا پس از پرداخت دیرهنگام؛ ارجاع به استرداد]'
        WHERE id = p_order_id;

        UPDATE payments 
        SET status = 'refund_pending' 
        WHERE id = v_payment.id;

        INSERT INTO payment_transactions (
            payment_id, gateway, amount_toman, authority_token,
            idempotency_key, status, raw_response
        ) VALUES (
            v_payment.id, v_ptx.gateway, v_order.total_amount_toman, 'REFUND-' || p_order_id,
            'IDEMP-REFUND-LATE-' || p_order_id, 'initiated',
            jsonb_build_object('reason', 'stock_exhausted_multi_warehouse', 'original_tx', p_payment_transaction_id)
        ) RETURNING id INTO v_refund_tx_id;

        INSERT INTO admin_audit_logs (
            actor_id, action, target_entity, target_id, old_data, new_data, ip_address
        ) VALUES (
            NULL, 'late_payment_stock_exhausted', 'orders', p_order_id,
            jsonb_build_object('order_id', p_order_id, 'amount', v_order.total_amount_toman),
            jsonb_build_object('refund_tx_id', v_refund_tx_id, 'status', 'refund_pending'),
            '127.0.0.1'::inet
        );

        RETURN jsonb_build_object('success', false, 'action', 'refund_queued', 'reason', 'insufficient_multi_warehouse_stock');
    END IF;
END;
$$;

-- انحصار کامل به سرور و سلب دسترسی از کلاینت‌های عمومی
REVOKE EXECUTE ON FUNCTION rpc_handle_late_payment_callback FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION rpc_handle_late_payment_callback TO service_role;
```

---

### ۴.۴. چرخه کامل، تکرارپذیر و پایاپای استرداد وجه با اعتبارسنجی سروری
```sql
CREATE OR REPLACE FUNCTION rpc_process_gateway_refund(
    p_payment_transaction_id UUID,
    p_gateway_refund_ref VARCHAR,
    p_verified_success BOOLEAN,
    p_error_message TEXT DEFAULT NULL,
    p_idempotency_key VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tx RECORD;
    v_payment RECORD;
    v_is_service_role BOOLEAN := (COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role');
BEGIN
    -- ۱. کنترل سطح دسترسی سروری
    IF NOT v_is_service_role AND NOT auth.user_has_permission('finance:manage') THEN
        RAISE EXCEPTION 'دسترسی غیرمجاز جهت ثبت یا تایید استرداد وجه.';
    END IF;

    -- ۲. قفل بدبینانه تراکنش استرداد
    SELECT * INTO v_tx 
    FROM payment_transactions 
    WHERE id = p_payment_transaction_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'تراکنش پرداخت یا استرداد مورد نظر یافت نشد.';
    END IF;

    -- ۳. رفتار پایاپای در مواجهه با وب‌هوک یا کال‌بک تکراری
    IF v_tx.status = 'verified' AND p_verified_success THEN
        RETURN jsonb_build_object('success', true, 'status', 'already_refunded_verified');
    END IF;

    SELECT * INTO v_payment FROM payments WHERE id = v_tx.payment_id FOR UPDATE;

    -- ۴. پردازش نتیجه بر اساس تایید قطعی بانکی
    IF p_verified_success THEN
        -- تنها زمانی وضعیت به refunded تغییر می‌یابد که تایید قطعی بانکی محرز شده باشد
        UPDATE payment_transactions
        SET status = 'verified',
            shaparak_rrn = p_gateway_refund_ref,
            verified_at = NOW(),
            raw_response = COALESCE(raw_response, '{}'::jsonb) || jsonb_build_object('refund_verified', true, 'verified_at', NOW())
        WHERE id = v_tx.id;

        UPDATE payments
        SET status = 'refunded'
        WHERE id = v_payment.id;

        UPDATE orders
        SET status = 'refunded'
        WHERE id = v_payment.order_id;

        RETURN jsonb_build_object('success', true, 'status', 'refund_completed');
    ELSE
        -- عدم موفقیت در درگاه؛ افزایش شمارنده و ثبت خطا جهت تلاش مجدد در جاب تطبیق
        UPDATE payment_transactions
        SET status = 'failed',
            raw_response = COALESCE(raw_response, '{}'::jsonb) || jsonb_build_object(
                'refund_error', p_error_message,
                'retry_count', COALESCE((raw_response->>'retry_count')::int, 0) + 1,
                'last_attempt_at', NOW()
            )
        WHERE id = v_tx.id;

        UPDATE payments
        SET status = 'refund_failed'
        WHERE id = v_payment.id;

        RETURN jsonb_build_object('success', false, 'status', 'refund_failed_retry_queued', 'error', p_error_message);
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION rpc_process_gateway_refund FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION rpc_process_gateway_refund TO service_role;
```
