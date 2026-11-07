# CNA Mobile Store — Supabase Database Architecture & Migrations (Phase 4.3)

این پوشه شامل مایگریشن‌های رسمی، اسکریپت بذردهی اولیه کاتالوگ و انبارداری و آزمون‌های اعتبارسنجی پایگاه داده فروشگاه CNA Mobile Store در PostgreSQL / Supabase می‌باشد.

---

## ۱. ترتیب و ساختار مایگریشن‌ها (Migration Execution Order)

تمامی مایگریشن‌ها به صورت ترتیبی و غیرتخریبی (Forward-Only) طراحی شده‌اند:

1. `migrations/20261107000001_core_identity_rbac.sql`
   - اکستنشن‌های اصلی (`pgcrypto`, `uuid-ossp`, `pg_trgm`).
   - جداول هویت و نقش‌ها (`auth_roles`, `profiles`, `auth_user_roles`).
   - توابع امنیتی RBAC: `auth.user_has_role(text)` و `auth.user_has_permission(text)` با مالکیت `postgres` و لغو دسترسی از `anon`.
   - سیاست‌های امنیت سطری (RLS) مدیریت نقش‌ها.

2. `migrations/20261107000002_catalog_schema.sql`
   - ساختار کامل کاتالوگ: `categories`, `brands`, `warranties`, `attribute_definitions`, `category_attributes`, `products`, `product_images`, `product_variants`, `product_attribute_values`.
   - ایندکس‌های کارایی و جستجوی تمام‌متن فارسی (GIN).
   - سیاست‌های RLS برای جلوگیری از افشای محصولات پیش‌نویس به کاربران ناشناس (`anon`).

3. `migrations/20261107000003_inventory_system.sql`
   - ساختار انبارداری چندگانه: `warehouses`, `warehouse_stock`, `stock_movements`.
   - فیلد `shelf_location VARCHAR(50)` در دفتر کل اسناد.
   - شاخص یکتای جزئی ضدتکرار بر روی `idempotency_key`.
   - تریگر محافظتی منع دستکاری و حذف اسناد دفتر کل (`trg_prevent_stock_movement_update_delete`).
   - تابع اتمیک و امن ثبت گردش انبار (`public.rpc_record_stock_movement`) مجهز به قفل‌های مشورتی تراکنشی و قفل سطری `SELECT ... FOR UPDATE`.

4. `migrations/20261107000004_storefront_view_and_storage.sql`
   - ویوی استاندارد فرانت‌اند `public.v_storefront_products` با خصوصیت `security_invoker = true` و اتصال لتِرال به تنوع پایه و مرتب‌سازی قطعی.
   - پیکربندی باکت عمومی `product-images` در Supabase Storage و سیاست‌های RLS مربوطه.

5. `seed.sql`
   - داده‌های بذردهی کانونیکال تولیدشده توسط اسکریپت `scripts/generateSeedSql.ts`.
   - شامل ۲۶ محصول، ۴۶ تنوع (SKU)، انبار مرکزی `WH-CENTRAL` و ۲۹۶ واحد موجودی اولیه با اعتبارسنجی Fail-Fast دفتر کل.

---

## ۲. نحوه اجرای مایگریشن‌ها و بذردهی (Execution Instructions)

### روش اول: استفاده از Supabase CLI (توصیه‌شده برای استقرار محلی و ابری)
```bash
# ۱. پیوند به پروژه ابری
supabase link --project-ref your-project-id

# ۲. اجرای ترتیبی مایگریشن‌ها
supabase db push

# ۳. اجرای اسکریپت بذردهی اولیه
supabase db reset # (در محیط توسعه محلی) یا اجرای seed.sql از طریق CLI
```

### روش دوم: استفاده از SQL Editor در داشبورد Supabase
۱. محتوای فایل‌های پوشه `supabase/migrations/` را به ترتیب شماره از ۱ تا ۴ در تب SQL Editor داشبورد کپی و اجرا (Run) فرمایید.
۲. محتوای فایل `supabase/seed.sql` را در تب SQL Editor اجرا نمایید. تراکنش بذردهی به صورت خودکار سلامت داده‌ها و مغایرت‌گیری انبار را ارزیابی و تأیید می‌کند.

---

## ۳. اجرای آزمون‌های خودکار دیتابیس (Automated Verification)

فایل `supabase/tests/phase_4_3_verification.sql` شامل آزمون‌های جامع یکپارچگی است:
- راستی‌آزمایی حضور دقیق ۲۶ محصول، ۴۶ تنوع و ۲۹۶ واحد موجودی.
- آزمون ممانعت تریگر از ویرایش یا حذف مستقیم اسناد دفتر کل.
- آزمون رفتار ضدتکرار (Idempotency) در تابع `rpc_record_stock_movement`.
- آزمون رد درخواست تکراری با تغییر قفسه یا تغییر تعداد.

جهت اجرا، فایل `supabase/tests/phase_4_3_verification.sql` را در SQL Editor یا از طریق `psql -f` اجرا فرمایید.

---

## ۴. بازتولید اسکریپت بذردهی از منبع کانونیکال (Regeneration)
در صورت به‌روزرسانی کاتالوگ در `src/data/canonicalCatalog.json`، می‌توانید با اجرای دستور زیر فایل `seed.sql` را مجدداً به صورت قطعی تولید نمایید:
```bash
npx tsx scripts/generateSeedSql.ts
```
