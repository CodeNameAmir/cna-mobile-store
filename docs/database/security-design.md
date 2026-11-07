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
   توابع حساسی نظیر `rpc_handle_late_payment_callback`، `rpc_initiate_gateway_refund` و `rpc_finalize_gateway_refund` هرگز نباید توسط کاربران عادی احراز هویت شده در دسترس باشند؛ مجوز اجرای آنها منحصراً به `service_role` و نقش‌های مدیریتی خاص محدود شده است.

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

### ۳.۷. جدول دفتر کل تلاش‌های استرداد بانکی (`payment_refund_attempts`)
- **فعال‌سازی سراسری RLS:**
  `ALTER TABLE payment_refund_attempts ENABLE ROW LEVEL SECURITY;`
- **SELECT:**
  - مشتریان عادی (`authenticated`, `anon`): **کاملاً مسدود (DENIED).** هیچ مشتری دسترسی مستقیمی به سوابق لاگ داخلی تلاش‌های وب‌سرویس درگاه، پی‌لودهای بانکی و خطاهای درگاه ندارد.
  - مدیران مالی و حسابرسی: مشاهده سوابق منحصراً با داشتن مجوز `finance:read` یا `finance:manage` (`auth.user_has_permission('finance:read') OR auth.user_has_permission('finance:manage')`).
- **INSERT / UPDATE / DELETE برای کلاینت:**
  - **کاملاً مسدود و ممنوع (DENIED).** هیچ کاربر احراز هویت شده‌ای (`authenticated`) اجازه درج، ویرایش یا حذف مستقیم سطرهای تلاش استرداد را ندارد.
- **تغییرات سروری و مسیرهای مجاز:**
  - کلیه عملیات‌های ثبت تلاش جدید (`initiated`) و به‌روزرسانی نتیجه درگاه (`verified` یا `failed`) منحصراً از طریق توابع پروسیجرال امن پایگاه داده (`SECURITY DEFINER`) با مسیر امن ثابت (`SET search_path = public, pg_temp`) نظیر `rpc_initiate_gateway_refund` و `rpc_finalize_gateway_refund` با کلید امن سروری `service_role` در محیط بک‌اند معتبر انجام می‌پذیرد.
- **مجوزهای پایه جدول (Table Grants & Revocations):**
  ```sql
  REVOKE ALL ON payment_refund_attempts FROM PUBLIC, anon;
  GRANT SELECT ON payment_refund_attempts TO authenticated; -- تحت کنترل کامل RLS
  GRANT ALL ON payment_refund_attempts TO service_role;
  ```
- **سیاست‌های قطعی RLS:**
  ```sql
  -- سیاست خواندن صرفاً برای مدیران مالی مجاز
  CREATE POLICY p_refund_attempts_select_finance ON payment_refund_attempts
      FOR SELECT TO authenticated
      USING (auth.user_has_permission('finance:read') OR auth.user_has_permission('finance:manage'));

  -- سایر عملیات‌ها بدون تعریف سیاست باز بوده و در نتیجه به صورت پیش‌فرض DENY ALL هستند
  ```

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

    -- اعتبارسنجی صریح نوع تراکنش (صرفاً transaction_type = 'payment' مجاز است و استرداد/اصلاحیه یا مقادیر نامعتبر رد می‌شوند)
    IF v_ptx.transaction_type IS NULL OR v_ptx.transaction_type <> 'payment' THEN
        RAISE EXCEPTION 'خطای اعتبارسنجی: نوع تراکنش نامعتبر است (نوع فعلی: %). صرفاً تراکنش‌های خرید اصلی با transaction_type = ''payment'' مجاز به ورود به مسیر بازیابی پرداخت دیرهنگام هستند و تراکنش‌های استرداد (refund) یا اصلاحیه (reversal) اکیداً رد می‌شوند.', COALESCE(v_ptx.transaction_type, 'NULL');
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
            jsonb_build_object('reason', 'order_was_cancelled_prior_to_payment', 'original_tx', p_payment_transaction_id)
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
            jsonb_build_object('reason', 'stock_exhausted_multi_warehouse', 'original_tx', p_payment_transaction_id)
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

#### ۴.۴. چرخه کامل، تکرارپذیر، دومرحله‌ای و پایاپای استرداد وجه (Durable Two-Stage Fault-Tolerant Refund Architecture)

