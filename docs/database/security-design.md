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
    -- ۱. اعتبارسنجی اولیه ضدتکرار پیش از ورود به تراکنش
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_tx_id 
        FROM wallet_transactions 
        WHERE idempotency_key = p_idempotency_key;
        
        IF FOUND THEN
            RETURN v_tx_id; -- بازگرداندن تراکنش قبلی بدون اعمال مجدد یا تغییر مانده
        END IF;
    END IF;

    -- ۲. در صورت پرداخت سفارش، قفل بدبینانه ابتدا روی سفارش اعمال می‌شود (پیشگیری از پرداخت همزمان سفارش)
    IF p_category = 'order_payment' AND p_reference_type = 'orders' THEN
        SELECT * INTO v_order 
        FROM orders 
        WHERE id = p_reference_id 
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'سفارش مرجع معتبر نمی‌باشد.';
        END IF;

        IF NOT v_is_service_role AND NOT auth.user_has_permission('finance:manage') THEN
            IF v_order.user_id <> v_caller_id THEN
                RAISE EXCEPTION 'دسترسی غیرمجاز: سفارش مرجع متعلق به کاربر جاری نیست.';
            END IF;
        END IF;

        IF v_order.status <> 'pending_payment' THEN
            RAISE EXCEPTION 'وضعیت سفارش جهت پرداخت از کیف پول معتبر نیست (وضعیت فعلی: %).', v_order.status;
        END IF;

        -- جلوگیری قطعی از پرداخت مضاعف سفارش توسط دو درخواست همزمان با کلیدهای ضدتکرار متفاوت
        IF EXISTS (
            SELECT 1 
            FROM wallet_transactions 
            WHERE reference_type = 'orders' 
              AND reference_id = p_reference_id 
              AND category = 'order_payment'
        ) THEN
            RAISE EXCEPTION 'برای این سفارش قبلاً تراکنش پرداخت از کیف پول ثبت شده است.';
        END IF;

        -- اعتبارسنجی دقیق مبلغ از روی سفارش سرور (عدم اعتماد به مبلغ ارسالی کلاینت)
        IF p_amount_toman <> -v_order.total_amount_toman THEN
            RAISE EXCEPTION 'مبلغ ارسالی با مبلغ فاکتور سفارش مطابقت ندارد.';
        END IF;
    END IF;

    -- ۳. قفل بدبینانه سطری روی کیف پول (سریال‌سازی تراکنش‌های یک کیف پول)
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

    -- بررسی مجدد کلید ضدتکرار پس از اخذ قفل کیف پول جهت بستن کامل پنجره رقابت همزمان (Race-Safe)
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_tx_id 
        FROM wallet_transactions 
        WHERE idempotency_key = p_idempotency_key;
        
        IF FOUND THEN
            RETURN v_tx_id; -- بازگشت ایمن بدون کوچک‌ترین دستکاری در پروجکشن مانده کیف پول
        END IF;
    END IF;

    -- ۴. سیاست سخت‌گیرانه مجاز بودن عملیات بر اساس نقش فراخواننده
    IF v_is_service_role THEN
        NULL; -- سرویس‌های پس‌زمینه امن (وب‌هوک بانکی / استرداد سیستمی)
    ELSIF auth.user_has_permission('finance:manage') THEN
        NULL; -- مدیر مالی مجاز
    ELSE
        -- کاربر عادی احراز هویت شده (مشتری):
        IF v_wallet.user_id <> v_caller_id THEN
            RAISE EXCEPTION 'دسترسی غیرمجاز: شما مالک این کیف پول نیستید.';
        END IF;

        -- مشتری هرگز مجاز به شارژ دلخواه (مبلغ مثبت) نیست
        IF p_amount_toman > 0 THEN
            RAISE EXCEPTION 'عملیات غیرمجاز: شارژ مستقیم کیف پول توسط کلاینت ممنوع است.';
        END IF;

        IF p_category <> 'order_payment' OR p_reference_type <> 'orders' THEN
            RAISE EXCEPTION 'عملیات غیرمجاز: سرفصل مجاز برای کلاینت صرفاً پرداخت سفارش است.';
        END IF;
    END IF;

    v_new_balance := v_wallet.cached_balance_toman + p_amount_toman;
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'موجودی کیف پول برای این تراکنش کافی نیست.';
    END IF;

    v_tx_type := CASE WHEN p_amount_toman >= 0 THEN 'credit' ELSE 'debit' END;

    -- ۵. درج در دفتر کل کانونیکال و به‌روزرسانی پروجکشن با تعهد اتمیک همگام
    -- درج در دفتر کل تغییرناپذیر پیش از آپدیت پروجکشن انجام شده و هر دو درون بلوک تراکنش فرعی قرار دارند
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

        -- به‌روزرسانی پروجکشن مانده منحصراً پس از ثبت موفق دفتر کل
        UPDATE wallets
        SET cached_balance_toman = v_new_balance,
            updated_at = NOW()
        WHERE id = p_wallet_id;

        -- در صورت پرداخت سفارش، ثبت موفقیت و تسویه سفارش
        IF p_category = 'order_payment' AND p_reference_type = 'orders' THEN
            UPDATE orders
            SET status = 'paid',
                admin_notes = COALESCE(admin_notes, '') || ' [پرداخت موفق از کیف پول]'
            WHERE id = p_reference_id;
        END IF;
    EXCEPTION WHEN unique_violation THEN
        -- در صورت وقوع همزمانی کلید ضدتکرار، کل بلوک رول‌بک شده و مانده پروجکشن هرگز تغییر نمی‌کند
        IF p_idempotency_key IS NOT NULL THEN
            SELECT id INTO v_tx_id FROM wallet_transactions WHERE idempotency_key = p_idempotency_key;
            IF v_tx_id IS NOT NULL THEN
                RETURN v_tx_id;
            END IF;
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

