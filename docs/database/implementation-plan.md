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
> **ممنوعیت مطلق حذف تخریبی جداول (DROP TABLE CASCADE) در پروداکشن:**
> اجرای دستورات تخریبی نظیر `DROP SCHEMA public CASCADE;` یا `DROP TABLE ... CASCADE` در محیط‌های عملیاتی (Production) و پیش‌تولید (Staging) اکیداً ممنوع و غیرمجاز است. حذف جداول منجر به نابودی بازگشت‌ناپذیر سوابق مالی، تاریخچه سفارشات مشتریان، تراز کیف پول، دفاتر کل انبارداری و ردیابی IMEI می‌گردد.

### ۵.۱. استراتژی بازگشت در محیط پروداکشن: مایگریشن‌های جبرانی و رو به جلو (Compensating & Forward-Fix Migrations)
در محیط عملیاتی، در صورت بروز هرگونه مشکل پس از انتشار نسخه، استراتژی بازگشت منحصراً بر پایه **مایگریشن‌های جبرانی بدون تخریب داده (Non-Destructive Compensating Migrations)** و **سوئیچ‌های عملکردی (Feature Flags)** اجرا می‌شود:

1. **حفظ مطلق جداول اسناد و دفاتر کل:**
   جداول `orders`, `order_items`, `invoices`, `payments`, `payment_transactions`, `wallets`, `wallet_transactions`, `stock_movements`, `product_serial_units` و `admin_audit_logs` تحت هیچ شرایطی در پروداکشن حذف نمی‌شوند.
2. **بازگردانی توابع و منطق پردازشی (RPC & Functions):**
   تغییرات منطق بیزینس و توابع ذخیره‌شده از طریق تعریف مجدد کد نسخه قبلی با دستور `CREATE OR REPLACE FUNCTION` بدون قطعی و بدون تاثیر روی داده‌ها بازگردانده می‌شوند.
3. **غیرفعال‌سازی از طریق کلیدهای پیکربندی (Feature Flags):**
   قابلیت‌های جدید ابتدا پشت پرچم‌های ویژگی در جدول `store_settings` فعال می‌شوند و در صورت بروز اشکال، قابلیت ظرف کسری از ثانیه با تغییر مقدار پرچم در سطح تنظیمات خاموش می‌گردد.
4. **خنثی‌سازی ستون‌ها و ایندکس‌های جدید (Safe Schema Reversal):**
   ستون‌های الحاقی جدید با دستور `ALTER TABLE ... ALTER COLUMN ... DROP NOT NULL;` سازگار نگه داشته شده و ایندکس‌های مشکل‌ساز با `DROP INDEX CONCURRENTLY IF EXISTS` بدون قفل جدول خارج می‌شوند:

```sql
-- نمونه مایگریشن جبرانی و ایمن در پروداکشن (بدون تخریب داده‌ها)
BEGIN;
  -- ۱. بازگردانی بدنه توابع به نسخه پایدار قبلی
  CREATE OR REPLACE FUNCTION rpc_post_wallet_transaction(...) ...;
  CREATE OR REPLACE FUNCTION rpc_record_stock_movement(...) ...;

  -- ۲. غیرفعال‌سازی موقت ماژول مربوطه در صورت لزوم
  UPDATE store_settings 
  SET value = jsonb_set(value, '{features,late_payment_auto_recovery}', 'false'::jsonb)
  WHERE key = 'features_config';

  -- ۳. حذف ایمن و غیرهمگام ایندکس‌های غیرضروری جدید بدون قفل جداول
  -- DROP INDEX CONCURRENTLY IF EXISTS idx_new_experimental_feature;
COMMIT;
```

### ۵.۲. پاکسازی صرفاً در سندباکس توسعه محلی با گارد ایمنی (Local Dev Sandbox Only)
در محیط توسعه محلی ایزوله، اسکریپت ریست کامل اسکیما منحصراً با شرط سخت‌گیرانه `IS DISTINCT FROM 'development'` مجاز است:

