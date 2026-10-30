# CNA Mobile Store — Database Architecture & Engineering Specification

مستندات مرجع معماری جامع پایگاه داده رابطه ای فروشگاه اینترنتی تلفن همراه سی‌ان‌ای (CNA Mobile Store)
بر پایه پایگاه داده **PostgreSQL 15+** در بستر **Supabase** با انطباق کامل با استانداردهای مهندسی نرم‌افزار، امنیت بانکی و انبارداری چندگانه.

---

## ۱. بیانیه معماری و اصول بنیادین (Core Architectural Tenets)

پایگاه داده CNA بر پایه ۸ اصل مهندسی دقیق و سخت‌گیرانه پیاده‌سازی شده است:

1. **انضباط ارزی بدون ممیز (Strict Integer Toman Currency):**
   تمامی فیلدهای مالی بدون استثنا شامل قیمت کالا، تخفیف، هزینه حمل، مالیات، مبالغ استرداد و کیف پول با نوع داده ۶۴ بیتی `BIGINT` به واحد **تومان** ذخیره می‌شوند. هیچ فیلد اعشاری یا شناور مجاز نیست.
2. **جداسازی مطلق کنترل دسترسی (Decoupled RBAC Security):**
   نقش‌های کاربری هرگز در جدول قابل ویرایش `profiles` قرار نمی‌گیرند. نقش‌ها و مجوزها در جداول ایزوله `auth_roles`, `auth_permissions` و `auth_user_roles` پیاده‌سازی شده و از طریق توابع با سطح دسترسی `SECURITY DEFINER` بررسی می‌شوند.
3. **دفاتر کل تغییرناپذیر و پروجکشن‌های همگام (Canonical Ledgers vs. Materialized Projections):**
   - **انبارداری:** جدول `stock_movements` تنها مرجع قطعی حقیقت (Canonical Ledger) برای تمام ورودها، خروج‌ها و انتقالات انبار است. سوابق با سند افتتاحیه موجودی (`opening_balance`) آغاز شده و انتقالات بین‌انباری با دو سند جفتی (`transfer_out` و `transfer_in`) ثبت می‌شوند. جدول `warehouse_stock` صرفاً پروجکشن وضعیت موجودی است.
   - **کیف پول:** جدول `wallets.cached_balance_toman` صرفاً پروجکشن خواندنی است و مرجع کانونیکال تغییرناپذیر، جدول `wallet_transactions` است که توسط توابع امن اتمیک به‌روزرسانی می‌شود.
4. **انسداد کامل تغییرات مستقیم انبار و کیف پول در کلاینت (RPC-Only Mutations):**
   تمامی عملیات‌های تغییر موجودی انبار و تراکنش‌های کیف پول برای کلاینت‌ها (حتی ادمین‌ها) در سطح RLS کاملاً مسدود (`DENIED`) بوده و صرفاً از طریق توابع امن پایگاه داده (`SECURITY DEFINER RPC`) با قفل سطری بدبینانه (`FOR UPDATE`) اجرا می‌شوند.
5. **جریان پرداخت خطاتحمل‌پذیر و بازیابی پرداخت دیرهنگام (Fault-Tolerant Payment & Late Recovery):**
   ارتباط با درگاه‌های پرداخت با استفاده از کلید ضدتکرار (`idempotency_key`) و رزرو اتمیک ۱۵ دقیقه‌ای در `stock_reservations` مدیریت می‌شود. در سناریوی بازگشت موفق مشتری پس از انقضای رزرو:
   - در صورت وجود موجودی آزاد کافی، کالا مجدداً به صورت خودکار تخصیص می‌یابد.
   - در صورت اتمام موجودی، سیستم هرگز اقدام به فروش بیش از ظرفیت (Overselling) نکرده و سریعاً فرآیند استرداد خودکار وجه به حساب یا کیف پول مشتری را آغاز می‌کند.
6. **شناسه‌گذاری دوگانه با سال پویا (Dynamic Human-Readable Identifiers):**
   کلیدهای اصلی داخلی `UUIDv4` هستند. شماره‌های سفارش و فاکتور به صورت داینامیک از فرمت `CNA-{YEAR}-{SEQUENCE}` (مانند `CNA-2026-10001`) توسط توالی‌های پایگاه داده به صورت همگام تولید می‌شوند.
7. **ردیابی جامع چرخه حیات فیزیکی و گارانتی پویا (Configurable Warranty & IMEI Tracking):**
   جدول `product_serial_units` ردیابی یکتای `imei1`, `imei2` و `serial_number` را بر عهده دارد. مدت‌زمان گارانتی بر اساس شرکت و مدل کالا در جدول `warranties` به صورت پویا (۶، ۱۲، ۱۸، ۲۴ ماه) تنظیم شده و تاریخ انقضا بر اساس تاریخ تحویل محاسبه می‌گردد.