> [!IMPORTANT]
> **گردش‌کار کانونیکال و انحصاری استرداد وجه در CNA Mobile Store:**
> کلیه عملیات‌های استرداد وجه در محیط عملیاتی CNA منحصراً از طریق گردش‌کار دومرحله‌ای تفکیک‌شده اجرا می‌شوند:
> ۱. **مرحله اول (Stage 1 — Durable Reservation & Initiation):** تابع `rpc_initiate_gateway_refund` با اخذ قفل‌های بدبینانه والد، اعتبارسنجی دقیق سقف تجمعی بر اساس تلاش‌های فعال و تاییدشده، درج رکورد در جدول کانونیکال `payment_refund_attempts` با وضعیت `initiated` و کامیت تراکنش پایگاه داده.
> ۲. **مرحله میانی (External Bank Dispatch):** ارسال درخواست HTTP به سوئیچ درگاه بانکی/شاپرک توسط سرور پشتیبان، **خارج از هرگونه تراکنش و قفل پایگاه داده** (جلوگیری مطلق از Connection Pool Exhaustion و بن‌بست‌های سیستمی).
> ۳. **مرحله دوم (Stage 2 — Settlement & Finalization):** تابع `rpc_finalize_gateway_refund` با تطبیق هویت چندگانه و سخت‌گیرانه، دریافت نتیجه قطعی (`verified` یا `failed`) یا پیامد نامشخص (`uncertain`)، و ثبت تغییرات مالی نهایی.
> 
> *قانون انطباق هویت پرداخت و تفکیک مسیرهای پایاپای:*
> - **مسیرهای پردازش اصلی (Non-Idempotent Processing):** در هر دو تابع، الزام انطباق و غیر تهی بودن شناسه پرداخت والد و استرداد (`v_tx.payment_id IS NULL OR v_parent_ptx.payment_id IS NULL OR v_parent_ptx.payment_id IS DISTINCT FROM v_tx.payment_id`) پس از قفل‌گذاری بدبینانه سطرهای تراکنش و والد (`FOR UPDATE`) و پیش از هرگونه رزرو در جدول تلاش‌ها، محاسبه سقف تجمعی یا جهش مالی اعتبارسنجی شده و مقادیر مفقود، NULL یا نامنطبق قاطعانه رد می‌شوند.
> - **مسیرهای بازخوانی تکراری و پایاپای (Verified Idempotent Replays):** در صورت دریافت مجدد درخواستی با کلید ضدتکرار پیشین برای یک تراکنش یا تلاش استرداد که قبلاً با موفقیت تایید (`verified`) شده است، روال‌ها نتیجه پایدار و ذخیره‌شده پیشین را زودهنگام در قالب بازخوانی بدون جهش پایدار داده (**No-Persisted-Mutation Replay**) بازمی‌گردانند. در این مسیرها اگرچه قفل سطری بدبینانه (`FOR UPDATE`) جهت هماهنگی همزمانی تراکنش‌ها اخذ می‌شود، اما هیچ تغییر پایدار مالی یا داده‌ای در پایگاه داده رخ نمی‌دهد: هیچ تلاش جدیدی ثبت نمی‌شود، هیچ سهمیه مازادی رزرو نمی‌گردد، هیچ جهش مالی یا تغییری در مانده کیف پول/سفارش ایجاد نمی‌شود و هیچ استرداد موفقی تکثیر نمی‌گردد. این بازخوانی پیش از بارگذاری والد یا اجرای مجدد اینواریانت پرداخت صورت می‌گیرد.
> 
> *توجه امنیتی بحرانی:* تابع یک‌مرحله‌ای قدیمی `rpc_process_gateway_refund` به دلیل نقض اصل تفکیک مرز تراکنش پایگاه داده و خطر مسدودسازی استخر اتصالات، **به طور کامل غیرفعال و مسدود گردیده (`INCAPACITATED & ACCESS REVOKED`)** است. کلیه مجوزهای اجرای آن از تمام نقش‌ها (از جمله `service_role`، `authenticated` و `PUBLIC`) لغو شده و بدنه آن به صدور خطای صریح محدود شده است. هیچ درخواست استردادی امکان اجرای تک‌مرحله‌ای یا دور زدن چرخه دومرحله‌ای بادوام را ندارد.