```sql
DO $$
BEGIN
    -- بررسی گارد ایمنی محیط توسعه (Fail-Closed Guard)
    IF current_setting('app.environment', true) IS DISTINCT FROM 'development' THEN
        RAISE EXCEPTION 'خطای امنیتی بحرانی: بازنشانی تخریبی اسکیما منحصراً در محیط محلی development مجاز است. این عملیات در محیط‌های staging و production مسدود است.';
    END IF;

    -- پاکسازی و بازسازی اسکیما صرفاً در محیط لوکال
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO postgres;
    GRANT ALL ON SCHEMA public TO anon;
    GRANT ALL ON SCHEMA public TO authenticated;
    GRANT ALL ON SCHEMA public TO service_role;
END $$;
```

---

## ۶. مشخصات سناریوهای آزمون استقرار در Task 4.3 (Deployment Validation Test Specifications)

> [!IMPORTANT]
> **محدوده Task 4.2 صرفاً طراحی معماری و مستندسازی است.**
> هیچ‌یک از سناریوهای SQL زیر در مرحله ۴.۲ اجرا نشده‌اند. این بخش به عنوان «مشخصات فنی و آزمون‌های پذیرش برای Task 4.3 (دیپلوی پایگاه داده)» تدوین شده است تا پس از اعمال مایگریشن در Task 4.3 برای تایید صحت پیاده‌سازی اجرا گردند (Planned Tests Only - Not Executed in Task 4.2).

### سناریوی ۱: فراخوانی غیرمجاز توابع سروری توسط کلاینت (Unauthorized Server-Only RPC Invocation)
- **هدف:** اطمینان از مسدود بودن توابع `rpc_handle_late_payment_callback` و `rpc_process_gateway_refund` برای کاربران عادی `authenticated`.
- **مشخصات تست:**
  1. شبیه‌سازی کلاینت با `SET ROLE authenticated; SET request.jwt.claim.sub = '<customer-uuid>';`
  2. فراخوانی `SELECT rpc_handle_late_payment_callback('<order-id>', '<tx-id>');`
  3. **نتیجه مورد انتظار:** بروز خطای `42501 permission denied for function rpc_handle_late_payment_callback` یا خطای دسترسی صریح `403`.

### سناریوی ۲: کسر همزمان و تکراری از کیف پول با کلید یکسان (Concurrent Duplicate Wallet Debit & Race-Safe Idempotency)
- **هدف:** اطمینان از اینکه اگر درخواست اول کامیت کند و درخواست دوم همزمان با آن با همان کلید ضدتکرار رقابت کند، تراکنش دوم بدون تغییر مضاعف در مانده کیف پول بازگردانده شود.
- **مشخصات تست:**
  1. کیف پول با مانده ۵۰۰,۰۰۰ تومان.
  2. دو ترنزکشن همزمان هرکدام برای کسر ۲۰۰,۰۰۰ تومان با یک کلید ضدتکرار یکسان `IDEMP-WALLET-100`.
  3. **نتیجه مورد انتظار:** سطر `wallet_transactions` دقیقاً یک‌بار درج می‌شود. شناسه یکسان برگردانده شده و مانده نهایی `wallets.cached_balance_toman` دقیقاً ۳۰۰,۰۰۰ تومان باقی می‌ماند (نه ۱۰۰,۰۰۰ تومان).

### سناریوی ۳: تلاش دو درخواست مجزا برای پرداخت یک سفارش از کیف پول (Two Different Wallet Requests Targeting Same Order)
- **هدف:** جلوگیری از پرداخت مضاعف یک سفارش توسط دو درخواست با کلیدهای ضدتکرار متفاوت.
- **مشخصات تست:**
  1. سفارش با مبلغ ۳۰۰,۰۰۰ تومان در وضعیت `pending_payment`.
  2. دو درخواست مجزا با دو کلید ضدتکرار `KEY-A` و `KEY-B` برای پرداخت همین سفارش.
  3. **نتیجه مورد انتظار:** درخواست اول موفق شده، کیف پول کسر گشته و سفارش `paid` می‌شود؛ درخواست دوم با خطای صریح `'برای این سفارش قبلاً تراکنش پرداخت از کیف پول ثبت شده است.'` یا خطای وضعیت سفارش متوقف شده و هیچ مبلغ اضافی از کیف پول کسر نمی‌شود.

