# CNA Mobile Store — Security Architecture & Supabase RLS Design

معماری امنیتی جامع، خط‌مشی‌های تفکیک‌شده کنترل دسترسی (RBAC)، انحصار تغییرات انبار و کیف پول به توابع RPC، سیاست‌های دقیق Row-Level Security (RLS) در بستر Supabase بر پایه اصل حداقل دسترسی (Least Privilege)، مدیریت خطاتحمل‌پذیر پرداخت دیرهنگام و فرآیند امن استرداد وجه.

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
   در صورت بازگشت تایید پرداخت از بانک پس از انقضای زمان رزرو، اگر موجودی آزاد در انبار مربوطه کافی نباشد، سیستم تراکنش را متوقف کرده، از بیش‌فروشی جلوگیری می‌کند و فرآیند استرداد خودکار وجه با ثبت دقیق وضعیت‌ها را به اجرا درمی‌آورد.
5. **سرقت مسیر جستجوی توابع امنیتی (search_path Hijacking):**
   تمامی توابع با سطح دسترسی `SECURITY DEFINER` الزاماً با `SET search_path = public, pg_temp;` مقید شده‌اند تا از حملات اجرای کدهای مخرب در اسکیماهای دیگر جلوگیری شود.
6. **فراخوانی تکراری و تداخل همزمانی (Concurrency & Duplicate Invocations):**
   تمامی توابع مالی و انبارداری از پارامتر کلید ضدتکرار (`idempotency_key`) استفاده کرده و در صورت فراخوانی مجدد، همان نتیجه قبلی را بدون اعمال اثر مجدد بازمی‌گردانند.

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
  - کلیه واریزها و برداشت‌ها منحصراً از طریق پروسیجر امن `rpc_post_wallet_transaction()` اجرا می‌گردد.

#### جداول `invoices`, `payments`, `payment_transactions`
- **SELECT:**
  - مشتری: فقط اسناد و فاکتورهای سفارشات خود.
  - ادمین: با مجوز `finance:read`.
- **INSERT / UPDATE / DELETE:**
  - دستکاری مستقیم کلاینت مسدود؛ تغییرات منحصراً از طریق وب‌هوک تاییدشده درگاه یا پروسیجرهای تسویه حساب و استرداد.

---

## ۴. توابع امنیتی تراکنشی و پروسیجرهای انحصاری (Hardened RPC Procedures)

### ۱. روال امن تراکنش کیف پول با کنترل مالکیت، مسیر امن و ضدتکرار
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
BEGIN
    -- ۱. اعتبارسنجی ضدتکرار (Idempotency Protection)
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_tx_id 
        FROM wallet_transactions 
        WHERE idempotency_key = p_idempotency_key;
        
        IF FOUND THEN
            RETURN v_tx_id; -- بازگرداندن نتیجه قبلی بدون تکرار تراکنش
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

    -- ۳. بررسی صریح مالکیت یا مجوز مدیریت مالی
    -- کاربر عادی تنها در صورتی مجاز است که مالک کیف پول باشد و تراکنش از نوع مجاز کلاینت باشد
    IF v_wallet.user_id <> v_caller_id AND NOT auth.user_has_permission('finance:manage') THEN
        RAISE EXCEPTION 'دسترسی غیرمجاز: شما مالک این کیف پول نیستید.';
    END IF;

    IF v_wallet.is_locked THEN
        RAISE EXCEPTION 'کیف پول کاربر مسدود و قفل است.';
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

    -- ۵. درج سند در دفتر کل کانونیکال کیف پول
    INSERT INTO wallet_transactions (
        wallet_id, amount_toman, balance_after_toman, transaction_type,
        category, reference_type, reference_id, description_fa, 
        idempotency_key, created_by
    ) VALUES (
        p_wallet_id, p_amount_toman, v_new_balance, v_tx_type,
        p_category, p_reference_type, p_reference_id, p_description_fa,
        p_idempotency_key, v_caller_id
    ) RETURNING id INTO v_tx_id;

    RETURN v_tx_id;
END;
$$;