### ۴.۲. روال امن انبارداری با قفل ترتیبی، مقداردهی امن، اتمیسیته دفتر کل و کلید ضدتکرار
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

    -- ۲. اعتبارسنجی اولیه ضدتکرار
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_movement_id 
        FROM stock_movements 
        WHERE idempotency_key = p_idempotency_key;
        
        IF FOUND THEN
            RETURN v_movement_id; -- بازگشت فوری بدون هیچ‌گونه عوارض جانبی یا تغییر در پروجکشن
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

    -- بررسی مجدد کلید ضدتکرار پس از اخذ قفل سطری جهت مصونیت از تداخل همزمانی رقابتی
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_movement_id 
        FROM stock_movements 
        WHERE idempotency_key = p_idempotency_key;
        
        IF FOUND THEN
            RETURN v_movement_id;
        END IF;
    END IF;

    v_new_balance := v_current_stock + p_quantity_change;
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'موجودی فیزیکی انبار نمی‌تواند به مقدار منفی تقلیل یابد.';
    END IF;

    -- بررسی اینواریانت رزرو: کاهش موجودی فیزیکی نباید آن را کمتر از سهمیه رزروهای فعال کند
    IF p_movement_type <> 'order_sale' AND v_new_balance < v_reserved_stock THEN
        RAISE EXCEPTION 'تغییر موجودی موجب نقض تعهد رزروهای فعال کالا می‌گردد.';
    END IF;

    -- ۵. ثبت در دفتر کل کانونیکال و به‌روزرسانی پروجکشن در یک واحد اتمیک امن
    BEGIN
        -- الف) درج قطعی در دفتر کل تغییرناپذیر
        INSERT INTO stock_movements (
            warehouse_id, variant_id, quantity_change, balance_after,
            movement_type, reference_type, reference_id, operator_id, 
            notes, idempotency_key
        ) VALUES (
            p_warehouse_id, p_variant_id, p_quantity_change, v_new_balance,
            p_movement_type, p_reference_type, p_reference_id, auth.uid(), 
            p_notes, p_idempotency_key
        ) RETURNING id INTO v_movement_id;

        -- ب) به‌روزرسانی پروجکشن موجودی منحصراً پس از ثبت در دفتر کل
        UPDATE warehouse_stock
        SET quantity_on_hand = v_new_balance,
            updated_at = NOW()
        WHERE warehouse_id = p_warehouse_id AND variant_id = p_variant_id;
    EXCEPTION WHEN unique_violation THEN
        -- در صورت برخورد کلید ضدتکرار، پروجکشن دست‌نخورده مانده و رکورد قبلی بازگردانده می‌شود
        IF p_idempotency_key IS NOT NULL THEN
            SELECT id INTO v_movement_id FROM stock_movements WHERE idempotency_key = p_idempotency_key;
            IF v_movement_id IS NOT NULL THEN
                RETURN v_movement_id;
            END IF;
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