8. **مرجعیت مشخصات فنی کالا (Canonical EAV vs. Cached JSONB Read Model):**
   جدول نرمال‌شده `product_attribute_values` (EAV تایپ‌شده قوی) تنها مرجع معتبر مشخصات فنی و فیلترها است و ستون `specs_summary (JSONB)` در جدول محصولات صرفاً یک پروجکشن کش‌شده است.

---

## ۲. ساختار مستندات پایگاه داده (Documentation Index)

| نام فایل | شرح و محتوای فنی |
| :--- | :--- |
| **[`README.md`](./README.md)** | نمایه اصلی، اصول معماری، ماتریس جامع ۴۹ جدول، طبقه‌بندی دامنه‌ها و وضعیت سورس حقیقت. |
| **[`requirements-analysis.md`](./requirements-analysis.md)** | تحلیل جامع نیازمندی‌ها، سناریوهای بازگشت دیرهنگام درگاه، اسناد جفتی انبار و ردیابی IMEI. |
| **[`entities-and-fields.md`](./entities-and-fields.md)** | دیکشنری داده‌ای کامل تمام ۴۹ جدول با انواع داده، محدودیت‌ها، مقادیر پیش‌فرض و فیلدهای BIGINT. |
| **[`relationships.md`](./relationships.md)** | ماتریس روابط موجودیت‌ها، قوانین کلید خارجی (`ON DELETE`) و اثبات نرمال‌سازی 3NF/BCNF. |
| **[`erd.md`](./erd.md)** | نمودارهای کامل جریان داده و ERD با فرمت‌های Mermaid و جعبه‌های استاندارد ASCII. |
| **[`constraints-and-indexes.md`](./constraints-and-indexes.md)** | محدودیت‌های یکتایی، چک کانستارینت‌ها، ایندکس‌های B-Tree، ایندکس‌های متنی GIN و توالی‌های پویا. |
| **[`security-design.md`](./security-design.md)** | سیاست‌های دقیق Row-Level Security (RLS) برای تمام ۴۹ جدول، نقش‌های تفکیک‌شده و روال‌های RPC انحصاری. |
| **[`implementation-plan.md`](./implementation-plan.md)** | نقشه راه استقرار فاز ۴.۳، اسکریپت‌های مایگریشن ۴ مرحله‌ای و چک‌لیست اعتبارسنجی. |

---

## ۳. ماتریس جامع و شناسنامه تمام ۴۹ جدول پایگاه داده (Master Table Registry)

در جدول زیر، تمامی **۴۹ جدول** پایگاه داده به تفکیک دامنه، فاز پیاده‌سازی، پیش‌نیازها، وضعیت مرجع حقیقت (Source of Truth / Projection)، رفتار حذف و سطوح دسترسی RLS مستند شده است (به همراه ۱ موجودیت خارجی `auth.users` که مجموعاً ۵۰ موجودیت رابطه ای را تشکیل می‌دهند):