### سناریوی ۴: رد درخواست شارژ دلخواه کیف پول توسط کلاینت (Arbitrary Client Wallet Credit Rejection)
- **هدف:** جلوگیری از کلاهبرداری و شارژ دستی کیف پول توسط کلاینت.
- **مشخصات تست:**
  1. کاربر احراز هویت شده عادی فراخوانی `rpc_post_wallet_transaction` را با `p_amount_toman = +10000000` ارسال کند.
  2. **نتیجه مورد انتظار:** رد فوری با خطای: `'عملیات غیرمجاز: شارژ مستقیم کیف پول توسط کلاینت ممنوع است.'`. شارژ مثبت منحصراً از کانال وب‌هوک تایید شده بانکی سرور (`service_role`) پذیرفته می‌شود.

### سناریوی ۵: رقابت همزمان در ثبت اسناد گردش انبار با کلید یکسان (Concurrent Duplicate Stock Movement Idempotency)
- **هدف:** اطمینان از عدم دستکاری پروجکشن موجودی در صورت برخورد کلید ضدتکرار همزمان.
- **مشخصات تست:**
  1. کالا دارای ۱۰ عدد موجودی در انبار.
  2. دو ترنزکشن همزمان برای کاهش ۲ عدد کالا با کلید ضدتکرار یکسان `IDEMP-STOCK-1`.
  3. **نتیجه مورد انتظار:** سند دفتر کل فقط یک‌بار ثبت شده و `quantity_on_hand` انبار دقیقاً ۸ عدد باقی می‌ماند (نه ۶ عدد).

### سناریوی ۶: تجمیع چندانباره و بازگشت کامل اتمیک در کسری کالا (Multi-Warehouse Aggregation & Atomic Rollback)
- **هدف:** اعتبارسنجی اصل یا همه‌یا‌هیچ (All-or-None) در تخصیص چندانباره.
- **مشخصات تست:**
  1. سفارش شامل ۲ عدد کالا A و ۱ عدد کالا B.
  2. انبار ۱ دارای ۱ عدد A، انبار ۲ دارای ۱ عدد A. کالا B در هیچ انباری موجود نیست.
  3. **نتیجه مورد انتظار:** هیچ انباری کسر موجودی ثبت نکرده و هیچ سندی در `stock_movements` درج نشود؛ کل ترنزکشن به حالت `stock_exhausted_pending_refund` منتقل گردد بدون کوچک‌ترین بیش‌فروشی.

### سناریوی ۷: وب‌هوک پرداخت دیرهنگام در کسری موجودی (Late Payment Callback with Stock Exhaustion)
- **هدف:** جلوگیری از تحویل تعهدناپذیر و ثبت ردیف استرداد وجه با توکن استرداد استاندارد.
- **مشخصات تست:**
  1. رزرو منقضی شده و موجودی انبار به فروش رسیده است. وب‌هوک تاییدیه شاپرک با تاخیر فراخوانی می‌شود.
  2. فراخوانی سروری `rpc_handle_late_payment_callback`.
  3. **نتیجه مورد انتظار:** سفارش به وضعیت `stock_exhausted_pending_refund` تغییر یافته، سطر جدید استرداد با توکن `REFUND-{order_id}` در `payment_transactions` ایجاد شده و رویداد امنیتی در `admin_audit_logs` لاگ گردد.