```sql
-- ============================================================================
-- تابع مرحله اول: رزرو پایدار سهمیه مالی و ثبت آغاز تلاش استرداد (Stage 1)
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_initiate_gateway_refund(
    p_refund_transaction_id UUID,
    p_idempotency_key VARCHAR,
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
    v_existing_pra RECORD;
    v_attempt_row_id UUID;
    v_other_verified_toman BIGINT;
    v_other_initiated_toman BIGINT;
    v_total_committed_toman BIGINT;
BEGIN
    -- ۱. اعتبارسنجی اجباری بودن کلید ضدتکرار (Mandatory Idempotency Key Validation)
    IF p_idempotency_key IS NULL OR TRIM(p_idempotency_key) = '' THEN
        RAISE EXCEPTION 'خطای اعتبارسنجی: پارامتر کلید ضدتکرار (p_idempotency_key) اجباری است و نمی‌تواند NULL یا خالی باشد.';
    END IF;

    IF p_attempt_id IS NULL THEN
        p_attempt_id := gen_random_uuid();
    END IF;

    -- ۲. کنترل سطح دسترسی سروری و مرز اعتماد (Server-Only Trust Boundary)
    IF NOT v_is_service_role AND NOT auth.user_has_permission('finance:manage') THEN
        RAISE EXCEPTION 'دسترسی غیرمجاز: اجرای فرآیند رزرو و آغاز استرداد منحصراً توسط سرویس سروری مورد اعتماد (service_role) یا مدیر ارشد مالی مجاز است.';
    END IF;

    -- ۳. قفل بدبینانه تراکنش استرداد جاری
    SELECT * INTO v_tx 
    FROM payment_transactions 
    WHERE id = p_refund_transaction_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'تراکنش استرداد مورد نظر یافت نشد.';
    END IF;

    -- ۴. اعتبارسنجی ساختاریافته نوع تراکنش
    IF v_tx.transaction_type IS NULL OR v_tx.transaction_type <> 'refund' THEN
        RAISE EXCEPTION 'خطای اعتبارسنجی: تراکنش ارسالی از نوع استرداد (refund) نمی‌باشد (نوع فعلی: %).', COALESCE(v_tx.transaction_type, 'NULL');
    END IF;

    -- ۵. ممانعت قطعی از تکرار روی تراکنش استرداد تاییدشده (Prevent Replay on Already Verified Refund)
    IF v_tx.status = 'verified' THEN
        SELECT * INTO v_existing_pra
        FROM payment_refund_attempts
        WHERE refund_transaction_id = v_tx.id AND idempotency_key = p_idempotency_key;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'status', 'idempotent_duplicate_request',
                'refund_status', 'already_verified',
                'attempt_id', v_existing_pra.attempt_id,
                'attempt_status', v_existing_pra.status,
                'message', 'تراکنش استرداد قبلاً با همین کلید ضدتکرار با موفقیت تسویه و تایید شده است (پاسخ ذخیره‌شده بازگردانده شد).',
                'original_attempt', jsonb_build_object(
                    'id', v_existing_pra.id,
                    'attempt_id', v_existing_pra.attempt_id,
                    'status', v_existing_pra.status,
                    'completed_at', v_existing_pra.completed_at,
                    'response_payload', v_existing_pra.response_payload
                )
            );
        ELSE
            RAISE EXCEPTION 'خطای امنیتی و مالی: تراکنش استرداد جاری (%) قبلاً با موفقیت تسویه و تایید نهایی شده است (وضعیت verified). امکان پردازش یا آغاز تلاش مجدد با کلید جدید برای تراکنش تاییدشده وجود ندارد.', v_tx.id;
        END IF;
    END IF;

    -- ۶. اعتبارسنجی وضعیت مجاز تراکنش استرداد برای آغاز تلاش
    IF v_tx.status NOT IN ('initiated', 'failed') THEN
        RAISE EXCEPTION 'وضعیت نامعتبر تراکنش استرداد: تراکنش در وضعیت "%" امکان پذیرش تلاش استرداد جدید را ندارد. صرفاً وضعیت‌های initiated و failed مجاز به ثبت تلاش هستند.', v_tx.status;
    END IF;

    -- ۷. اعتبارسنجی و قفل بدبینانه تراکنش خرید والد (Deterministic Lock Ordering)
    IF v_tx.parent_transaction_id IS NULL THEN
        RAISE EXCEPTION 'خطای یکپارچگی ارجاعی: تراکنش استرداد فاقد ارجاع به تراکنش خرید والد (parent_transaction_id) است.';
    END IF;

    SELECT * INTO v_parent_ptx 
    FROM payment_transactions 
    WHERE id = v_tx.parent_transaction_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'تراکنش پرداخت خرید والد یافت نشد.';
    END IF;

    IF v_parent_ptx.transaction_type <> 'payment' OR v_parent_ptx.status <> 'verified' THEN
        RAISE EXCEPTION 'تراکنش والد باید یک پرداخت خرید قطعی و تاییدشده باشد (نوع: %، وضعیت: %).', v_parent_ptx.transaction_type, v_parent_ptx.status;
    END IF;

    -- اعتبارسنجی انطباق هویت پرونده پرداخت تراکنش استرداد و تراکنش خرید والد (Parent & Refund Payment Identity Equality)
    IF v_tx.payment_id IS NULL OR v_parent_ptx.payment_id IS NULL OR v_parent_ptx.payment_id IS DISTINCT FROM v_tx.payment_id THEN
        RAISE EXCEPTION 'خطای یکپارچگی ارجاعی و تطبیق هویت پرداخت: تراکنش استرداد (پرونده پرداخت: %) و تراکنش خرید والد (پرونده پرداخت: %) متعلق به دو پرونده پرداخت متفاوت هستند یا مقدار شناسه پرداخت نامعتبر است.',
            COALESCE(v_tx.payment_id::TEXT, 'NULL'), COALESCE(v_parent_ptx.payment_id::TEXT, 'NULL');
    END IF;

    -- ۸. بررسی مجدد ضدتکرار در جدول کانونیکال تلاش‌ها پس از استقرار قفل والد (Post-Lock Idempotency Check)
    SELECT * INTO v_existing_pra 
    FROM payment_refund_attempts 
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        IF v_existing_pra.refund_transaction_id <> p_refund_transaction_id THEN
            RAISE EXCEPTION 'خطای امنیتی: کلید ضدتکرار ارسالی قبلاً برای تراکنش استرداد دیگری (%) ثبت شده است.', v_existing_pra.refund_transaction_id;
        END IF;

        RETURN jsonb_build_object(
            'success', (v_existing_pra.status = 'verified'),
            'status', 'idempotent_duplicate_request',
            'attempt_id', v_existing_pra.attempt_id,
            'attempt_status', v_existing_pra.status,
            'message', 'درخواست آغاز استرداد با کلید ضدتکرار تکراری دریافت شد؛ رکورد تلاش موجود بازگردانده شد.',
            'original_attempt', jsonb_build_object(
                'id', v_existing_pra.id,
                'attempt_id', v_existing_pra.attempt_id,
                'status', v_existing_pra.status,
                'completed_at', v_existing_pra.completed_at,
                'response_payload', v_existing_pra.response_payload
            )
        );
    END IF;

    -- ۹. محاسبه دقیق سقف تجمعی استرداد و تعهدات فعال پس از تلاش‌های مجدد (Retry-Aware Cumulative Limit Calculation)
    -- دسته ۱: سایر استردادهای تاییدشده والد (داشتن وضعیت verified یا حداقل یک تلاش verified)
    -- دسته ۲: سایر تعهدات فعال جاری والد (فاقد وضعیت verified، اما دارای حداقل یک تلاش در وضعیت initiated، حتی در صورت وجود تلاش‌های failed پیشین)
    -- دسته ۳: مبلغ همین تراکنش استرداد جاری (v_tx.amount_toman)
    -- دسته ۴: تراکنش‌های کاملاً شکست‌خورده (که تمام تلاش‌هایشان failed بوده و هیچ تلاش initiated فعالی ندارند) هیچ تعهدی اضافه نمی‌کنند
    SELECT 
        COALESCE(SUM(CASE 
            WHEN pt.status = 'verified' OR EXISTS (
                SELECT 1 FROM payment_refund_attempts pra 
                WHERE pra.refund_transaction_id = pt.id AND pra.status = 'verified'
            ) THEN pt.amount_toman 
            ELSE 0 
        END), 0),
        COALESCE(SUM(CASE 
            -- شرط عدم تایید قبلی
            WHEN NOT (pt.status = 'verified' OR EXISTS (
                SELECT 1 FROM payment_refund_attempts pra 
                WHERE pra.refund_transaction_id = pt.id AND pra.status = 'verified'
            )) AND (
                -- شرط رزرو فعال جاری: داشتن حداقل یک تلاش در وضعیت initiated (صرف‌نظر از تلاش‌های failed قبلی)
                EXISTS (
                    SELECT 1 FROM payment_refund_attempts pra 
                    WHERE pra.refund_transaction_id = pt.id AND pra.status = 'initiated'
                )
                OR (
                    pt.status = 'initiated' AND NOT EXISTS (
                        SELECT 1 FROM payment_refund_attempts pra 
                        WHERE pra.refund_transaction_id = pt.id
                    )
                )
            ) THEN pt.amount_toman 
            ELSE 0 
        END), 0)
    INTO v_other_verified_toman, v_other_initiated_toman
    FROM payment_transactions pt
    WHERE pt.parent_transaction_id = v_parent_ptx.id
      AND pt.transaction_type = 'refund'
      AND pt.id <> v_tx.id;

    v_total_committed_toman := v_other_verified_toman + v_other_initiated_toman;

    -- بررسی اینکه مجموع تعهدات قبلی به اضافه مبلغ استرداد فعلی از کل مبلغ پرداخت اصلی فراتر نرود
    IF (v_total_committed_toman + v_tx.amount_toman) > v_parent_ptx.amount_toman THEN
        RAISE EXCEPTION 'تخطی از سقف استرداد: مجموع استردادهای تاییدشده قبلی (%) و تعهدات فعال جاری (%) به همراه مبلغ استرداد فعلی (%) از کل مبلغ پرداخت اصلی (%) فراتر می‌رود.',
            v_other_verified_toman, v_other_initiated_toman, v_tx.amount_toman, v_parent_ptx.amount_toman;
    END IF;

    -- ۱۰. اعتبارسنجی پرونده پرداخت و سفارش
    SELECT * INTO v_payment FROM payments WHERE id = v_tx.payment_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'پرونده پرداخت متناظر با این استرداد یافت نشد.';
    END IF;

    SELECT * INTO v_order FROM orders WHERE id = v_payment.order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'سفارش متناظر با این پرونده استرداد یافت نشد.';
    END IF;

    -- ۱۱. درج تلاش جدید در وضعیت initiated با مدیریت دقیق خطای برخورد یکتایی (Strict unique_violation Trap)
    BEGIN
        INSERT INTO payment_refund_attempts (
            refund_transaction_id,
            attempt_id,
            idempotency_key,
            status,
            request_payload,
            created_at
        ) VALUES (
            v_tx.id,
            p_attempt_id,
            p_idempotency_key,
            'initiated',
            jsonb_build_object(
                'amount_toman', v_tx.amount_toman,
                'gateway', v_tx.gateway,
                'parent_transaction_id', v_parent_ptx.id,
                'payment_id', v_payment.id,
                'order_id', v_order.id,
                'initiated_at', NOW()
            ),
            NOW()
        ) RETURNING id INTO v_attempt_row_id;
    EXCEPTION WHEN unique_violation THEN
        -- الف) بررسی اینکه آیا برخورد به دلیل کلید ضدتکرار (idempotency_key) بوده است؟
        SELECT * INTO v_existing_pra
        FROM payment_refund_attempts
        WHERE idempotency_key = p_idempotency_key;

        IF FOUND THEN
            -- بررسی تعلق قطعی کلید به همین تراکنش استرداد (ممانعت از سرقت کلید بین دو تراکنش مختلف)
            IF v_existing_pra.refund_transaction_id <> v_tx.id THEN
                RAISE EXCEPTION 'خطای امنیتی و مالی: کلید ضدتکرار ارسالی (%) پیش‌تر برای تراکنش استرداد دیگری (%) ثبت شده است و امکان استفاده از آن برای تراکنش % وجود ندارد.',
                    p_idempotency_key, v_existing_pra.refund_transaction_id, v_tx.id;
            END IF;

            -- کلید متعلق به همین تراکنش است: بازگرداندن ایمن رکورد تلاش موجود
            RETURN jsonb_build_object(
                'success', (v_existing_pra.status = 'verified'),
                'status', 'idempotent_duplicate_request',
                'attempt_id', v_existing_pra.attempt_id,
                'attempt_status', v_existing_pra.status,
                'message', 'درخواست همزمان با کلید ضدتکرار یکسان شناسایی و مهار شد (Unique Violation Handled). رکورد تلاش موجود بازگردانده شد.',
                'original_attempt', jsonb_build_object(
                    'id', v_existing_pra.id,
                    'attempt_id', v_existing_pra.attempt_id,
                    'status', v_existing_pra.status,
                    'completed_at', v_existing_pra.completed_at,
                    'response_payload', v_existing_pra.response_payload
                )
            );
        ELSE
            -- ب) برخورد روی کلید ضدتکرار نبوده (مثلاً برخورد غیرمنتظره روی attempt_id یا سایر قیدها)
            -- تفکیک خطای یکتایی نامرتبط از خطای ضدتکرار و ممانعت از گزارش نادرست به عنوان تلاش تکراری موفق
            RAISE EXCEPTION 'خطای یکتایی سخت‌افزاری در جدول تلاش‌های استرداد (شناسه تلاش تکراری یا نقض قید یکتایی نامرتبط): %', SQLERRM;
        END IF;
    END;

    -- ۱۲. ثبت رزرو پایدار در payment_transactions
    UPDATE payment_transactions
    SET status = 'initiated',
        raw_response = COALESCE(raw_response, '{}'::jsonb) || jsonb_build_object(
            'last_attempt_id', p_attempt_id,
            'last_attempt_status', 'initiated',
            'last_initiated_at', NOW()
        )
    WHERE id = v_tx.id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'initiated_reserved',
        'attempt_id', p_attempt_id,
        'refund_transaction_id', v_tx.id,
        'amount_toman', v_tx.amount_toman,
        'other_verified_toman', v_other_verified_toman,
        'other_initiated_toman', v_other_initiated_toman,
        'total_committed_toman', v_total_committed_toman + v_tx.amount_toman,
        'parent_amount_toman', v_parent_ptx.amount_toman,
        'message', 'رزرو مالی استرداد با موفقیت در پایگاه داده کامیت شد. اکنون وب‌سرویس درگاه بانکی بدون نگه‌داشتن قفل‌های دیتابیس قابل فراخوانی است.'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION rpc_initiate_gateway_refund FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION rpc_initiate_gateway_refund TO service_role;

-- ============================================================================
-- تابع مرحله دوم: ثبت نتیجه و نهایی‌سازی تسویه با تطبیق هویت ۶گانه (Stage 2)
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_finalize_gateway_refund(
    p_refund_transaction_id UUID,
    p_attempt_id UUID,
    p_idempotency_key VARCHAR,
    p_gateway_refund_ref VARCHAR,
    p_outcome_status VARCHAR, -- 'verified', 'failed', 'uncertain'
    p_error_message TEXT DEFAULT NULL
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
    v_pra RECORD;
    v_previous_verified_toman BIGINT;
    v_cumulative_refunded_toman BIGINT;
    v_retry_count INT;
    v_next_retry TIMESTAMPTZ;
    v_retry_status VARCHAR;
    v_target_status VARCHAR;
    v_note TEXT;
BEGIN
    -- ۱. کنترل سطح دسترسی سروری و مرز اعتماد
    IF NOT v_is_service_role AND NOT auth.user_has_permission('finance:manage') THEN
        RAISE EXCEPTION 'دسترسی غیرمجاز: نهایی‌سازی استرداد منحصراً توسط service_role یا مدیر مالی مجاز است.';
    END IF;

    -- ۲. اعتبارسنجی مقادیر پارامترهای ورودی
    IF p_refund_transaction_id IS NULL THEN
        RAISE EXCEPTION 'خطای اعتبارسنجی: شناسه تراکنش استرداد (p_refund_transaction_id) اجباری است.';
    END IF;

    IF p_attempt_id IS NULL THEN
        RAISE EXCEPTION 'خطای اعتبارسنجی: شناسه تلاش استرداد (p_attempt_id) اجباری است.';
    END IF;

    IF p_idempotency_key IS NULL OR TRIM(p_idempotency_key) = '' THEN
        RAISE EXCEPTION 'خطای اعتبارسنجی: کلید ضدتکرار (p_idempotency_key) اجباری است و نمی‌تواند خالی باشد.';
    END IF;

    IF p_outcome_status NOT IN ('verified', 'failed', 'uncertain') THEN
        RAISE EXCEPTION 'وضعیت نهایی‌سازی نامعتبر است. مقادیر مجاز: verified, failed, uncertain';
    END IF;

    IF p_outcome_status = 'verified' AND (p_gateway_refund_ref IS NULL OR TRIM(p_gateway_refund_ref) = '') THEN
        RAISE EXCEPTION 'خطای اعتبارسنجی: ثبت وضعیت تایید قطعی (verified) مستلزم ارائه کد پیگیری معتبر شاپرک/درگاه (p_gateway_refund_ref) است.';
    END IF;

    -- ۳. تطبیق هویت سخت‌گیرانه شرط ۱: بارگذاری و قفل بدبینانه رکورد تلاش در جدول کانونیکال
    SELECT * INTO v_pra
    FROM payment_refund_attempts
    WHERE attempt_id = p_attempt_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'خطای تطبیق هویت: رکورد تلاش استرداد با شناسه تلاش % یافت نشد.', p_attempt_id;
    END IF;

    -- تطبیق هویت شرط ۲: تعلق قطعی تلاش به تراکنش استرداد اعلامی
    IF v_pra.refund_transaction_id <> p_refund_transaction_id THEN
        RAISE EXCEPTION 'خطای امنیتی و تطبیق هویت: شناسه تلاش (%) متعلق به تراکنش استرداد دیگری است و با شناسه تراکنش اعلامی (%) همخوانی ندارد.',
            p_attempt_id, p_refund_transaction_id;
    END IF;

    -- تطبیق هویت شرط ۳: انطباق دقیق کلید ضدتکرار با کلید ثبت‌شده در تلاش
    IF v_pra.idempotency_key <> p_idempotency_key THEN
        RAISE EXCEPTION 'خطای امنیتی و عدم انطباق کلید ضدتکرار: کلید ضدتکرار ارسالی (%) با کلید ضدتکرار ثبت‌شده برای این تلاش (%) همخوانی ندارد.',
            p_idempotency_key, v_pra.idempotency_key;
    END IF;

    -- رفتار ایمن در برابر درخواست‌های نهایی‌سازی مکرر (Safe Duplicate Finalization)
    IF v_pra.status = 'verified' THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'already_finalized',
            'attempt_id', v_pra.attempt_id,
            'refund_transaction_id', v_pra.refund_transaction_id,
            'attempt_status', v_pra.status,
            'message', 'این تلاش استرداد قبلاً با موفقیت نهایی و تسویه شده است. هیچ عملیات مالی مجددی اعمال نگردید.',
            'original_attempt', jsonb_build_object(
                'id', v_pra.id,
                'attempt_id', v_pra.attempt_id,
                'status', v_pra.status,
                'completed_at', v_pra.completed_at,
                'response_payload', v_pra.response_payload
            )
        );
    END IF;

    -- تطبیق هویت شرط ۴: بارگذاری و قفل بدبینانه تراکنش استرداد
    SELECT * INTO v_tx
    FROM payment_transactions
    WHERE id = p_refund_transaction_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'خطای تطبیق هویت: تراکنش استرداد با شناسه % در پایگاه داده یافت نشد.', p_refund_transaction_id;
    END IF;

    IF v_tx.transaction_type IS NULL OR v_tx.transaction_type <> 'refund' THEN
        RAISE EXCEPTION 'خطای اعتبارسنجی: نوع تراکنش ارجاع‌شده (%s) استرداد (refund) نمی‌باشد.', COALESCE(v_tx.transaction_type, 'NULL');
    END IF;

    -- تطبیق هویت شرط ۵: اعتبارسنجی و قفل تراکنش خرید والد
    IF v_tx.parent_transaction_id IS NULL THEN
        RAISE EXCEPTION 'خطای یکپارچگی: تراکنش استرداد فاقد شناسه تراکنش خرید والد (parent_transaction_id) است.';
    END IF;

    SELECT * INTO v_parent_ptx 
    FROM payment_transactions 
    WHERE id = v_tx.parent_transaction_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'خطای یکپارچگی: تراکنش خرید والد با شناسه % یافت نشد.', v_tx.parent_transaction_id;
    END IF;

    IF v_parent_ptx.transaction_type <> 'payment' OR v_parent_ptx.status <> 'verified' THEN
        RAISE EXCEPTION 'خطای یکپارچگی والد: تراکنش خرید والد باید یک پرداخت قطعی و تاییدشده باشد (نوع: %، وضعیت: %).',
            v_parent_ptx.transaction_type, v_parent_ptx.status;
    END IF;

    -- تطبیق هویت شرط ۶: انطباق دقیق هویت پرونده پرداخت تراکنش استرداد با تراکنش خرید والد (Parent & Refund Payment Identity Equality)
    IF v_tx.payment_id IS NULL OR v_parent_ptx.payment_id IS NULL OR v_parent_ptx.payment_id IS DISTINCT FROM v_tx.payment_id THEN
        RAISE EXCEPTION 'خطای یکپارچگی ارجاعی و تطبیق هویت پرداخت: تراکنش استرداد (پرونده پرداخت: %) و تراکنش خرید والد (پرونده پرداخت: %) متعلق به دو پرونده پرداخت متفاوت هستند یا مقدار شناسه پرداخت نامعتبر است.',
            COALESCE(v_tx.payment_id::TEXT, 'NULL'), COALESCE(v_parent_ptx.payment_id::TEXT, 'NULL');
    END IF;

    -- تطبیق هویت شرط ۷: اعتبارسنجی و قفل پرونده پرداخت و سفارش متناظر
    IF v_tx.payment_id IS NULL THEN
        RAISE EXCEPTION 'خطای یکپارچگی: تراکنش استرداد فاقد ارجاع به پرونده پرداخت (payment_id) است.';
    END IF;

    SELECT * INTO v_payment 
    FROM payments 
    WHERE id = v_tx.payment_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'خطای یکپارچگی: پرونده پرداخت متناظر با تراکنش استرداد یافت نشد.';
    END IF;

    SELECT * INTO v_order 
    FROM orders 
    WHERE id = v_payment.order_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'خطای یکپارچگی: سفارش متناظر با پرونده پرداخت استرداد یافت نشد.';
    END IF;

    -- ۴. پردازش بر اساس پیامد بانکی
    IF p_outcome_status = 'verified' THEN
        -- الف) تایید قطعی موفقیت استرداد در درگاه بانکی
        UPDATE payment_refund_attempts
        SET status = 'verified',
            response_payload = jsonb_build_object(
                'shaparak_rrn', p_gateway_refund_ref,
                'verified', true,
                'verified_at', NOW()
            ),
            completed_at = NOW()
        WHERE id = v_pra.id;

        UPDATE payment_transactions
        SET status = 'verified',
            shaparak_rrn = p_gateway_refund_ref,
            verified_at = NOW(),
            raw_response = COALESCE(raw_response, '{}'::jsonb) || jsonb_build_object(
                'last_attempt_id', p_attempt_id,
                'last_attempt_status', 'verified',
                'shaparak_rrn', p_gateway_refund_ref,
                'verified_at', NOW(),
                'recovered_after_failure', (v_tx.status = 'failed')
            )
        WHERE id = v_tx.id;

        -- محاسبه مجموع استردادهای تاییدشده والد
        SELECT COALESCE(SUM(pt.amount_toman), 0)
        INTO v_cumulative_refunded_toman
        FROM payment_transactions pt
        WHERE pt.parent_transaction_id = v_parent_ptx.id
          AND pt.transaction_type = 'refund'
          AND pt.status = 'verified';

        IF v_cumulative_refunded_toman >= v_parent_ptx.amount_toman THEN
            v_target_status := 'refunded';
            v_note := ' [استرداد کامل وجه در درگاه بانکی تسویه شد: ' || v_cumulative_refunded_toman::TEXT || ' تومان]';
        ELSE
            v_target_status := 'partially_refunded';
            v_note := ' [استرداد جزئی وجه در درگاه بانکی تسویه شد: ' || v_cumulative_refunded_toman::TEXT || ' از ' || v_parent_ptx.amount_toman::TEXT || ' تومان تسویه شده]';
        END IF;

        UPDATE payments
        SET status = v_target_status,
            updated_at = NOW()
        WHERE id = v_payment.id;

        UPDATE orders
        SET status = v_target_status,
            admin_notes = COALESCE(admin_notes, '') || v_note,
            updated_at = NOW()
        WHERE id = v_order.id;

        RETURN jsonb_build_object(
            'success', true,
            'status', v_target_status,
            'is_partial', (v_cumulative_refunded_toman < v_parent_ptx.amount_toman),
            'cumulative_refunded_toman', v_cumulative_refunded_toman,
            'parent_total_toman', v_parent_ptx.amount_toman,
            'attempt_id', p_attempt_id,
            'shaparak_rrn', p_gateway_refund_ref
        );

    ELSIF p_outcome_status = 'failed' THEN
        -- ب) شکست قطعی درگاه: ثبت در دفتر کل کانونیکال و آزادسازی سهمیه رزرو برای این تلاش
        UPDATE payment_refund_attempts
        SET status = 'failed',
            response_payload = jsonb_build_object(
                'error', p_error_message,
                'verified', false,
                'failed_at', NOW()
            ),
            completed_at = NOW()
        WHERE id = v_pra.id;

        SELECT COUNT(*) INTO v_retry_count
        FROM payment_refund_attempts
        WHERE refund_transaction_id = v_tx.id;

        IF v_retry_count >= 5 THEN
            v_next_retry := NULL;
            v_retry_status := 'manual_finance_intervention_required';
        ELSE
            v_next_retry := NOW() + ((POWER(2, v_retry_count) * 2.5) * INTERVAL '1 minute');
            v_retry_status := 'retry_scheduled';
        END IF;

        UPDATE payment_transactions
        SET status = 'failed',
            raw_response = COALESCE(raw_response, '{}'::jsonb) || jsonb_build_object(
                'last_attempt_id', p_attempt_id,
                'last_attempt_status', 'failed',
                'refund_error', p_error_message,
                'retry_count', v_retry_count,
                'last_attempt_at', NOW(),
                'next_retry_at', v_next_retry,
                'retry_status', v_retry_status
            )
        WHERE id = v_tx.id;

        -- بررسی تراز پیشین: اگر قبلاً بخشی از سفارش مسترد شده باشد وضعیت partially_refunded حفظ می‌شود
        SELECT COALESCE(SUM(pt.amount_toman), 0)
        INTO v_previous_verified_toman
        FROM payment_transactions pt
        WHERE pt.parent_transaction_id = v_parent_ptx.id
          AND pt.transaction_type = 'refund'
          AND pt.status = 'verified';

        IF v_previous_verified_toman > 0 THEN
            UPDATE payments SET status = 'partially_refunded', updated_at = NOW() WHERE id = v_payment.id;
            UPDATE orders SET status = 'partially_refunded', updated_at = NOW() WHERE id = v_order.id;
        ELSE
            UPDATE payments SET status = 'refund_failed', updated_at = NOW() WHERE id = v_payment.id;
        END IF;

        RETURN jsonb_build_object(
            'success', false,
            'status', 'refund_failed',
            'attempt_id', p_attempt_id,
            'retry_count', v_retry_count,
            'next_retry_at', v_next_retry,
            'action', v_retry_status,
            'error', p_error_message
        );

    ELSE -- 'uncertain' (خطای شبکه، تایم‌اوت نامشخص بانک)
        -- ج) وضعیت نامشخص: حفظ وضعیت initiated در جدول تلاش‌ها جهت عدم آزادسازی نابجای سقف مالی تا زمان استعلام
        UPDATE payment_refund_attempts
        SET status = 'initiated',
            response_payload = COALESCE(response_payload, '{}'::jsonb) || jsonb_build_object(
                'uncertainty_flag', true,
                'last_inquiry_error', p_error_message,
                'reconciliation_required', true,
                'uncertain_at', NOW()
            )
        WHERE id = v_pra.id;

        UPDATE payment_transactions
        SET status = 'initiated',
            raw_response = COALESCE(raw_response, '{}'::jsonb) || jsonb_build_object(
                'last_attempt_id', p_attempt_id,
                'status', 'reconciliation_pending',
                'warning', 'پاسخ نامشخص از درگاه بانکی. سهمیه رزرو برای جلوگیری از Double Refund تا استعلام قطعی حفظ شد.'
            )
        WHERE id = v_tx.id;

        RETURN jsonb_build_object(
            'success', false,
            'status', 'reconciliation_required',
            'attempt_id', p_attempt_id,
            'message', 'پاسخ درگاه بانکی نامشخص بود؛ رزرو سهمیه جهت پیشگیری از خطای مالی حفظ شد و کار پیش‌زمینه استعلام مجدد فعال گردید.'
        );
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION rpc_finalize_gateway_refund FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION rpc_finalize_gateway_refund TO service_role;

-- ============================================================================
-- [INCAPACITATED / DEPRECATED] روال منسوخ‌شده و غیرفعال استرداد تک‌مرحله‌ای (Revoked & Disabled)
-- ============================================================================
-- هشدار معماری و امنیتی: این تابع به دلیل نقض مرز اعتماد، ایجاد قفل‌های باز در طول فراخوانی شبکه و
-- آسیب‌پذیری ناشی از اجرای تک‌مرحله‌ای در دیتابیس، به طور کامل غیرفعال و بدنه اجرایی آن مسدود شده است.
-- تمام مجوزهای اجرایی آن لغو گردیده و اجرای آن توسط هر نقشی (حتی service_role) با خطای صریح متوقف می‌شود.
-- گردش‌کار رسمی، کانونیکال و انحصاری استرداد وجه منحصراً به صورت چرخه دومرحله‌ای بادوام اجرا می‌گردد:
-- ۱. rpc_initiate_gateway_refund (رزرو سهمیه مالی و ثبت تلاش با کامیت فوری در دیتابیس)
-- ۲. ارسال درخواست به وب‌سرویس بانک خارج از تراکنش دیتابیس (External HTTP Dispatch via Backend)
-- ۳. rpc_finalize_gateway_refund (نهایی‌سازی قطعی وضعیت مالی بر اساس پیامد دریافتی از شاپرک/درگاه)
CREATE OR REPLACE FUNCTION rpc_process_gateway_refund(
    p_refund_transaction_id UUID,
    p_gateway_refund_ref VARCHAR,
    p_verified_success BOOLEAN,
    p_idempotency_key VARCHAR,
    p_error_message TEXT DEFAULT NULL,
    p_attempt_id UUID DEFAULT gen_random_uuid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'عملیات غیرمجاز: روال یک‌مرحله‌ای rpc_process_gateway_refund به طور کامل غیرفعال و مسدود شده است. فرآیند استرداد وجه منحصراً باید از طریق چرخه دومرحله‌ای تفکیک‌شده (rpc_initiate_gateway_refund -> فراخوانی وب‌سرویس بانک خارج از دیتابیس -> rpc_finalize_gateway_refund) اجرا گردد.';
END;
$$;

REVOKE ALL ON FUNCTION rpc_process_gateway_refund FROM PUBLIC, authenticated, service_role;
```

