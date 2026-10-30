# CNA Mobile Store — Database Implementation & Phased Execution Plan (Task 4.3 Roadmap)

برنامه عملیاتی و نقشه راه گام‌به‌گام پیاده‌سازی فیزیکی اسکیما، مهاجرت داده‌های اولیه (Data Seeding)، آزمون‌های اعتبارسنجی امنیتی و استراتژی بازگشت امن و تفکیک‌شده (Safe Rollback Strategy) در تسک ۴.۳.

---

## ۱. نقشه راه و فازبندی استقرار مایگریشن‌ها در Task 4.3

فرآیند اجرای مایگریشن در Supabase در **۴ فاز متوالی** سازمان‌دهی شده است تا از خطاهای بن‌بست کلیدهای خارجی جلوگیری شود:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Phase 1: Foundation & RBAC                      │
│   - اکستنشن‌های اصلی: pgcrypto, uuid-ossp, pg_trgm                     │
│   - جداول احراز هویت: auth_roles, auth_permissions,                    │
│     auth_role_permissions, profiles, auth_user_roles, user_addresses  │
│   - توابع امنیتی RBAC: auth.user_has_role(), auth.user_has_permission()│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Phase 2: Catalog & Taxonomy                     │
│   - رده‌بندی و برندها: categories, brands                              │
│   - فرهنگ ویژگی‌ها: attribute_definitions, category_attributes,        │
│     product_attribute_values (Canonical Source of Truth)               │
│   - کاتالوگ و گالری: products, product_images                          │
│   - تنوع و گارانتی: warranties (پویا), product_variants                │
│   - تریگر همگام‌سازی پروجکشن خواندنی specs_summary                     │
│   - ایندکس‌های جستجوی تمام‌متن فارسی (GIN) و فیلترهای چندمعیاره         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Phase 3: Multi-Warehouse, Carts & Orders               │
│   - انبارداری: warehouses, warehouse_stock (پروجکشن),                  │
│     stock_movements (دفتر کل کانونیکال با سند افتتاحیه و اسناد جفتی),  │
│     stock_reservations (رزرو اتمیک ۱۵ دقیقه‌ای)                        │
│   - توابع انحصاری انبارداری با قفل بدبینانه: rpc_record_stock_movement()│
│   - سبد خرید: carts, cart_items                                        │
│   - توالی‌های شماره سفارش با سال پویا: cna_order_number_seq            │
│   - سفارشات: orders (با وضعیت بازیابی دیرهنگام), order_items, تاریخچه   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Phase 4: Finance, Shipping, Settings & RLS               │
│   - موتور مالیاتی و کیف پول: tax_rules, wallets (پروجکشن),              │
│     wallet_transactions (دفتر کل کانونیکال با rpc_post_wallet_tx)      │
│   - فاکتور رسمی و پرداخت: invoices, payments, payment_transactions     │
│   - روال بازیابی دیرهنگام و استرداد وجه پایاپای:                       │
│     rpc_handle_late_payment_callback(), rpc_process_gateway_refund()   │
│   - حمل و نقل و تنظیمات: shipping_methods, store_settings               │
│   - فعال‌سازی سراسری RLS و اعمال سیاست‌های انسداد کلاینت برای دفاتر کل │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ۲. تفکیک ۳۲ جدول مرحله اولیه در برابر ۱۶ جدول توسعه تکمیلی

### جداول فاز اول (Initial 32 Tables)
جداول هسته‌ای که در مایگریشن اولیه فاز ۴.۳ مستقر می‌شوند:
1. `profiles`
2. `user_addresses`
3. `auth_roles`
4. `auth_permissions`
5. `auth_role_permissions`
6. `auth_user_roles`
7. `categories`
8. `brands`
9. `products`
10. `product_images`
11. `attribute_definitions`
12. `category_attributes`
13. `product_attribute_values`
14. `warranties`
15. `product_variants`
16. `warehouses`
17. `warehouse_stock`
18. `stock_movements`
19. `stock_reservations`
20. `carts`
21. `cart_items`
22. `tax_rules`
23. `orders`
24. `order_items`
25. `order_status_history`
26. `wallets`
27. `wallet_transactions`
28. `invoices`
29. `payments`
30. `payment_transactions`
31. `shipping_methods`
32. `store_settings`