### ۴.۳. بازیابی چندانباره پرداخت دیرهنگام با تفکیک دقیق حالات، قفل سطری ترتیبی و امنیت سروری
> [!IMPORTANT]
> این تابع منحصراً برای `service_role` یا ادمین ارشد مالی/سفارشات مجاز است. کاربران کلاینت هرگز دسترسی به این تابع ندارند.
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

    -- ۳. قفل قطعی روی پرونده پرداخت
    SELECT * INTO v_payment FROM payments WHERE order_id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'پرونده پرداخت مربوط به این سفارش یافت نشد.';
    END IF;

    -- ۴. قفل قطعی و اعتبارسنجی دقیق تراکنش پرداخت
    SELECT * INTO v_ptx 
    FROM payment_transactions 
    WHERE id = p_payment_transaction_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'تراکنش پرداخت مورد نظر یافت نشد.';
    END IF;

    IF v_ptx.payment_id <> v_payment.id THEN
        RAISE EXCEPTION 'تراکنش پرداخت با پرونده پرداخت سفارش مطابقت ندارد.';
    END IF;

    -- اطمینان از اینکه تراکنش ورودی یک پرداخت خرید اصلی است و نه تراکنش استرداد
    IF v_ptx.authority_token LIKE 'REFUND-%' OR v_ptx.gateway = 'system_refund' THEN
        RAISE EXCEPTION 'شناسه ارسالی مربوط به یک تراکنش استرداد است و تراکنش پرداخت خرید نیست.';
    END IF;

    -- تراکنش حتماً باید از کانال معتبر بانکی تایید شده باشد
    IF v_ptx.status <> 'verified' THEN
        RAISE EXCEPTION 'تراکنش بانکی در درگاه تایید نشده است (وضعیت: %).', v_ptx.status;
    END IF;

    -- اعتبارسنجی انطباق دقیق مبلغ تراکنش با مجموع فاکتور سفارش
    IF v_ptx.amount_toman <> v_order.total_amount_toman THEN
        RAISE EXCEPTION 'مبلغ تراکنش پرداخت (%) با مجموع فاکتور سفارش (%) تطابق ندارد.', v_ptx.amount_toman, v_order.total_amount_toman;
    END IF;

    -- جلوگیری از تخصیص یا پردازش مضاعف یک تراکنش تاییدشده قبلی
    IF COALESCE((v_ptx.raw_response->>'allocated')::boolean, false) IS TRUE THEN
        RETURN jsonb_build_object('success', true, 'status', 'already_processed', 'order_status', v_order.status);
    END IF;

    -- ۵. تفکیک دقیق حالات مختلف وضعیت سفارش
    -- الف) سفارش قبلاً تسویه شده است (Idempotent Paid)
    IF v_order.status = 'paid' THEN
        RETURN jsonb_build_object('success', true, 'status', 'already_paid');
    END IF;

    -- ب) سفارش قبلاً مسترد شده است: عدم تغییر وضعیت به refund_pending و بازگشت بدون دستکاری داده
    IF v_order.status = 'refunded' OR v_payment.status = 'refunded' THEN
        RETURN jsonb_build_object('success', true, 'status', 'already_refunded', 'message', 'این سفارش قبلاً مسترد شده است و نیازی به تغییر وضعیت ندارد.');
    END IF;

    -- ج) سفارش در حال حاضر در صف استرداد وجه است (بدون درج مجدد تراکنش استرداد)
    IF v_order.status = 'stock_exhausted_pending_refund' OR v_payment.status = 'refund_pending' THEN
        RETURN jsonb_build_object('success', false, 'status', 'refund_already_pending', 'message', 'سفارش در صف استرداد وجه قرار دارد و تراکنش استرداد قبلاً صادر شده است.');
    END IF;

    -- د) سفارش قبل از رسیدن پرداخت منقضی/لغو شده است: ارجاع مستقیم به استرداد
    IF v_order.status = 'cancelled' THEN
        UPDATE payments SET status = 'refund_pending', updated_at = NOW() WHERE id = v_payment.id;

        INSERT INTO payment_transactions (
            payment_id, parent_transaction_id, transaction_type, gateway, amount_toman, authority_token,
            idempotency_key, status, raw_response
        ) VALUES (
            v_payment.id, v_ptx.id, 'refund', v_ptx.gateway, v_order.total_amount_toman, 'REFUND-' || p_order_id,
            'IDEMP-REFUND-CANCELLED-' || p_order_id, 'initiated',
            jsonb_build_object('reason', 'order_was_cancelled_prior_to_payment', 'original_tx', p_payment_transaction_id, 'refund_attempts', '[]'::jsonb)
        ) RETURNING id INTO v_refund_tx_id;

        UPDATE payment_transactions
        SET raw_response = COALESCE(raw_response, '{}'::jsonb) || jsonb_build_object('allocated', false, 'reason', 'order_cancelled')
        WHERE id = v_ptx.id;

        RETURN jsonb_build_object('success', false, 'action', 'refund_queued', 'reason', 'order_was_cancelled', 'refund_tx_id', v_refund_tx_id);
    END IF;

    -- ۶. قفل سراسری و ترتیبی تمام سطرهای موجودی انبارها برای این اقلام (Deterministic Global Lock Ordering)
    PERFORM ws.warehouse_id, ws.variant_id
    FROM warehouse_stock ws
    JOIN warehouses w ON ws.warehouse_id = w.id
    WHERE ws.variant_id IN (SELECT variant_id FROM order_items WHERE order_id = p_order_id)
      AND w.is_active = TRUE
    ORDER BY ws.warehouse_id ASC, ws.variant_id ASC
    FOR UPDATE;

    -- ۷. استراتژی تجمیع موجودی آزاد در کل انبارها به صورت اتمیک (All-or-None)
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

    -- ۸. تصمیم‌گیری نهایی: تخصیص کامل بدون بیش‌فروشی یا استرداد تضمین‌شده
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
            admin_notes = COALESCE(admin_notes, '') || ' [پرداخت دیرهنگام: تخصیص اتمیک چندانباره موفق]',
            updated_at = NOW()
        WHERE id = p_order_id;

        UPDATE payments 
        SET status = 'completed', completed_at = NOW(), updated_at = NOW()
        WHERE id = v_payment.id;

        UPDATE payment_transactions
        SET raw_response = COALESCE(raw_response, '{}'::jsonb) || jsonb_build_object('allocated', true, 'allocated_at', NOW())
        WHERE id = v_ptx.id;

        RETURN jsonb_build_object('success', true, 'action', 'fulfilled_multi_warehouse', 'plan', v_plan);
    ELSE
        -- عدم امکان تامین کامل اقلام؛ جلوگیری قطعی از بیش‌فروشی و انتقال به صف استرداد
        UPDATE orders 
        SET status = 'stock_exhausted_pending_refund',
            admin_notes = COALESCE(admin_notes, '') || ' [هشدار: کسری موجودی کالا پس از پرداخت دیرهنگام؛ ارجاع به استرداد]',
            updated_at = NOW()
        WHERE id = p_order_id;

        UPDATE payments 
        SET status = 'refund_pending', updated_at = NOW()
        WHERE id = v_payment.id;

        INSERT INTO payment_transactions (
            payment_id, parent_transaction_id, transaction_type, gateway, amount_toman, authority_token,
            idempotency_key, status, raw_response
        ) VALUES (
            v_payment.id, v_ptx.id, 'refund', v_ptx.gateway, v_order.total_amount_toman, 'REFUND-' || p_order_id,
            'IDEMP-REFUND-LATE-' || p_order_id, 'initiated',
            jsonb_build_object('reason', 'stock_exhausted_multi_warehouse', 'original_tx', p_payment_transaction_id, 'refund_attempts', '[]'::jsonb)
        ) RETURNING id INTO v_refund_tx_id;

        UPDATE payment_transactions
        SET raw_response = COALESCE(raw_response, '{}'::jsonb) || jsonb_build_object('allocated', false, 'reason', 'stock_exhausted')
        WHERE id = v_ptx.id;

        INSERT INTO admin_audit_logs (
            actor_id, action, target_entity, target_id, old_data, new_data, ip_address
        ) VALUES (
            NULL, 'late_payment_stock_exhausted', 'orders', p_order_id,
            jsonb_build_object('order_id', p_order_id, 'amount', v_order.total_amount_toman),
            jsonb_build_object('refund_tx_id', v_refund_tx_id, 'status', 'refund_pending'),
            '127.0.0.1'::inet
        );

        RETURN jsonb_build_object('success', false, 'action', 'refund_queued', 'reason', 'insufficient_multi_warehouse_stock', 'refund_tx_id', v_refund_tx_id);
    END IF;