---

## ۵. مرز اعتماد و معماری اعتبارسنجی درگاه بانکی (Gateway Verification Trust Boundary)

> [!CAUTION]
> **مرز اعتماد سخت‌گیرانه سمت سرور (Zero-Trust Caller Architecture):**
> پایگاه داده CNA و توابع مالی آن هرگز صرف ارسال مقدار `p_verified_success = TRUE` توسط یک فراخواننده را به عنوان مدرک اثبات پرداخت یا استرداد تلقی نمی‌کنند. امنیت شبکه پرداخت تابع الزامات زیر است:

1. **انحصار کلید `service_role` به سرورهای پشتیبان امن:**
   کلید محرمانه `SUPABASE_SERVICE_ROLE_KEY` هرگز و تحت هیچ شرایطی نباید در کلاینت، مرورگر وب، باندل‌های جاوااسکریپت یا اپلیکیشن‌های موبایل قرار گیرد. این کلید صرفاً در محیط امن سرورهای پشتیبان (Backend Server یا Supabase Edge Functions) به عنوان متغیر محیطی بارگذاری می‌شود.
2. **تفکیک مفاهیم رمزنگاری و اعتبارسنجی امن وب‌هوک و تراکنش (Cryptographic Boundary):**
   در طراحی معماری مستقل از ارائه‌دهنده (Provider-Agnostic)، مکانیزم‌های امنیتی مختلفی در لایه‌های گوناگون ارتباطی فعال هستند که باید به دقت از یکدیگر تفکیک شوند:
   - **کد اصالت‌سنجی پیام بر پایه درهم‌سازی و کلید محرمانه مشترک (HMAC via Shared Secret):**
     در وب‌هوک‌ها یا پیام‌های دریافتی از درگاه که از الگوریتم HMAC (نظیر HMAC-SHA256) استفاده می‌کنند، امضا بر پایه یک **کلید محرمانه مشترک (Shared Secret)** متقارن که پیش‌تر میان پذیرنده و ارائه‌دهنده درگاه مبادله شده است، محاسبه و راستی‌آزمایی می‌شود؛ نه با کلید خصوصی/عمومی.
   - **امضای دیجیتال نامتقارن (Asymmetric Digital Signatures via Public/Private Keys):**
     در صورتی که ارائه‌دهنده‌ای از امضای دیجیتال نامتقارن (مانند RSA یا ECDSA) استفاده کند، امضا با کلید خصوصی فرستنده تولید شده و سرور با کلید عمومی معتبر ارائه‌دهنده آن را اعتبارسنجی می‌کند.
   - **امنیت لایه انتقال و گواهی دیجیتال (TLS / mTLS with Digital Certificates):**
     کلیه ارتباطات شبکه بر بستر HTTPS رمزگذاری شده و هویت طرفین از طریق زنجیره گواهی دیجیتال (X.509 PKI) احراز می‌شود. درگاه‌هایی که نیازمند تایید متقابل هویت ماشین‌به‌ماشین هستند از احراز هویت دوجانبه TLS (mTLS) بهره می‌برند.
   - **استعلام مستقیم از وب‌سرویس وریفای بانک (Direct Server-to-Bank Verification):**
     صرف دریافت وب‌هوک یا کالبک برای نهایی‌سازی مالی کافی نیست. سرور پشتیبان موظف است راساً و بدون واسطه، متد استعلام و تایید تراکنش درگاه (`/verify` یا `/refund/inquiry`) را از کانال امن فراخوانی کند و پاسخ قطعی موفقیت را مستقیماً از سوئیچ بانکی دریافت نماید.