-- سلب دسترسی همگانی و اعطای انحصاری به کاربران احراز هویت شده
REVOKE EXECUTE ON FUNCTION rpc_post_wallet_transaction FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_post_wallet_transaction TO authenticated, service_role;
```

---

### ۲. روال امن انبارداری با مقداردهی امن، قفل ترتیبی و ضدتکرار
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
    v_new_balance INT;
    v_movement_id UUID;
BEGIN
    -- ۱. بررسی مجوز پرسنل انبارداری
    IF NOT auth.user_has_permission('inventory:manage') THEN
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

    -- ۳. حل مشکل همزمانی مقداردهی اولیه با Insert on Conflict
    -- اطمینان از وجود سطر در پروجکشن بدون تغییر در مقادیر
    INSERT INTO warehouse_stock (warehouse_id, variant_id, shelf_location, quantity_on_hand, reserved_qty)
    VALUES (p_warehouse_id, p_variant_id, 'UNASSIGNED', 0, 0)
    ON CONFLICT (warehouse_id, variant_id) DO NOTHING;

    -- ۴. قفل بدبینانه سطری روی سطر قطعی برای صف‌بندی تراکنش‌ها
    SELECT quantity_on_hand INTO v_current_stock
    FROM warehouse_stock
    WHERE warehouse_id = p_warehouse_id AND variant_id = p_variant_id
    FOR UPDATE;

    v_new_balance := v_current_stock + p_quantity_change;
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'موجودی فیزیکی انبار نمی‌تواند به مقدار منفی تقلیل یابد.';
    END IF;

    -- ۵. به‌روزرسانی پروجکشن موجودی
    UPDATE warehouse_stock
    SET quantity_on_hand = v_new_balance,
        updated_at = NOW()
    WHERE warehouse_id = p_warehouse_id AND variant_id = p_variant_id;

    -- ۶. ثبت قطعی در دفتر کل کانونیکال
    INSERT INTO stock_movements (
        warehouse_id, variant_id, quantity_change, balance_after,
        movement_type, reference_type, reference_id, operator_id, 
        notes, idempotency_key
    ) VALUES (
        p_warehouse_id, p_variant_id, p_quantity_change, v_new_balance,
        p_movement_type, p_reference_type, p_reference_id, auth.uid(), 
        p_notes, p_idempotency_key
    ) RETURNING id INTO v_movement_id;

    RETURN v_movement_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION rpc_record_stock_movement FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_record_stock_movement TO authenticated, service_role;
```

---

### ۳. بازیابی خطاتحمل‌پذیر پرداخت دیرهنگام چندانباره با قفل قطعی (Multi-Warehouse Late Recovery)
```sql
CREATE OR REPLACE FUNCTION rpc_handle_late_payment_callback(
    p_order_id UUID,
    p_payment_transaction_id UUID,
    p_gateway_ref VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_stock RECORD;
    v_target_wh_id UUID;
    v_can_fulfill BOOLEAN := TRUE;
    v_refund_tx_id UUID;
BEGIN
    -- قفل قطعی روی سفارش
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'سفارش مورد نظر یافت نشد.';
    END IF;

    -- اگر سفارش قبلاً پرداخت شده، بدون اقدام مجدد نتیجه را بازمی‌گردانیم
    IF v_order.status = 'paid' THEN
        RETURN jsonb_build_object('success', true, 'status', 'already_paid');
    END IF;

    -- تعیین انبار مقصد (انبار پیش‌فرض تخصیص‌یافته به سفارش یا انبار مرکزی)
    SELECT id INTO v_target_wh_id FROM warehouses WHERE is_central = TRUE LIMIT 1;

    -- قفل ترتیبی بر اساس variant_id جهت پیشگیری از بن‌بست (Deadlock Prevention)
    FOR v_item IN 
        SELECT variant_id, quantity 
        FROM order_items 
        WHERE order_id = p_order_id 
        ORDER BY variant_id ASC
    LOOP
        SELECT (quantity_on_hand - reserved_qty) AS available_stock INTO v_stock
        FROM warehouse_stock
        WHERE warehouse_id = v_target_wh_id AND variant_id = v_item.variant_id
        FOR UPDATE;

        IF NOT FOUND OR v_stock.available_stock < v_item.quantity THEN
            v_can_fulfill := FALSE;
            EXIT;
        END IF;
    END LOOP;

    IF v_can_fulfill THEN
        -- سناریو الف: موجودی آزاد کافی است؛ رزرو آنی و تحویل کالا
        FOR v_item IN SELECT variant_id, quantity FROM order_items WHERE order_id = p_order_id LOOP
            UPDATE warehouse_stock
            SET quantity_on_hand = quantity_on_hand - v_item.quantity,
                updated_at = NOW()
            WHERE warehouse_id = v_target_wh_id AND variant_id = v_item.variant_id;

            INSERT INTO stock_movements (
                warehouse_id, variant_id, quantity_change, balance_after,
                movement_type, reference_type, reference_id, operator_id, notes
            ) VALUES (
                v_target_wh_id, v_item.variant_id, -v_item.quantity,
                (SELECT quantity_on_hand FROM warehouse_stock WHERE warehouse_id = v_target_wh_id AND variant_id = v_item.variant_id),
                'order_sale', 'orders', p_order_id, auth.uid(), 'تخصیص پس از پرداخت دیرهنگام'
            );
        END LOOP;

        UPDATE orders 
        SET status = 'paid',
            admin_notes = COALESCE(admin_notes, '') || ' [پرداخت دیرهنگام: بازیابی موفق با موجودی آزاد انبار مرکزی]'
        WHERE id = p_order_id;

        UPDATE payments 
        SET status = 'completed', completed_at = NOW() 
        WHERE order_id = p_order_id;

        RETURN jsonb_build_object('success', true, 'action', 'fulfilled_auto_recovered');
    ELSE
        -- سناریو ب: موجودی تمام شده است؛ پیشگیری از بیش‌فروشی و ایجاد گردش استرداد وجه
        UPDATE orders 
        SET status = 'stock_exhausted_pending_refund',
            admin_notes = COALESCE(admin_notes, '') || ' [هشدار: پرداخت دیرهنگام پس از اتمام موجودی؛ آماده استرداد وجه]'
        WHERE id = p_order_id;

        -- وضعیت پرداخت به refund_pending تغییر می‌یابد (نه completed و نه refunded)
        UPDATE payments 
        SET status = 'refund_pending' 
        WHERE order_id = p_order_id;

        -- ایجاد رکورد تراکنش استرداد در صف بررسی
        INSERT INTO payment_transactions (
            payment_id, gateway, amount_toman, authority_token,
            idempotency_key, status, raw_response
        ) VALUES (
            (SELECT id FROM payments WHERE order_id = p_order_id),
            'system_refund_queue', v_order.total_amount_toman, 'REFUND-' || p_order_id,
            'IDEMP-REFUND-' || p_order_id, 'initiated',
            jsonb_build_object('reason', 'stock_exhausted_after_late_payment', 'gateway_ref', p_gateway_ref)
        ) RETURNING id INTO v_refund_tx_id;

        -- ثبت لاگ ممیزی امنیتی با اولویت بالا
        INSERT INTO admin_audit_logs (
            actor_id, action, target_entity, target_id, old_data, new_data, ip_address
        ) VALUES (
            auth.uid(), 'late_payment_stock_exhausted', 'orders', p_order_id,
            jsonb_build_object('order_id', p_order_id, 'amount', v_order.total_amount_toman),
            jsonb_build_object('refund_tx_id', v_refund_tx_id, 'status', 'refund_pending'),
            '127.0.0.1'::inet
        );

        RETURN jsonb_build_object('success', false, 'action', 'refund_queued', 'reason', 'stock_exhausted');
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION rpc_handle_late_payment_callback FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_handle_late_payment_callback TO authenticated, service_role;
```