### سناریوی ۸: دریافت کال‌بک پرداخت برای سفارش قبلاً مسترد شده (Late Callback for Already-Refunded Order)
- **هدف:** اثبات اینکه سفارش مستردشده هرگز به وضعیت `refund_pending` یا `paid` بازنمی‌گردد.
- **مشخصات تست:**
  1. سفارشی با وضعیت `refunded` و پرداخت با وضعیت `refunded`.
  2. ارسال مجدد وب‌هوک پرداخت دیرهنگام برای همین سفارش.
  3. **نتیجه مورد انتظار:** خروجی تابع به صورت پایاپای `{"success": true, "status": "already_refunded"}` بدون ایجاد هیچ‌گونه تراکنش یا تغییر وضعیت داده‌ها بازگردانده شود.

### سناریوی ۹: رد ارسال تراکنش پرداخت اصلی به عنوان تراکنش استرداد (Invalid Refund Target Transaction Rejection)
- **هدف:** اطمینان از اینکه تابع `rpc_process_gateway_refund` فقط تراکنش‌های معتبر استرداد را می‌پذیرد و نمی‌توان تراکنش خرید اصلی را به عنوان سند استرداد پاس داد.
- **مشخصات تست:**
  1. فراخوانی `rpc_process_gateway_refund` با شناسه یک تراکنش خرید عادی شاپرک (فاقد توکن `REFUND-`).
  2. **نتیجه مورد انتظار:** رد تراکنش با خطای: `'خطای اعتبارسنجی: شناسه ارسال شده مربوط به تراکنش استرداد نیست'`.

### سناریوی ۱۰: دریافت تاییدیه موفقیت پس از وضعیت شکست قبلی استرداد (Late Success After refund_failed)
- **هدف:** بازیابی صحیح استرداد در صورتی که بانک در ابتدا خطا داده اما بعداً با تاخیر استرداد را تسویه کرده باشد.
- **مشخصات تست:**
  1. تراکنش استرداد قبلاً با خطای بانکی در وضعیت `failed` و پرداخت در وضعیت `refund_failed` قرار گرفته است.
  2. وب‌هوک پایاپای بانکی با تایید قطعی (`p_verified_success = TRUE`) و شماره مرجع شاپرک دریافت شود.
  3. **نتیجه مورد انتظار:** تراکنش به `verified` به‌روزرسانی شده، وضعیت سفارش و پرداخت به `refunded` تغییر یابد، متادیتای `recovered_after_failure: true` در `raw_response` ثبت شود و خروجی `refund_recovered_after_failure` حاصل گردد.

### سناریوی ۱۱: زمان‌بندی تلاش مجدد استرداد با رشد نمایی (Refund Retry Scheduling with Exponential Backoff)
- **هدف:** تضمین افزایش شمارنده خطا و تنظیم فیلد `next_retry_at` برای تلاش‌های ناموفق تا سقف ۵ بار.
- **مشخصات تست:**
  1. تراکنش استرداد در وضعیت `initiated` با `p_verified_success = FALSE` و متن خطای بانکی فراخوانی شود.
  2. **نتیجه مورد انتظار:** شمارنده `retry_count` یک واحد افزایش یافته، `next_retry_at` بر اساس فرمول نمایی تنظیم شود و پس از ۵ بار شکست، وضعیت به `manual_finance_intervention_required` تبدیل گردد.

### سناریوی ۱۲: آزمون گارد تخریب اسکیما در محیط‌های غیر از Development (Destructive Rollback Guard)
- **هدف:** ممانعت قطعی از پاکسازی تصادفی پایگاه داده در Staging و Production یا در صورت نبود متغیر محیطی.
- **مشخصات تست:**
  1. اجرای بلوک پاکسازی اسکیما در حالی که `app.environment` تنظیم نشده (NULL) یا برابر `production` است.
  2. **نتیجه مورد انتظار:** شرط `IS DISTINCT FROM 'development'` صادق شده و بلافاصله با پرتاب خطای `'خطای امنیتی بحرانی: بازنشانی تخریبی اسکیما منحصراً در محیط محلی development مجاز است.'` ترنزکشن را متوقف سازد.