3. **تطابق ۴گانه اقلام تراکنش (4-Way Entity Reconciliation):**
   سرور پشتیبان پیش از فراخوانی توابع RPC پایگاه داده، باید صحت ۴ مولفه اساسی زیر را تطبیق دهد:
   1. **شناسه تراکنش:** مطابقت شناسه تراکنش ارسالی و `authority_token` با رکورد پایگاه داده.
   2. **مبلغ مالی:** انطباق دقیق مبلغ تاییدشده درگاه با ستون `amount_toman` سفارش/استرداد (جلوگیری از کلاهبرداری استرداد یا پرداخت جزئی جعلی).
   3. **شماره سفارش:** انطباق شماره فاکتور یا مرجع سفارش ارسالی به درگاه با `order_id` در جدول `orders`.
   4. **کد پیگیری معتبر (RRN):** دریافت و ثبت شناسه ارجاع رسمی و غیرخالی بانکی (مانند شماره مرجع شاپرک یا لاگ درگاه).
4. **عدم واگذاری تایید پرداخت به کلاینت:**
   هیچ کلاینت کاربری توانایی تایید پرداخت یا نهایی‌سازی سفارش را ندارد و هدایت کاربر به صفحه Callback صرفاً جهت اطلاع‌رسانی به رابط کاربری است؛ نهایی‌سازی وضعیت مالی منحصراً از کانال وب‌هوک معتبر سروری یا کال‌بک مدیریت‌شده سرور صورت می‌پذیرد.