### جداول فاز دوم (Later Extension 16 Tables)
جداول توسعه‌ای که ساختار آنها آماده است و در فازهای اختصاصی اضافه می‌شوند:
33. `product_serial_units` (ردیابی فیزیکی IMEI)
34. `inventory_transfers` (انتقال بین‌انباری)
35. `inventory_transfer_items` (اقلام انتقال)
36. `order_returns` (مرجوعی RMA)
37. `payment_webhook_logs` (لاگ وب‌هوک)
38. `shipments` (بارنامه‌ها)
39. `shipment_tracking_events` (رهگیری پستی)
40. `coupons` (کدهای تخفیف)
41. `coupon_usages` (سوابق کوپن)
42. `loyalty_points` (باشگاه مشتریان)
43. `wishlists` (علاقه‌مندی‌ها)
44. `reviews` (نظرات کاربران)
45. `support_tickets` (تیکت‌ها)
46. `ticket_messages` (پیام‌های تیکت)
47. `notifications` (صف پیامک)
48. `admin_audit_logs` (لاگ‌های امنیتی)

---

## ۳. استراتژی تزریق داده‌های اولیه (Data Seeding Strategy)

- نقش‌های استاندارد سیستم همراه با مجوزهای تفکیک‌شده.
- درخت دسته‌بندی و برندهای کاتالوگ.
- شرکت‌های گارانتی با مدت‌های اعتبار پویا (۶، ۱۲، ۱۸ و ۲۴ ماه).
- انبار مرکزی تهران و ثبت سند افتتاحیه موجودی (`opening_balance`) در `stock_movements`.
- قانون مالیاتی فعال دوره جاری در `tax_rules`.
- روش‌های ارسال فعال با مبالغ صحیح به تومان (`BIGINT`).
- محصولات اولیه منطبق با `src/services/mockData.ts`.

---

## ۴. چک‌لیست آزمون‌های اعتبارسنجی (Post-Deployment Verification Suite)

| شماره تست | عنوان آزمون | سناریو و شرایط قبولی | ابزار ارزیابی |
| :--- | :--- | :--- | :--- |
| **TEST-01** | شمارش صحت جداول | بررسی ایجاد کامل جداول در اسکیما `public` (دقیقاً ۳۲ جدول در فاز اول) | کوئری `information_schema.tables` |
| **TEST-02** | راستی‌آزمایی RLS | اطمینان از مقدار `rowsecurity = true` در تمام جداول | کوئری `pg_tables` |
| **TEST-03** | اعتبارسنجی ارزی | اطمینان از نبود فیلدهای `FLOAT` یا `DOUBLE` در ستون‌های مالی (الزام `BIGINT`) | کوئری `information_schema.columns` |
| **TEST-04** | انسداد تغییر مستقیم انبار | تلاش برای صدور `INSERT` روی `stock_movements` توسط کلاینت (باید خطای ۴۰۳ دهد) | استعلام کلاینت با کلید عمومی |
| **TEST-05** | تطبیق موجودی انبار | تست برابری `warehouse_stock.quantity_on_hand` با جمع `stock_movements` | اجرای `reconcile_warehouse_stock` |
| **TEST-06** | انسداد تغییر مستقیم کیف پول | تلاش برای صدور `UPDATE` روی `wallets` توسط کلاینت (باید خطای ۴۰۳ دهد) | استعلام کلاینت با کلید عمومی |
| **TEST-07** | توالی پویای شماره سفارش | ایجاد سفارش جدید و تایید فرمت با سال پویا (مثال: `CNA-2026-10001`) | تست تریگر توالی |
| **TEST-08** | همگام‌سازی کانونیکال مشخصات | ویرایش مقدار در `product_attribute_values` و مشاهده به‌روزرسانی `specs_summary` | تست تریگر کاتالوگ |
| **TEST-09** | تست بازیابی پرداخت دیرهنگام | تست فراخوانی `rpc_handle_late_payment_callback` برای رزرو منقضی با موجودی صفر (تایید استرداد بدون بیش‌فروشی) | اجرای تست روال ذخیره‌شده |
| **TEST-10** | تست پایاپای استرداد وجه | فراخوانی مکرر `rpc_process_gateway_refund` با کلید ضدتکرار یکسان (عدم پردازش مجدد) | اجرای تست روال ذخیره‌شده |

---

## ۵. استراتژی بازگشت امن و تفکیک‌شده بر حسب محیط (Environment-Safe Rollback Strategy)

> [!WARNING]
> **ممنوعیت مطلق حذف کلی اسکیما در پروداکشن:**
> اجرای دستورات تخریبی نظیر `DROP SCHEMA public CASCADE;` در محیط‌های عملیاتی (Production) و پیش‌تولید (Staging) اکیداً ممنوع است. هرگونه بازگشت در این محیط‌ها باید منحصراً از طریق اسکریپت‌های برگشت فازبه‌فاز (`down.sql`) اجرا شود تا تمامیت داده‌های تجاری و سوابق مشتریان حفظ گردد.