| # | نام جدول | دامنه | فاز | وابستگی‌های بالادستی (FK) | دسته‌بندی داده‌ای | رفتار حذف (`ON DELETE`) | سیاست RLS (L: Least Privilege) |
| :---: | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| **۱** | `profiles` | احراز هویت | فاز ۱ | `auth.users` | Canonical Truth | RESTRICT | کاربر: Select/Update خود؛ ادمین: Manage |
| **۲** | `user_addresses` | احراز هویت | فاز ۱ | `profiles` | Canonical Truth | CASCADE | کاربر: CRUD نشانی‌های متعلق به خود |
| **۳** | `auth_roles` | امنیت | فاز ۱ | — | Canonical Truth | RESTRICT | عمومی: Read؛ ادمین ارشد: Manage |
| **۴** | `auth_permissions` | امنیت | فاز ۱ | — | Canonical Truth | RESTRICT | عمومی: Read؛ ادمین ارشد: Manage |
| **۵** | `auth_role_permissions` | امنیت | فاز ۱ | `auth_roles`, `auth_permissions`| Canonical Junction | CASCADE | منحصراً ادمین ارشد (`super_admin`) |
| **۶** | `auth_user_roles` | امنیت | فاز ۱ | `auth.users`, `auth_roles` | Canonical Junction | CASCADE / RESTRICT | کاربر: Read نقش خود؛ ادمین ارشد: Manage |
| **۷** | `categories` | کاتالوگ | فاز ۱ | `categories (parent)` | Canonical Truth | RESTRICT | عمومی: Read فعال‌ها؛ مدیر کاتالوگ: Write |
| **۸** | `brands` | کاتالوگ | فاز ۱ | — | Canonical Truth | RESTRICT | عمومی: Read فعال‌ها؛ مدیر کاتالوگ: Write |
| **۹** | `products` | کاتالوگ | فاز ۱ | `categories`, `brands` | Canonical Truth (+Cached JSON) | RESTRICT | عمومی: Read منتشرشده‌ها؛ کاتالوگ: Write |
| **۱۰** | `product_images` | کاتالوگ | فاز ۱ | `products` | Canonical Truth | CASCADE | عمومی: Read؛ مدیر کاتالوگ: Write |
| **۱۱** | `attribute_definitions`| مشخصات | فاز ۱ | — | Canonical Truth | RESTRICT | عمومی: Read؛ مدیر کاتالوگ: Write |
| **۱۲** | `category_attributes` | مشخصات | فاز ۱ | `categories`, `attribute_definitions` | Canonical Junction | CASCADE | عمومی: Read؛ مدیر کاتالوگ: Write |
| **۱۳** | `product_attribute_values`| مشخصات| فاز ۱ | `products`, `attribute_definitions` | **Canonical Source of Truth** | CASCADE / RESTRICT | عمومی: Read؛ مدیر کاتالوگ: Write |
| **۱۴** | `warranties` | کاتالوگ | فاز ۱ | — | Canonical Truth | RESTRICT | عمومی: Read؛ مدیر کاتالوگ: Write |
| **۱۵** | `product_variants` | کاتالوگ | فاز ۱ | `products`, `warranties` | Canonical SKU Truth | CASCADE / RESTRICT | عمومی: Read؛ مدیر کاتالوگ/انبار: Write |
| **۱۶** | `warehouses` | انبارداری | فاز ۱ | — | Canonical Truth | RESTRICT | پرسنل انبار: Read؛ ادمین: Manage |
| **۱۷** | `warehouse_stock` | انبارداری | فاز ۱ | `warehouses`, `product_variants`| **Materialized Projection** | RESTRICT | پرسنل انبار: Read؛ **تغییر مستقیم مسدود (RPC Only)** |
| **۱۸** | `stock_movements` | انبارداری | فاز ۱ | `warehouses`, `product_variants`| **Canonical Immutable Ledger**| RESTRICT | پرسنل انبار: Read؛ **تغییر مستقیم مسدود (RPC Only)** |
| **۱۹** | `stock_reservations`| انبارداری | فاز ۱ | `warehouses`, `product_variants`| Temporary Atomic Hold | RESTRICT / CASCADE | کاربر: Read رزرو خود؛ **تغییر مستقیم مسدود (RPC Only)** |
| **۲۰** | `carts` | سبد خرید | فاز ۱ | `profiles` | Transient State | CASCADE / SET NULL | کاربر: CRUD سبد خود یا سشن مهمان |
| **۲۱** | `cart_items` | سبد خرید | فاز ۱ | `carts`, `product_variants` | Transient State | CASCADE | کاربر: CRUD اقلام سبد خود |
| **۲۲** | `tax_rules` | مالیات | فاز ۱ | — | Versioned Policy | RESTRICT | عمومی: Read فعال‌ها؛ مدیر مالی: Manage |
| **۲۳** | `orders` | سفارشات | فاز ۱ | `auth.users`, `shipping_methods`| Canonical Order Header | RESTRICT | کاربر: Read سفارش خود؛ تغییر مستقیم مسدود (RPC) |
| **۲۴** | `order_items` | سفارشات | فاز ۱ | `orders`, `product_variants` | **Immutable Purchase Snapshot**| CASCADE / RESTRICT | کاربر: Read فاکتور خود؛ تغییر کلاینت مسدود |
| **۲۵** | `order_status_history`| سفارشات | فاز ۱ | `orders`, `auth.users` | Immutable Audit Trail | CASCADE | کاربر: Read وضعیت خود؛ اپراتور: درج با دسترسی |
| **۲۶** | `wallets` | مالی | فاز ۱ | `auth.users` | **Materialized Projection** | RESTRICT | کاربر: Read موجودی خود؛ **تغییر مستقیم مسدود (RPC Only)** |
| **۲۷** | `wallet_transactions`| مالی | فاز ۱ | `wallets` | **Canonical Immutable Ledger**| RESTRICT | کاربر: Read تراکنش خود؛ **تغییر مستقیم مسدود (RPC Only)** |
| **۲۸** | `invoices` | مالی | فاز ۱ | `orders`, `auth.users` | Official Invoice Snapshot | RESTRICT | کاربر: Read فاکتور خود؛ تغییر و حذف مسدود |
| **۲۹** | `payments` | مالی | فاز ۱ | `orders`, `auth.users` | Canonical Payment Case | RESTRICT | کاربر: Read پرداخت خود؛ تغییر مستقیم مسدود |
| **۳۰** | `payment_transactions`| مالی | فاز ۱ | `payments` | Immutable Transaction Log | RESTRICT | کاربر: Read رسید خود؛ تغییر مستقیم مسدود |
| **۳۱** | `shipping_methods` | لجستیک | فاز ۱ | — | Canonical Truth | RESTRICT | عمومی: Read فعال‌ها؛ مدیر لجستیک: Manage |
| **۳۲** | `store_settings` | تنظیمات | فاز ۱ | `auth.users` | Canonical Settings Store | RESTRICT | عمومی: Read کلیدهای عمومی؛ ادمین: Manage |
| **۳۳** | `product_serial_units`| ردیابی | فاز ۲ | `product_variants`, `warehouses`| Physical Device Tracking | RESTRICT / SET NULL | پرسنل انبار: Manage؛ تغییر فیزیکی با اسکنر |
| **۳۴** | `inventory_transfers` | انبارداری | فاز ۲ | `warehouses`, `auth.users` | Transfer Document | RESTRICT | پرسنل انبار: ایجاد و تایید حواله با مجوز |
| **۳۵** | `inventory_transfer_items`| انبار | فاز ۲ | `inventory_transfers`, `product_variants`| Transfer Lines | CASCADE / RESTRICT | پرسنل انبار: ثبت اقلام حواله |
| **۳۶** | `order_returns` | خدمات | فاز ۲ | `orders`, `order_items`, `auth.users` | RMA Lifecycle Case | RESTRICT | کاربر: ثبت مرجوعی خود؛ کارشناس: بررسی و حکم |
| **۳۷** | `payment_webhook_logs`| مالی | فاز ۲ | — | Idempotent Audit Log | RESTRICT | ادمین مالی: Read؛ درج توسط وبهوک سیستم |
| **۳۸** | `shipments` | لجستیک | فاز ۲ | `orders`, `shipping_methods`, `warehouses`| Carrier Consignment | RESTRICT | کاربر: Read مرسوله خود؛ انبار/پست: Manage |
| **۳۹** | `shipment_tracking_events`| لجستیک | فاز ۲ | `shipments` | Tracking Milestones | CASCADE | کاربر: Read مسیر بسته؛ سرویس پست: درج رویداد |
| **۴۰** | `coupons` | بازاریابی | فاز ۲ | — | Promotional Rule | RESTRICT | کاربر: اعتبارسنجی کوپن؛ مدیر مارکتینگ: Manage |
| **۴۱** | `coupon_usages` | بازاریابی | فاز ۲ | `coupons`, `orders`, `auth.users` | Redemption Audit Log | RESTRICT | کاربر: Read استفاده خود؛ درج خودکار در خرید |
| **۴۲** | `loyalty_points` | باشگاه | فاز ۲ | `auth.users` | Immutable Points Ledger | CASCADE / RESTRICT | کاربر: Read امتیازات خود؛ درج خودکار سیستمی |
| **۴۳** | `wishlists` | علاقه‌مندی | فاز ۲ | `profiles`, `products` | Customer Bookmarks | CASCADE | کاربر: CRUD نشان‌های شخصی خود |
| **۴۴** | `reviews` | نظرات | فاز ۲ | `products`, `profiles` | Moderated Content | CASCADE / SET NULL | عمومی: Read تاییدشده‌ها؛ کاربر: درج نظر خود |
| **۴۵** | `support_tickets` | پشتیبانی | فاز ۲ | `profiles`, `orders` | Support Case Thread | RESTRICT | کاربر: CRUD تیکت خود؛ پشتیبان: Manage |
| **۴۶** | `ticket_messages` | پشتیبانی | فاز ۲ | `support_tickets`, `auth.users` | Message History | CASCADE | طرفین گفتگو: درج و مشاهده پیام‌ها |
| **۴۷** | `notifications` | اعلانات | فاز ۲ | `auth.users` | Dispatch Outbox Log | RESTRICT | کاربر: Read اعلانات خود؛ سیستم: مدیریت صف |
| **۴۸** | `admin_audit_logs` | ممیزی | فاز ۲ | `auth.users` | Immutable Security Trail | RESTRICT | ادمین ارشد: Read؛ هرگونه تغییر یا حذف مسدود |
| **۴۹** | `payment_refund_attempts` | مالی | فاز ۲ | `payment_transactions` | **Canonical Ledger** | RESTRICT | منحصراً `service_role` (بانک) / مدیر مالی: Read |

**شمارش نهایی: دقیقاً ۳۲ جدول فاز اول + ۱۷ جدول فاز دوم = مجموعاً ۴۹ جدول برنامه کاربردی (public schema) + ۱ موجودیت احراز هویت خارجی (auth.users) = مجموع ۵۰ موجودیت رابطه ای.**