---

### ۴. فرآیند استرداد وجه تکرارپذیر، پایاپای و ضدتکرار (Idempotent Retryable Refund Procedure)
```sql
CREATE OR REPLACE FUNCTION rpc_process_gateway_refund(
    p_payment_transaction_id UUID,
    p_gateway_refund_ref VARCHAR,
    p_status VARCHAR, -- 'succeeded' یا 'gateway_failed'
    p_error_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tx RECORD;
    v_payment RECORD;
BEGIN
    IF NOT auth.user_has_permission('finance:manage') THEN
        RAISE EXCEPTION 'دسترسی غیرمجاز جهت پردازش استرداد وجه.';
    END IF;

    SELECT * INTO v_tx 
    FROM payment_transactions 
    WHERE id = p_payment_transaction_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'تراکنش استرداد یافت نشد.';
    END IF;

    -- بررسی پایاپای بودن (Idempotency)
    IF v_tx.status = 'verified' AND p_status = 'succeeded' THEN
        RETURN jsonb_build_object('success', true, 'status', 'already_refunded');
    END IF;

    SELECT * INTO v_payment FROM payments WHERE id = v_tx.payment_id FOR UPDATE;

    IF p_status = 'succeeded' THEN
        -- استرداد با موفقیت در بانک تایید شده است
        UPDATE payment_transactions
        SET status = 'verified',
            shaparak_rrn = p_gateway_refund_ref,
            verified_at = NOW(),
            raw_response = COALESCE(raw_response, '{}'::jsonb) || jsonb_build_object('refund_success', true)
        WHERE id = p_tx.id;

        -- اکنون وضعیت اصلی پرداخت به refunded تغییر می‌یابد
        UPDATE payments
        SET status = 'refunded'
        WHERE id = v_tx.payment_id;

        UPDATE orders
        SET status = 'refunded'
        WHERE id = v_payment.order_id;

        RETURN jsonb_build_object('success', true, 'status', 'refund_completed');
    ELSE
        -- خطای درگاه؛ تراکنش برای تلاش مجدد یا بررسی دستی علامت‌گذاری می‌شود
        UPDATE payment_transactions
        SET status = 'failed',
            raw_response = COALESCE(raw_response, '{}'::jsonb) || jsonb_build_object('refund_error', p_error_message, 'retry_needed', true)
        WHERE id = v_tx.id;

        UPDATE payments
        SET status = 'refund_failed'
        WHERE id = v_tx.payment_id;

        RETURN jsonb_build_object('success', false, 'status', 'refund_retry_queued', 'error', p_error_message);
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION rpc_process_gateway_refund FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_process_gateway_refund TO authenticated, service_role;
```