### ۵.۱. استراتژی بازگشت فازبه‌فاز در محیط پروداکشن (Granular Phase-by-Phase Rollback)
برای هر مرحله از مایگریشن، اسکریپت برگشت معکوس تعریف شده و در یک ترنزکشن امن اجرا می‌شود:

```sql
-- برگشت فاز ۴ (Finance, Shipping, Settings & RLS)
BEGIN;
  DROP FUNCTION IF EXISTS rpc_process_gateway_refund;
  DROP FUNCTION IF EXISTS rpc_handle_late_payment_callback;
  DROP FUNCTION IF EXISTS rpc_post_wallet_transaction;
  DROP TABLE IF EXISTS payment_transactions CASCADE;
  DROP TABLE IF EXISTS payments CASCADE;
  DROP TABLE IF EXISTS invoices CASCADE;
  DROP TABLE IF EXISTS wallet_transactions CASCADE;
  DROP TABLE IF EXISTS wallets CASCADE;
  DROP TABLE IF EXISTS tax_rules CASCADE;
  DROP TABLE IF EXISTS shipping_methods CASCADE;
  DROP TABLE IF EXISTS store_settings CASCADE;
COMMIT;

-- برگشت فاز ۳ (Multi-Warehouse, Carts & Orders)
BEGIN;
  DROP FUNCTION IF EXISTS rpc_record_stock_movement;
  DROP FUNCTION IF EXISTS rpc_checkout_order;
  DROP TRIGGER IF EXISTS trg_set_cna_order_number ON orders;
  DROP FUNCTION IF EXISTS generate_cna_order_number;
  DROP SEQUENCE IF EXISTS cna_order_number_seq;
  DROP TABLE IF EXISTS order_status_history CASCADE;
  DROP TABLE IF EXISTS order_items CASCADE;
  DROP TABLE IF EXISTS orders CASCADE;
  DROP TABLE IF EXISTS cart_items CASCADE;
  DROP TABLE IF EXISTS carts CASCADE;
  DROP TABLE IF EXISTS stock_reservations CASCADE;
  DROP TABLE IF EXISTS stock_movements CASCADE;
  DROP TABLE IF EXISTS warehouse_stock CASCADE;
  DROP TABLE IF EXISTS warehouses CASCADE;
COMMIT;

-- برگشت فاز ۲ (Catalog & Taxonomy)
BEGIN;
  DROP TABLE IF EXISTS product_variants CASCADE;
  DROP TABLE IF EXISTS warranties CASCADE;
  DROP TABLE IF EXISTS product_attribute_values CASCADE;
  DROP TABLE IF EXISTS category_attributes CASCADE;
  DROP TABLE IF EXISTS attribute_definitions CASCADE;
  DROP TABLE IF EXISTS product_images CASCADE;
  DROP TABLE IF EXISTS products CASCADE;
  DROP TABLE IF EXISTS brands CASCADE;
  DROP TABLE IF EXISTS categories CASCADE;
COMMIT;

-- برگشت فاز ۱ (Foundation & RBAC)
BEGIN;
  DROP FUNCTION IF EXISTS auth.user_has_permission;
  DROP FUNCTION IF EXISTS auth.user_has_role;
  DROP TABLE IF EXISTS user_addresses CASCADE;
  DROP TABLE IF EXISTS auth_user_roles CASCADE;
  DROP TABLE IF EXISTS auth_role_permissions CASCADE;
  DROP TABLE IF EXISTS auth_permissions CASCADE;
  DROP TABLE IF EXISTS auth_roles CASCADE;
  DROP TABLE IF EXISTS profiles CASCADE;
COMMIT;
```

### ۵.۲. پاکسازی صرفاً در سندباکس توسعه محلی با گارد ایمنی (Local Dev Sandbox Only)
در محیط توسعه محلی، اسکریپت ریست تنها در صورت وجود تاییدیه صریح متغیر محیطی اجرا می‌گردد:

```sql
DO $$
BEGIN
    -- بررسی گارد ایمنی محیط توسعه
    IF current_setting('app.environment', true) <> 'development' THEN
        RAISE EXCEPTION 'خطای امنیتی: دستور پاکسازی کلی اسکیما منحصراً در محیط development مجاز است.';
    END IF;

    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO postgres;
    GRANT ALL ON SCHEMA public TO anon;
    GRANT ALL ON SCHEMA public TO authenticated;
    GRANT ALL ON SCHEMA public TO service_role;
END $$;
```