END;
$$;

-- انحصار کامل به سرور و سلب دسترسی از کلاینت‌های عمومی
REVOKE EXECUTE ON FUNCTION rpc_handle_late_payment_callback FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION rpc_handle_late_payment_callback TO service_role;
```

---

### ۴.۴. چرخه کامل، تکرارپذیر و پایاپای استرداد وجه با اعتبارسنجی ساختاریافته و تفکیک تلاش‌های مجدد
```sql
CREATE OR REPLACE FUNCTION rpc_process_gateway_refund(
    p_refund_transaction_id UUID,
    p_gateway_refund_ref VARCHAR,
    p_verified_success BOOLEAN,
    p_error_message TEXT DEFAULT NULL,
    p_idempotency_key VARCHAR DEFAULT NULL,
    p_attempt_id UUID DEFAULT gen_random_uuid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tx RECORD;
    v_parent_ptx RECORD;
    v_payment RECORD;
    v_order RECORD;
    v_is_service_role BOOLEAN := (COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role');
    v_retry_count INT;
    v_next_retry TIMESTAMPTZ;
    v_retry_status VARCHAR;
    v_existing_attempt JSONB;
    v_attempt_record JSONB;
BEGIN
    -- ۱. کنترل سطح دسترسی سروری و مرز اعتماد (Gateway Trust Boundary)
    IF NOT v_is_service_role AND NOT auth.user_has_permission('finance:manage') THEN
        RAISE EXCEPTION 'دسترسی غیرمجاز: اجرای فرآیند استرداد منحصراً توسط سرویس سروری مورد اعتماد (service_role) مجاز است.';
    END IF;

    -- ۲. قفل بدبینانه تراکنش استرداد
    SELECT * INTO v_tx 
    FROM payment_transactions 
    WHERE id = p_refund_transaction_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'تراکنش استرداد مورد نظر یافت نشد.';
    END IF;

    -- ۳. اعتبارسنجی ساختاریافته نوع تراکنش (عدم پذیرش تراکنش خرید اصلی به عنوان استرداد)
    IF v_tx.transaction_type <> 'refund' THEN
        RAISE EXCEPTION 'خطای اعتبارسنجی: تراکنش ارسالی از نوع استرداد (refund) نمی‌باشد (نوع تراکنش: %). تراکنش‌های پرداخت خرید اصلی به هیچ عنوان به عنوان سند استرداد پذیرفته نمی‌شوند.', v_tx.transaction_type;
    END IF;

    -- ۴. اعتبارسنجی ارجاع به تراکنش والد خرید اصلی و بررسی سقف مبلغ استرداد
    IF v_tx.parent_transaction_id IS NULL THEN
        RAISE EXCEPTION 'خطای یکپارچگی: تراکنش استرداد فاقد ارجاع به تراکنش خرید والد (parent_transaction_id) است.';
    END IF;

    SELECT * INTO v_parent_ptx 
    FROM payment_transactions 
    WHERE id = v_tx.parent_transaction_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'تراکنش پرداخت خرید والد یافت نشد.';
    END IF;

    IF v_parent_ptx.transaction_type <> 'payment' OR v_parent_ptx.status <> 'verified' THEN
        RAISE EXCEPTION 'تراکنش والد باید یک پرداخت خرید قطعی و تاییدشده باشد.';
    END IF;

    IF v_tx.amount_toman > v_parent_ptx.amount_toman THEN
        RAISE EXCEPTION 'مبلغ استرداد درخواستی (%) از مبلغ تراکنش اصلی خرید (%) فراتر است.', v_tx.amount_toman, v_parent_ptx.amount_toman;
    END IF;

    -- ۵. اعتبارسنجی پرونده پرداخت و سفارش
    SELECT * INTO v_payment FROM payments WHERE id = v_tx.payment_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'پرونده پرداخت متناظر با این استرداد یافت نشد.';
    END IF;

    SELECT * INTO v_order FROM orders WHERE id = v_payment.order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'سفارش متناظر با این پرونده استرداد یافت نشد.';
    END IF;

    -- ۶. اعتبارسنجی انحصار کلید ضدتکرار به همین تراکنش (Idempotency Key Scoping)
    IF p_idempotency_key IS NOT NULL THEN
        -- الف) بررسی عدم استفاده از این کلید ضدتکرار در هر تراکنش استرداد دیگر
        IF EXISTS (
            SELECT 1 
            FROM payment_transactions 
            WHERE id <> p_refund_transaction_id 
              AND (
                idempotency_key = p_idempotency_key 
                OR raw_response->'refund_attempts' @> jsonb_build_array(jsonb_build_object('idempotency_key', p_idempotency_key))
              )
        ) THEN
            RAISE EXCEPTION 'خطای امنیتی: کلید ضدتکرار ارسالی قبلاً برای یک تراکنش دیگر ثبت شده است.';
        END IF;

        -- ب) بررسی تکرار درخواست روی همین تراکنش: در صورت تکرار کلید، حتی اگر تلاش قبلی شکست خورده باشد،
        -- نباید retry_count افزایش یابد یا تلاش بانکی جدید ایجاد گردد!
        SELECT elem INTO v_existing_attempt 
        FROM jsonb_array_elements(COALESCE(v_tx.raw_response->'refund_attempts', '[]'::jsonb)) AS elem
        WHERE elem->>'idempotency_key' = p_idempotency_key;

        IF v_existing_attempt IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', (v_existing_attempt->>'success')::boolean,
                'status', 'idempotent_duplicate_request',
                'attempt_id', v_existing_attempt->>'attempt_id',
                'retry_count', v_tx.raw_response->>'retry_count',
                'message', 'درخواست با کلید ضدتکرار تکراری دریافت شد؛ نتیجه تلاش پیشین بدون تغییر بازگردانده شد.',
                'original_attempt', v_existing_attempt
            );
        END IF;
    END IF;

    -- ۷. رفتار پایاپای در صورت تایید قبلی کلیت استرداد
    IF v_tx.status = 'verified' AND p_verified_success THEN
        RETURN jsonb_build_object('success', true, 'status', 'already_refunded_verified', 'shaparak_rrn', v_tx.shaparak_rrn);
    END IF;

    -- ۸. پردازش نتیجه تلاش واقعی جدید با شناسه تلاش یکتا و ممیزی‌پذیر (Auditable Attempt ID)
    IF p_verified_success THEN
        v_attempt_record := jsonb_build_object(
            'attempt_id', p_attempt_id,
            'idempotency_key', p_idempotency_key,
            'success', true,
            'timestamp', NOW(),
            'shaparak_rrn', p_gateway_refund_ref
        );

        UPDATE payment_transactions
        SET status = 'verified',
            shaparak_rrn = p_gateway_refund_ref,
            verified_at = NOW(),
            raw_response = jsonb_set(
                COALESCE(raw_response, '{}'::jsonb),
                '{refund_attempts}',
                COALESCE(raw_response->'refund_attempts', '[]'::jsonb) || jsonb_build_array(v_attempt_record)
            ) || jsonb_build_object(
                'refund_verified', true,
                'verified_at', NOW(),
                'recovered_after_failure', (v_tx.status = 'failed'),
                'last_successful_attempt_id', p_attempt_id
            )
        WHERE id = v_tx.id;

        UPDATE payments
        SET status = 'refunded',
            updated_at = NOW()
        WHERE id = v_payment.id;

        UPDATE orders
        SET status = 'refunded',
            admin_notes = COALESCE(admin_notes, '') || ' [استرداد وجه در درگاه بانکی با موفقیت تایید و تسویه شد]',
            updated_at = NOW()
        WHERE id = v_order.id;

        RETURN jsonb_build_object(
            'success', true, 
            'status', CASE WHEN v_tx.status = 'failed' THEN 'refund_recovered_after_failure' ELSE 'refund_completed' END,
            'attempt_id', p_attempt_id,
            'shaparak_rrn', p_gateway_refund_ref
        );
    ELSE
        -- عدم موفقیت در تلاش جدید درگاه؛ افزایش شمارنده تلاش مجدد واقعی
        v_retry_count := COALESCE((v_tx.raw_response->>'retry_count')::int, 0) + 1;

        IF v_retry_count >= 5 THEN
            v_next_retry := NULL;
            v_retry_status := 'manual_finance_intervention_required';
        ELSE
            v_next_retry := NOW() + ((POWER(2, v_retry_count) * 2.5) * INTERVAL '1 minute');
            v_retry_status := 'retry_scheduled';
        END IF;

        v_attempt_record := jsonb_build_object(
            'attempt_id', p_attempt_id,
            'idempotency_key', p_idempotency_key,
            'success', false,
            'timestamp', NOW(),
            'error', p_error_message,
            'retry_count', v_retry_count
        );

        UPDATE payment_transactions
        SET status = 'failed',
            raw_response = jsonb_set(
                COALESCE(raw_response, '{}'::jsonb),
                '{refund_attempts}',
                COALESCE(raw_response->'refund_attempts', '[]'::jsonb) || jsonb_build_array(v_attempt_record)
            ) || jsonb_build_object(
                'refund_error', p_error_message,
                'retry_count', v_retry_count,
                'last_attempt_at', NOW(),
                'next_retry_at', v_next_retry,
                'retry_status', v_retry_status,
                'last_failed_attempt_id', p_attempt_id
            )
        WHERE id = v_tx.id;

        UPDATE payments
        SET status = 'refund_failed',
            updated_at = NOW()
        WHERE id = v_payment.id;

        RETURN jsonb_build_object(
            'success', false,
            'status', 'refund_failed',
            'attempt_id', p_attempt_id,
            'retry_count', v_retry_count,
            'next_retry_at', v_next_retry,
            'action', v_retry_status,
            'error', p_error_message
        );
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION rpc_process_gateway_refund FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION rpc_process_gateway_refund TO service_role;
```

---

## ۵. مرز اعتماد و معماری اعتبارسنجی درگاه بانکی (Gateway Verification Trust Boundary)

> [!CAUTION]
> **مرز اعتماد سخت‌گیرانه سمت سرور (Zero-Trust Caller Architecture):**
> پایگاه داده CNA و توابع مالی آن هرگز صرف ارسال مقدار `p_verified_success = TRUE` توسط یک فراخواننده را به عنوان مدرک اثبات پرداخت یا استرداد تلقی نمی‌کنند. امنیت شبکه پرداخت تابع الزامات زیر است:

1. **انحصار کلید `service_role` به سرورهای پشتیبان امن:**
   کلید محرمانه `SUPABASE_SERVICE_ROLE_KEY` هرگز و تحت هیچ شرایطی نباید در کلاینت، مرورگر وب، باندل‌های جاوااسکریپت یا اپلیکیشن‌های موبایل قرار گیرد. این کلید صرفاً در محیط امن سرورهای پشتیبان (Backend Server یا Supabase Edge Functions) به عنوان متغیر محیطی بارگذاری می‌شود.
2. **اعتبارسنجی واقعی و مستقل پاسخ درگاه توسط سرور:**
   پیش از فراخوانی هریک از روال‌های `rpc_process_gateway_refund` یا `rpc_handle_late_payment_callback` با مقدار `p_verified_success = TRUE`، سرور پشتیبان موظف است چهار گام اعتبارسنجی مستقل را تکمیل نماید:
   - **اعتبارسنجی امضای دیجیتال / HMAC:** بررسی امضای رمزنوشته دریافتی در وب‌هوک با کلید خصوصی شاپرک جهت اطمینان از عدم جعل منشا پیام.
   - **استعلام مستقیم از وب‌سرویس وریفای بانک (Server-to-Bank Mutual Verification):** سرور باید راساً با متد HTTPS/mTLS وب‌سرویس تایید تراکنش درگاه شاپرک (`/verify` یا `/refund/inquiry`) را فراخوانی کرده و نتیجه موفقیت‌آمیز را مستقیماً از سوئیچ بانکی دریافت نماید.
   - **تطابق ۴گانه اقلام تراکنش (4-Way Entity Reconciliation):** سرور باید صحت موارد زیر را تایید کند:
     1. شناسه تراکنش (`authority_token` و `id`) با رکورد پایگاه داده مطابقت داشته باشد.
     2. مبلغ تاییدشده بانکی دقیقاً برابر با `amount_toman` سفارش باشد (جلوگیری از حملات Partial Amount Fraud).
     3. شماره سفارش ارسالی به بانک دقیقاً با `order_id` در جدول سفارشات یکسان باشد.
     4. مرجع بانکی (`shaparak_rrn`) یک رشته معتبر غیرخالی صادرشده توسط شاپرک باشد.
3. **عدم واگذاری تایید پرداخت به کلاینت:**
   هیچ کلاینت کاربری توانایی تایید پرداخت یا نهایی‌سازی سفارش را ندارد و هدایت کاربر به صفحه Callback صرفاً جهت اطلاع‌رسانی است؛ نهایی‌سازی مالی منحصراً از کانال وب‌هوک معتبر سروری صورت می‌پذیرد.
