# CNA Mobile Store — Entities & Fields Data Dictionary

فرهنگ داده‌ای جامع و مشخصات فنی فیلدهای تمام ۴۸ جدول پایگاه داده فروشگاه سی‌ان‌ای در PostgreSQL / Supabase.

---

## راهنمای انواع داده‌ها و استانداردهای کلیدی
- `UUID`: شناسه یکتای جهانی ۱۲۸ بیتی استاندارد RFC 4122 با پیش‌فرض `gen_random_uuid()`.
- `BIGINT`: عدد صحیح ۶۴ بیتی با علامت — **تمامی مقادیر مالی منحصراً به صورت عدد صحیح بر حسب تومان ذخیره می‌شوند.**
- `INT`: عدد صحیح ۳۲ بیتی با علامت (تعداد، شمارش اقلام، اولویت ترتیب).
- `NUMERIC(p,s)`: عدد با دقت ثابت صرفاً برای درصدهای مالیاتی و ضرایب تخفیف (مانند `NUMERIC(5,2)`).
- `TIMESTAMPTZ`: تاریخ و زمان با منطقه زمانی (UTC / Iran Standard Time).
- `JSONB`: داده‌های ساختاریافته دودویی با قابلیت ایندکس‌گذاری.

---

## ۱. دامنه هویت و کنترل دسترسی تفکیک‌شده (Identity & RBAC)

### ۱.۱. جدول `profiles` (اطلاعات عمومی کاربر - بدون نقش سیستمی)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات و اعتبارسنجی |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | — | کلید اصلی؛ ارجاع به `auth.users(id) ON DELETE RESTRICT` |
| `phone` | `VARCHAR(15)` | NOT NULL | — | شماره موبایل یکتای ایران (الگوی `^09[0-9]{9}$`)؛ `UNIQUE` |
| `phone_verified` | `BOOLEAN` | NOT NULL | `FALSE` | وضعیت تایید پیامکی شماره موبایل از طریق OTP |
| `email` | `VARCHAR(255)` | NULL | — | آدرس ایمیل اختیاری مشتری؛ اعتبارسنجی فرمت ایمیل |
| `full_name` | `VARCHAR(150)` | NOT NULL | — | نام و نام خانوادگی به زبان فارسی |
| `national_id` | `VARCHAR(10)` | NULL | — | کد ملی ۱۰ رقمی معتبر ایران |
| `avatar_url` | `TEXT` | NULL | — | نشانی ذخیره‌سازی تصویر پروفایل در باکت Storage |
| `birth_date` | `DATE` | NULL | — | تاریخ تولد جهت آفرها و تبریک‌های مناسبتی |
| `is_suspended` | `BOOLEAN` | NOT NULL | `FALSE` | نشانگر انسداد دسترسی کاربر توسط ادمین |
| `anonymized_at` | `TIMESTAMPTZ` | NULL | — | زمان ناشناس‌سازی PII طبق سیاست‌های نگهداری داده |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان افتتاح حساب کاربری در سامانه |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان آخرین تغییر اطلاعات در پروفایل |

---

### ۱.۲. جدول `user_addresses` (نشانی‌های تحویل سفارش)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات و اعتبارسنجی |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی رکورد |
| `user_id` | `UUID` | NOT NULL | — | ارجاع به `profiles(id) ON DELETE CASCADE` |
| `title` | `VARCHAR(50)` | NOT NULL | `'منزل'` | عنوان نشانی (خانه، شرکت، انبار) |
| `recipient_name` | `VARCHAR(150)` | NOT NULL | — | نام کامل شخص تحویل‌گیرنده بسته |
| `recipient_phone`| `VARCHAR(15)` | NOT NULL | — | تلفن تماس تحویل‌گیرنده (الگوی `^09[0-9]{9}$`) |
| `province` | `VARCHAR(50)` | NOT NULL | — | نام استان |
| `city` | `VARCHAR(50)` | NOT NULL | — | نام شهر مقصد |
| `postal_code` | `VARCHAR(10)` | NOT NULL | — | کد پستی ۱۰ رقمی معتبر شرکت ملی پست |
| `address_detail` | `TEXT` | NOT NULL | — | آدرس دقیق پستی، خیابان، کوچه، پلاک، طبقه و زنگ |
| `latitude` | `NUMERIC(10,7)`| NULL | — | عرض جغرافیایی موقعیت مکانی جهت ارسال با پیک |
| `longitude` | `NUMERIC(10,7)`| NULL | — | طول جغرافیایی موقعیت مکانی جهت ارسال با پیک |
| `is_default` | `BOOLEAN` | NOT NULL | `FALSE` | نشانگر نشانی پیش‌فرض مشتری در سبد خرید |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان ثبت نشانی |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان به‌روزرسانی نشانی |

---

### ۱.۳. جدول `auth_roles` (تعریف نقش‌های رسمی سیستم)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات و اعتبارسنجی |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی نقش |
| `name` | `VARCHAR(50)` | NOT NULL | — | شناسه انگلیسی نقش؛ `UNIQUE` (`super_admin`, `warehouse_manager`, `support`, `vip`, `customer`) |
| `title_fa` | `VARCHAR(100)` | NOT NULL | — | عنوان فارسی نقش |
| `description` | `TEXT` | NULL | — | شرح قلمرو مسئولیت‌ها و دسترسی‌های این نقش |
| `is_system` | `BOOLEAN` | NOT NULL | `TRUE` | نقش‌های پیش‌فرض و غیرقابل حذف سیستمی |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان تعریف نقش در سامانه |

---

### ۱.۴. جدول `auth_permissions` (تعریف مجوزهای دانه‌ای سیستم)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات و اعتبارسنجی |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی مجوز |
| `code` | `VARCHAR(100)` | NOT NULL | — | کد انگلیسی مجوز؛ `UNIQUE` (مثال: `products:write`, `inventory:manage`) |
| `module` | `VARCHAR(50)` | NOT NULL | — | نام ماژول سازمانی (`catalog`, `orders`, `inventory`, `finance`, `security`) |
| `description_fa`| `TEXT` | NOT NULL | — | توضیح دقیق عملکردی مجوز به زبان فارسی |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان ثبت مجوز |

---

### ۱.۵. جدول `auth_role_permissions` (جدول واسط نقش‌ها و مجوزها)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات و اعتبارسنجی |
| :--- | :--- | :--- | :--- | :--- |
| `role_id` | `UUID` | NOT NULL | — | ارجاع به `auth_roles(id) ON DELETE CASCADE` |
| `permission_id` | `UUID` | NOT NULL | — | ارجاع به `auth_permissions(id) ON DELETE CASCADE` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان تخصیص مجوز به نقش |
| — | — | — | — | **کلید اصلی کامپوزیت:** `(role_id, permission_id)` |

---

### ۱.۶. جدول `auth_user_roles` (تخصیص نقش‌ها به کاربران)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات و اعتبارسنجی |
| :--- | :--- | :--- | :--- | :--- |
| `user_id` | `UUID` | NOT NULL | — | ارجاع به `auth.users(id) ON DELETE CASCADE` |
| `role_id` | `UUID` | NOT NULL | — | ارجاع به `auth_roles(id) ON DELETE RESTRICT` |
| `assigned_by` | `UUID` | NULL | — | ارجاع به کاربر ادمین صادرکننده این دسترسی |
| `assigned_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان اعطای نقش |
| — | — | — | — | **کلید اصلی کامپوزیت:** `(user_id, role_id)` |

---

## ۲. دامنه کاتالوگ، برند و طبقه‌بندی کالا (Catalog & Taxonomy)

### ۲.۱. جدول `categories` (دسته‌بندی‌های سلسله‌مراتبی)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی رده |
| `parent_id` | `UUID` | NULL | — | ارجاع خودارجاعی به `categories(id) ON DELETE RESTRICT` برای ساختار درختی |
| `slug` | `VARCHAR(100)` | NOT NULL | — | شناسه یکتای URL؛ حروف کوچک انگلیسی (`UNIQUE`) |
| `title_fa` | `VARCHAR(100)` | NOT NULL | — | عنوان فارسی دسته |
| `title_en` | `VARCHAR(100)` | NOT NULL | — | عنوان انگلیسی دسته |
| `description_fa`| `TEXT` | NULL | — | شرح کامل دسته جهت سئو |
| `icon_name` | `VARCHAR(50)` | NOT NULL | `'Folder'` | نام آیکون در کتابخانه Lucide Icons |
| `banner_url` | `TEXT` | NULL | — | تصویر هدر صفحه رده‌بندی |
| `sort_order` | `INT` | NOT NULL | `0` | ترتیب نمایش در منوها و صفحات |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | وضعیت نمایش در فروشگاه |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان ثبت رده |

---

### ۲.۲. جدول `brands` (تولیدکنندگان و برندها)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی برند |
| `name_en` | `VARCHAR(100)` | NOT NULL | — | نام رسمی برند (Apple, Samsung, Xiaomi)؛ `UNIQUE` |
| `name_fa` | `VARCHAR(100)` | NOT NULL | — | نام فارسی برند (اپل، سامسونگ، شیائومی) |
| `slug` | `VARCHAR(100)` | NOT NULL | — | شناسه سئو در آدرس اینترنتی؛ `UNIQUE` |
| `logo_url` | `TEXT` | NULL | — | نشانی لوگوی برند |
| `website_url` | `TEXT` | NULL | — | وب‌سایت مرجع سازنده |
| `is_featured` | `BOOLEAN` | NOT NULL | `FALSE` | نمایش در اسلایدر برندهای برگزیده |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان ثبت برند |

---

### ۲.۳. جدول `products` (موجودیت اصلی کاتالوگ کالا)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی محصول |
| `category_id` | `UUID` | NOT NULL | — | ارجاع به `categories(id) ON DELETE RESTRICT` |
| `brand_id` | `UUID` | NOT NULL | — | ارجاع به `brands(id) ON DELETE RESTRICT` |
| `slug` | `VARCHAR(150)` | NOT NULL | — | شناسه یکتای پیوند کالا؛ `UNIQUE` |
| `title_fa` | `VARCHAR(255)` | NOT NULL | — | عنوان فارسی دقیق محصول |
| `title_en` | `VARCHAR(255)` | NOT NULL | — | عنوان انگلیسی رسمی محصول |
| `model_name` | `VARCHAR(100)` | NOT NULL | — | نام مدل بازاریابی (مثال: iPhone 16 Pro Max) |
| `description_fa`| `TEXT` | NULL | — | نقد و بررسی جامع کالا |
| `specs_summary` | `JSONB` | NOT NULL | `'{}'::jsonb` | **پروجکشن کش‌شده برای رندر سریع؛ مرجع کانونیکال جدول product_attribute_values است** |
| `badge` | `VARCHAR(50)` | NULL | — | نشان اختصاصی (پیشنهاد ویژه، رجیسترشده) |
| `rating_average`| `NUMERIC(3,2)` | NOT NULL | `0.00` | میانگین امتیاز نظرات تاییدشده (۱ تا ۵) |
| `reviews_count` | `INT` | NOT NULL | `0` | تعداد کل نظرات ثبت‌شده |
| `is_published` | `BOOLEAN` | NOT NULL | `TRUE` | وضعیت انتشار در فروشگاه |
| `is_featured` | `BOOLEAN` | NOT NULL | `FALSE` | نمایش در بنرهای ویژه صفحه اول |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان درج کالا در کاتالوگ |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان آخرین به‌روزرسانی کالا |

---

### ۲.۴. جدول `product_images` (گالری تصاویر محصول)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی تصویر |
| `product_id` | `UUID` | NOT NULL | — | ارجاع به `products(id) ON DELETE CASCADE` |
| `image_url` | `TEXT` | NOT NULL | — | نشانی ذخیره‌سازی فایل تصویر در Storage |
| `alt_text_fa` | `VARCHAR(255)` | NULL | — | متن جایگزین تصویر برای سئو |
| `is_cover` | `BOOLEAN` | NOT NULL | `FALSE` | آیا تصویر اصلی و کاور محصول است؟ |
| `sort_order` | `INT` | NOT NULL | `0` | ترتیب نمایش در اسلایدر گالری |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان آپلود تصویر |

---

## ۳. دامنه مشخصات فنی و فیلترهای کانونیکال (Canonical Specifications)

### ۳.۱. جدول `attribute_definitions` (تعریف ویژگی‌های استاندارد)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی ویژگی |
| `code` | `VARCHAR(50)` | NOT NULL | — | کد سیستمی یکتا؛ حروف کوچک (`ram`, `storage`, `battery`, `screen_size`) |
| `name_fa` | `VARCHAR(100)` | NOT NULL | — | نام فارسی ویژگی |
| `name_en` | `VARCHAR(100)` | NOT NULL | — | نام انگلیسی ویژگی |
| `data_type` | `VARCHAR(20)` | NOT NULL | `'text'` | نوع داده مقادیر (`text`, `number`, `boolean`, `select`) |
| `unit` | `VARCHAR(30)` | NULL | — | واحد اندازه‌گیری (گیگابایت، میلی‌آمپرساعت، اینچ، هرتز) |
| `is_filterable` | `BOOLEAN` | NOT NULL | `TRUE` | قابلیت استفاده در نوار فیلترهای کناری صفحه کاتالوگ |
| `is_searchable` | `BOOLEAN` | NOT NULL | `FALSE` | شرکت مستقیم در کوئری‌های جستجوی متنی |
| `sort_order` | `INT` | NOT NULL | `0` | ترتیب چینش در تب مشخصات فنی |

---

### ۳.۲. جدول `category_attributes` (تخصیص ویژگی‌ها به دسته‌بندی‌ها)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `category_id` | `UUID` | NOT NULL | — | ارجاع به `categories(id) ON DELETE CASCADE` |
| `attribute_id` | `UUID` | NOT NULL | — | ارجاع به `attribute_definitions(id) ON DELETE CASCADE` |
| `is_required` | `BOOLEAN` | NOT NULL | `FALSE` | اجباری بودن درج این ویژگی هنگام ایجاد محصول جدید |
| `is_primary_filter`| `BOOLEAN`| NOT NULL | `FALSE` | نمایش در ردیف بالایی فیلترهای سریع |
| — | — | — | — | **کلید اصلی کامپوزیت:** `(category_id, attribute_id)` |

---

### ۳.۳. جدول `product_attribute_values` (مرجع قطعی و کانونیکال مشخصات فنی کالا)
> [!IMPORTANT]
> **Canonical Source of Truth:** این جدول تنها مرجع رسمی مقادیر مشخصات فنی است که فیلترهای بازه‌ای عددی و گزینه‌ای از روی آن ایندکس‌گذاری شده‌اند.

| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی مقدار |
| `product_id` | `UUID` | NOT NULL | — | ارجاع به `products(id) ON DELETE CASCADE` |
| `attribute_id` | `UUID` | NOT NULL | — | ارجاع به `attribute_definitions(id) ON DELETE RESTRICT` |
| `value_text` | `TEXT` | NULL | — | مقدار متنی مشخصه (مثال: `'Super Retina XDR'`) |
| `value_number` | `NUMERIC(12,2)`| NULL | — | مقدار عددی جهت فیلتر بازه‌ای (مثال: `256.00` برای گیگابایت) |
| `value_boolean`| `BOOLEAN` | NULL | — | مقدار دوحالته (مثال: `TRUE` برای پشتیبانی شارژ وایرلس) |
| — | — | — | — | **محدودیت یکتایی کامپوزیت:** `UNIQUE (product_id, attribute_id)` |

---

## ۴. تنوع کالا، گارانتی پویا و ردیابی شماره سریال IMEI (Variants & Serials)

### ۴.۱. جدول `warranties` (شرکت‌های ارائه‌دهنده گارانتی با مدت‌زمان پویا)
> [!IMPORTANT]
> **Configurable Warranty Duration:** مدت اعتبار گارانتی هرگز ثابت نبوده و با فیلد `duration_months` برای هر شرکت یا طرح به صورت پویا (۶، ۱۲، ۱۸، ۲۴، ۳۶ ماه) تنظیم می‌گردد.

| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی گارانتی |
| `provider_name` | `VARCHAR(150)` | NOT NULL | — | نام شرکت گارانتی‌کننده (مدیاپردازش، حامی، داریا همراه) |
| `duration_months`| `INT` | NOT NULL | `18` | **مدت اعتبار ضمانت‌نامه به ماه (قابل پیکربندی و پویا)** |
| `coverage_fa` | `TEXT` | NOT NULL | — | شرح موارد مشمول گارانتی و تعویض |
| `terms_url` | `TEXT` | NULL | — | آدرس شرایط مندرج در سایت رسمی شرکت |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | فعال بودن جهت انتخاب روی کالاها |

---

### ۴.۲. جدول `product_variants` (واحدهای نگهداری موجودی - SKUs)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی تنوع کالا (SKU ID) |
| `product_id` | `UUID` | NOT NULL | — | ارجاع به `products(id) ON DELETE CASCADE` |
| `warranty_id` | `UUID` | NOT NULL | — | ارجاع به `warranties(id) ON DELETE RESTRICT` |
| `sku` | `VARCHAR(100)` | NOT NULL | — | کد یکتای سازمانی کالا؛ `UNIQUE` |
| `barcode` | `VARCHAR(50)` | NULL | — | بارکد بین‌المللی EAN/UPC یا کد چاپ لیبل زبرا |
| `color_name_fa`| `VARCHAR(50)` | NOT NULL | — | نام فارسی رنگ (تیتانیوم صحرایی) |
| `color_name_en`| `VARCHAR(50)` | NOT NULL | — | نام انگلیسی رنگ (Desert Titanium) |
| `color_hex` | `VARCHAR(7)` | NOT NULL | — | کد هگزادسیمال رنگ استاندارد وب |
| `storage` | `VARCHAR(30)` | NOT NULL | — | ظرفیت حافظه داخلی (128GB, 256GB, 512GB) |
| `ram` | `VARCHAR(30)` | NULL | — | ظرفیت حافظه موقت رم (8GB, 12GB) |
| `part_number` | `VARCHAR(50)` | NULL | — | پارت‌نامبر کشوری دستگاه (CH/A, ZA/A, ZP/A) |
| `sim_type` | `VARCHAR(50)` | NOT NULL | `'Dual SIM (Physical)'`| نوع سیم‌کارت |
| `price_toman` | `BIGINT` | NOT NULL | — | **قیمت روز فروش به عدد صحیح تومان (BIGINT)** |
| `original_price_toman` | `BIGINT` | NULL | — | **قیمت قبل از تخفیف به عدد صحیح تومان (BIGINT)** |
| `cost_price_toman` | `BIGINT` | NOT NULL | `0` | **قیمت تمام‌شده خرید به عدد صحیح تومان (BIGINT)** |
| `is_published` | `BOOLEAN` | NOT NULL | `TRUE` | وضعیت نمایش در ویترین فروشگاه |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان ساخت SKU |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان به‌روزرسانی مشخصات تنوع |

---

### ۴.۳. جدول `product_serial_units` (ردیابی فیزیکی دستگاه، IMEI و گارانتی پویا)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی دستگاه |
| `variant_id` | `UUID` | NOT NULL | — | ارجاع به `product_variants(id) ON DELETE RESTRICT` |
| `warehouse_id` | `UUID` | NOT NULL | — | ارجاع به `warehouses(id) ON DELETE RESTRICT` |
| `imei1` | `VARCHAR(18)` | NOT NULL | — | شناسه ۱۵ رقمی IMEI اول دستگاه؛ `UNIQUE` |
| `imei2` | `VARCHAR(18)` | NULL | — | شناسه ۱۵ رقمی IMEI دوم (برای گوشی‌های دوسیم‌کارت) |
| `serial_number` | `VARCHAR(50)` | NOT NULL | — | شماره سریال درج‌شده روی جعبه؛ `UNIQUE` |
| `status` | `VARCHAR(20)` | NOT NULL | `'in_stock'` | وضعیت: `'in_stock'`, `'reserved'`, `'sold'`, `'defective'`, `'returned'` |
| `order_item_id` | `UUID` | NULL | — | ارجاع به قلم سفارشی که این دستگاه به آن اختصاص یافته است |
| `purchase_invoice_ref`| `VARCHAR(100)`| NULL| — | شماره بارنامه یا فاکتور خرید ورودی به انبار |
| `warranty_duration_months`| `INT` | NULL | — | مدت گارانتی اختصاصی این دستگاه به ماه (در صورت بازتعریف) |
| `warranty_start_date` | `DATE` | NULL | — | تاریخ آغاز رسمی گارانتی (برابر با تاریخ تحویل مرسوله) |
| `warranty_end_date` | `DATE` | NULL | — | تاریخ انقضای گارانتی (محاسبه خودکار از روی مدت ماه) |
| `received_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | تاریخ ورود کالا به انبار |
| `sold_at` | `TIMESTAMPTZ` | NULL | — | تاریخ قطعی خروج و ارسال به مشتری |

---

## ۵. مدیریت انبارداری چندگانه و اسناد جابه‌جایی کالا (Multi-Warehouse Inventory)

### ۵.۱. جدول `warehouses` (مراکز انبارداری و توزیع)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی انبار |
| `code` | `VARCHAR(20)` | NOT NULL | — | کد اختصاری یکتا (مثال: `'WH-CENTRAL'`)؛ `UNIQUE` |
| `name_fa` | `VARCHAR(100)` | NOT NULL | — | نام کامل فارسی (انبار مرکزی تهران) |
| `address` | `TEXT` | NOT NULL | — | آدرس دقیق محل استقرار فیزیکی انبار |
| `postal_code` | `VARCHAR(10)` | NOT NULL | — | کد پستی انبار |
| `phone` | `VARCHAR(15)` | NOT NULL | — | شماره تماس ثابت انبار |
| `manager_name` | `VARCHAR(100)` | NOT NULL | — | نام مدیر مسئول انبار |
| `is_central` | `BOOLEAN` | NOT NULL | `FALSE` | آیا انبار مرجع اصلی توزیع کشور است؟ |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | وضعیت فعالیت عملیاتی انبار |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | تاریخ تاسیس رکورد انبار |

---

### ۵.۲. جدول `warehouse_stock` (پروجکشن وضعیت موجودی در هر انبار)
> [!IMPORTANT]
> **Materialized Projection Only:** این جدول تنها یک پروجکشن ماتریالایزشده است؛ مرجع کانونیکال حقیقت `stock_movements` می‌باشد. تغییر مستقیم توسط کلاینت مسدود است.

| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی پروجکشن موجودی |
| `warehouse_id` | `UUID` | NOT NULL | — | ارجاع به `warehouses(id) ON DELETE RESTRICT` |
| `variant_id` | `UUID` | NOT NULL | — | ارجاع به `product_variants(id) ON DELETE RESTRICT` |
| `shelf_location`| `VARCHAR(50)` | NOT NULL | `'UNASSIGNED'` | کد قفسه فیزیکی چیدمان (مثال: `WH-C-A3-R12`) |
| `quantity_on_hand`| `INT` | NOT NULL | `0` | موجودی فیزیکی شمارش‌شده (`CHECK >= 0`) |
| `reserved_qty` | `INT` | NOT NULL | `0` | تعداد رزروشده جاری در فرآیند پرداخت (`CHECK >= 0`) |
| `min_stock_alert`| `INT` | NOT NULL | `5` | آستانه هشدار کسری موجودی کالا |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان آخرین تغییر موجودی |
| — | — | — | — | **محدودیت یکتایی کامپوزیت:** `UNIQUE (warehouse_id, variant_id)` |

---

### ۵.۳. جدول `stock_movements` (دفتر کل کانونیکال و تغییرناپذیر گردش انبار)
> [!IMPORTANT]
> **Canonical Immutable Ledger:** تمامی رویدادها شامل سند افتتاحیه موجودی (`opening_balance`)، اسناد جفتی انتقال و فاکتورها به صورت ضمیمه‌شدنی ثبت می‌شوند. تغییر مستقیم توسط کلاینت مسدود است.

| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی سند گردش انبار |
| `warehouse_id` | `UUID` | NOT NULL | — | ارجاع به `warehouses(id) ON DELETE RESTRICT` |
| `variant_id` | `UUID` | NOT NULL | — | ارجاع به `product_variants(id) ON DELETE RESTRICT` |
| `quantity_change`| `INT` | NOT NULL | — | تغییر موجودی (مثبت برای ورود کالا، منفی برای خروج) |
| `balance_after` | `INT` | NOT NULL | — | مانده فیزیکی کل موجودی انبار پس از اعمال سند با قفل سطری |
| `movement_type` | `VARCHAR(30)` | NOT NULL | — | نوع سند: `'opening_balance'`, `'purchase_inflow'`, `'order_sale'`, `'customer_return'`, `'transfer_out'`, `'transfer_in'`, `'inventory_audit_adjustment'` |
| `reference_type`| `VARCHAR(30)` | NOT NULL | — | نام جدول مبدا: `'orders'`, `'inventory_transfers'`, `'order_returns'` |
| `reference_id` | `UUID` | NULL | — | کلید شناسه رکورد مرتبط با سند |
| `operator_id` | `UUID` | NOT NULL | — | کاربری که سند را ثبت کرده است (`auth.users(id)`) |
| `notes` | `TEXT` | NULL | — | توضیحات انبارداری یا شماره فاکتور ورودی |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان دقیق ثبت قطعی سند در انبار |

---

### ۵.۴. جدول `stock_reservations` (رزروهای اتمیک کالا در فرآیند پرداخت)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی شناسه رزرو |
| `warehouse_id` | `UUID` | NOT NULL | — | ارجاع به `warehouses(id) ON DELETE RESTRICT` |
| `variant_id` | `UUID` | NOT NULL | — | ارجاع به `product_variants(id) ON DELETE RESTRICT` |
| `user_id` | `UUID` | NOT NULL | — | مشتری ایجادکننده رزرو |
| `cart_id` | `UUID` | NULL | — | شناسه سبد خرید مرجع |
| `order_id` | `UUID` | NULL | — | شناسه سفارش هدایت‌شده به درگاه |
| `quantity` | `INT` | NOT NULL | `1` | تعداد واحد رزروشده کالا (`CHECK (quantity > 0)`) |
| `status` | `VARCHAR(20)` | NOT NULL | `'active'` | وضعیت: `'active'`, `'fulfilled'`, `'cancelled'`, `'expired'` |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | — | زمان پایان اعتبار رزرو (۱۵ دقیقه پس از ایجاد) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان اولیه رزرو کالا |

---

### ۵.۵. جدول `inventory_transfers` (حواله‌های انتقال بین‌انباری)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی حواله |
| `transfer_number`| `VARCHAR(32)`| NOT NULL | — | شماره سند رسمی انتقال؛ `UNIQUE` |
| `source_warehouse_id`| `UUID` | NOT NULL | — | ارجاع به انبار مبدا |
| `target_warehouse_id`| `UUID` | NOT NULL | — | ارجاع به انبار مقصد |
| `status` | `VARCHAR(20)` | NOT NULL | `'draft'` | وضعیت: `'draft'`, `'in_transit'`, `'completed'`, `'cancelled'` |
| `initiated_by` | `UUID` | NOT NULL | — | کاربری که حواله را ایجاد کرده |
| `received_by` | `UUID` | NULL | — | کاربری که تحویل در مقصد را تایید کرده |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان صدور حواله |
| `completed_at` | `TIMESTAMPTZ` | NULL | — | زمان قطعی رسیدن و ثبت اسناد جفتی در مقصد |

---

### ۵.۶. جدول `inventory_transfer_items` (اقلام مندرج در حواله انتقال)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی قلم حواله |
| `transfer_id` | `UUID` | NOT NULL | — | ارجاع به `inventory_transfers(id) ON DELETE CASCADE` |
| `variant_id` | `UUID` | NOT NULL | — | ارجاع به `product_variants(id) ON DELETE RESTRICT` |
| `quantity_requested`| `INT` | NOT NULL | — | تعداد درخواست‌شده (`CHECK > 0`) |
| `quantity_received` | `INT` | NOT NULL | `0` | تعداد کالای سالم تحویل‌گرفته‌شده در مقصد |
| `notes` | `TEXT` | NULL | — | گزارش کسری یا مغایرت احتمالی |

---

## ۶. سبد خرید و نشانه‌ها (Carts & Wishlists)

### ۶.۱. جدول `carts` (سبدهای خرید فعال و مهمان)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی سبد خرید |
| `user_id` | `UUID` | NULL | — | ارجاع به کاربر (`profiles(id)`)؛ در سبد مهمان `NULL` است |
| `session_token`| `VARCHAR(64)` | NULL | — | شناسه توکن کوکی برای مشتریان مهمان قبل از ورود |
| `status` | `VARCHAR(20)` | NOT NULL | `'active'` | وضعیت سبد: `'active'`, `'merged'`, `'converted'` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان ساخت سبد |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان آخرین تغییر سبد |

---

### ۶.۲. جدول `cart_items` (اقلام داخل سبد خرید)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی قلم سبد |
| `cart_id` | `UUID` | NOT NULL | — | ارجاع به `carts(id) ON DELETE CASCADE` |
| `variant_id` | `UUID` | NOT NULL | — | ارجاع به `product_variants(id) ON DELETE CASCADE` |
| `quantity` | `INT` | NOT NULL | `1` | تعداد انتخابی خریدار (`CHECK (quantity > 0)`) |
| `added_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان افزودن کالا به سبد |
| — | — | — | — | **محدودیت یکتایی کامپوزیت:** `UNIQUE (cart_id, variant_id)` |

---

### ۶.۳. جدول `wishlists` (علاقه‌مندی‌ها و لیست خرید بعدی)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی نشان |
| `user_id` | `UUID` | NOT NULL | — | ارجاع به `profiles(id) ON DELETE CASCADE` |
| `product_id` | `UUID` | NOT NULL | — | ارجاع به `products(id) ON DELETE CASCADE` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان ذخیره در علاقه‌مندی‌ها |
| — | — | — | — | **محدودیت یکتایی کامپوزیت:** `UNIQUE (user_id, product_id)` |

---

## ۷. سفارشات، اقلام منجمد و تاریخچه گردش کار (Orders & Fulfillments)

### ۷.۱. جدول `orders` (هدر اصلی سفارشات مشتری)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی داخلی سیستم |
| `order_number` | `VARCHAR(32)` | NOT NULL | — | شماره سفارش مشتری؛ `UNIQUE` (تولید با سال پویا: `CNA-{YEAR}-{SEQ}`) |
| `user_id` | `UUID` | NOT NULL | — | ارجاع به `auth.users(id) ON DELETE RESTRICT` |
| `status` | `VARCHAR(35)` | NOT NULL | `'pending_payment'`| وضعیت: `'pending_payment'`, `'paid'`, `'processing'`, `'packed'`, `'shipped'`, `'delivered'`, `'cancelled'`, `'refunded'`, `'stock_exhausted_pending_refund'` |
| `subtotal_toman` | `BIGINT` | NOT NULL | — | **جمع کل اقلام قبل از تخفیف به عدد صحیح تومان (BIGINT)** |
| `discount_toman` | `BIGINT` | NOT NULL | `0` | **کل مبلغ تخفیف اعمال‌شده به عدد صحیح تومان (BIGINT)** |
| `tax_amount_toman`| `BIGINT` | NOT NULL | `0` | **مبلغ مالیات به عدد صحیح تومان (BIGINT)** |
| `shipping_cost_toman`| `BIGINT`| NOT NULL | `0` | **هزینه حمل و نقل به عدد صحیح تومان (BIGINT)** |
| `total_amount_toman`| `BIGINT` | NOT NULL | — | **مبلغ نهایی پرداختی به عدد صحیح تومان (BIGINT)** |
| `tax_rule_id` | `UUID` | NULL | — | ارجاع به قانون مالیاتی اعمال‌شده روی سفارش |
| `shipping_method_id`| `UUID` | NOT NULL | — | ارجاع به روش انتخابی ارسال |
| `shipping_address_snapshot`| `JSONB`| NOT NULL | — | رونوشت منجمد آدرس و مشخصات تحویل‌گیرنده در لحظه خرید |
| `customer_notes` | `TEXT` | NULL | — | یادداشت مشتری |
| `admin_notes` | `TEXT` | NULL | — | یادداشت‌های اداری پشتیبانی |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان ثبت سفارش در سیستم |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان آخرین تغییر وضعیت سفارش |

---

### ۷.۲. جدول `order_items` (اقلام سفارش با عکس‌برداری تاریخی تغییرناپذیر)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی ردیف فاکتور |
| `order_id` | `UUID` | NOT NULL | — | ارجاع به `orders(id) ON DELETE CASCADE` |
| `product_id` | `UUID` | NOT NULL | — | ارجاع به `products(id) ON DELETE RESTRICT` |
| `variant_id` | `UUID` | NOT NULL | — | ارجاع به `product_variants(id) ON DELETE RESTRICT` |
| `title_fa_snapshot`| `VARCHAR(255)`| NOT NULL | — | رونوشت نام فارسی کالا در زمان ثبت |
| `title_en_snapshot`| `VARCHAR(255)`| NOT NULL | — | رونوشت نام انگلیسی کالا در زمان ثبت |
| `sku_snapshot` | `VARCHAR(100)`| NOT NULL | — | رونوشت کد SKU کالا در زمان خرید |
| `color_name_snapshot`| `VARCHAR(50)`| NOT NULL | — | نام فارسی رنگ خریداری‌شده |
| `storage_snapshot`| `VARCHAR(30)` | NOT NULL | — | ظرفیت حافظه خریداری‌شده |
| `warranty_name_snapshot`| `VARCHAR(150)`| NOT NULL | — | نام شرکت و مدت گارانتی در زمان خرید |
| `unit_original_price_toman`| `BIGINT`| NOT NULL | — | **قیمت واحد اصلی قبل از تخفیف به تومان (BIGINT)** |
| `unit_discount_toman`| `BIGINT`| NOT NULL | `0` | **مبلغ تخفیف هر واحد به تومان (BIGINT)** |
| `unit_selling_price_toman`| `BIGINT`| NOT NULL | — | **قیمت خالص خرید هر واحد پس از تخفیف به تومان (BIGINT)** |
| `tax_rate_percent` | `NUMERIC(5,2)`| NOT NULL | `0.00` | نرخ مالیات اعمال‌شده در زمان خرید |
| `tax_amount_toman` | `BIGINT` | NOT NULL | `0` | **مبلغ کل مالیات این ردیف به تومان (BIGINT)** |
| `quantity` | `INT` | NOT NULL | — | تعداد سفارش‌داده‌شده (`CHECK (quantity > 0)`) |
| `total_line_amount_toman`| `BIGINT`| NOT NULL | — | **مبلغ کل ردیف فاکتور به تومان (BIGINT)** |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان ثبت رکورد |

---

### ۷.۳. جدول `order_status_history` (لاگ تغییرناپذیر فرآیند گردش سفارش)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی لاگ وضعیت |
| `order_id` | `UUID` | NOT NULL | — | ارجاع به `orders(id) ON DELETE CASCADE` |
| `previous_status` | `VARCHAR(35)` | NULL | — | وضعیت پیشین سفارش |
| `new_status` | `VARCHAR(35)` | NOT NULL | — | وضعیت جدید سفارش پس از تغییر |
| `actor_id` | `UUID` | NULL | — | کاربری که تغییر را اعمال کرده (`NULL` برای وب‌هوک) |
| `comment` | `TEXT` | NULL | — | شرح علت تغییر وضعیت یا کد رهگیری پستی |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان رخداد تغییر وضعیت |

---

### ۷.۴. جدول `order_returns` (درخواست‌های استرداد کالا و مرجوعی - RMA)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی مرجوعی |
| `return_number` | `VARCHAR(32)` | NOT NULL | — | کد پیگیری مرجوعی؛ `UNIQUE` |
| `order_id` | `UUID` | NOT NULL | — | ارجاع به `orders(id) ON DELETE RESTRICT` |
| `order_item_id` | `UUID` | NOT NULL | — | ارجاع به قلم فاکتور مرجوع‌شده |
| `user_id` | `UUID` | NOT NULL | — | مشتری درخواست‌دهنده |
| `reason` | `VARCHAR(50)` | NOT NULL | — | علت: `defect`, `wrong_item`, `change_of_mind`, `damaged_in_transit` |
| `customer_comment`| `TEXT` | NOT NULL | — | شرح تفصیلی مشکل از زبان مشتری |
| `evidence_images` | `JSONB` | NOT NULL | `'[]'::jsonb` | تصاویر و ویدئوهای ارسالی مشتری |
| `status` | `VARCHAR(20)` | NOT NULL | `'requested'` | وضعیت: `'requested'`, `'approved'`, `'shipped_back'`, `'inspected'`, `'refunded'`, `'rejected'` |
| `refund_amount_toman`| `BIGINT`| NOT NULL | `0` | **مبلغ تاییدشده استرداد به عدد صحیح تومان (BIGINT)** |
| `serial_unit_id` | `UUID` | NULL | — | ارجاع به شناسه فیزیکی دستگاه عودت‌داده‌شده |
| `resolved_by` | `UUID` | NULL | — | کارشناس فنی رسیدگی‌کننده |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | تاریخ ثبت تقاضای مرجوعی |
| `resolved_at` | `TIMESTAMPTZ` | NULL | — | تاریخ پایان رسیدگی |

---

## ۸. مالیات، کیف پول، فاکتور رسمی و پرداخت‌ها (Finance & Payments)

### ۸.۱. جدول `tax_rules` (موتور قوانین مالیاتی پویا و با تاریخ اعتبار)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی قانون مالیاتی |
| `code` | `VARCHAR(50)` | NOT NULL | — | کد سیستمی؛ `UNIQUE` (مثال: `'VAT-1403'`) |
| `name_fa` | `VARCHAR(100)` | NOT NULL | — | نام فارسی مصوبه |
| `rate_percent` | `NUMERIC(5,2)` | NOT NULL | — | درصد نرخ مالیات (مثال: `10.00` یا `9.00`) |
| `effective_from` | `TIMESTAMPTZ` | NOT NULL | — | آغاز تاریخ اجرای مصوبه |
| `effective_to` | `TIMESTAMPTZ` | NULL | — | پایان اعتبار مصوبه |
| `applies_to_shipping`| `BOOLEAN` | NOT NULL | `FALSE`| آیا مالیات شامل خدمات پست هم می‌شود؟ |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | وضعیت فعال بودن برای اعمال در سبدها |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان ثبت مصوبه |

---

### ۸.۲. جدول `wallets` (حساب‌های ریالی و کیف پول مشتریان)
> [!IMPORTANT]
> **Materialized Balance Projection Only:** مانده این جدول صرفاً کش ماتریالایزشده است؛ مرجع کانونیکال حقیقت `wallet_transactions` است. تغییر مستقیم توسط کلاینت مسدود است.

| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی کیف پول |
| `user_id` | `UUID` | NOT NULL | — | ارجاع به `auth.users(id) ON DELETE RESTRICT`؛ `UNIQUE` |
| `cached_balance_toman`| `BIGINT`| NOT NULL | `0` | **مانده کش‌شده به عدد صحیح تومان (BIGINT)** |
| `is_locked` | `BOOLEAN` | NOT NULL | `FALSE` | قفل موقت حساب به دستور پشتیبانی |
| `currency` | `VARCHAR(10)` | NOT NULL | `'TOMAN'` | واحد پولی رسمی |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان افتتاح کیف پول |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان آخرین تغییر موجودی |

---

### ۸.۳. جدول `wallet_transactions` (دفتر کل تراکنش‌های کیف پول - Canonical Sub-Ledger)
> [!IMPORTANT]
> **Canonical Wallet Ledger:** تمامی تراکنش‌های افزایش و کاهش به صورت اتمیک توسط تابع RPC در این جدول درج شده و مانده جدید محاسبه می‌گردد. تغییر مستقیم توسط کلاینت مسدود است.

| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی سند تراکنش کیف پول |
| `wallet_id` | `UUID` | NOT NULL | — | ارجاع به `wallets(id) ON DELETE RESTRICT` |
| `amount_toman` | `BIGINT` | NOT NULL | — | **مبلغ تراکنش به تومان (مثبت: واریز، منفی: برداشت) (BIGINT)** |
| `balance_after_toman`| `BIGINT`| NOT NULL | — | **مانده قطعی کیف پول پس از ثبت تراکنش به تومان (BIGINT)** |
| `transaction_type`| `VARCHAR(20)`| NOT NULL | — | نوع سند: `'credit'`, `'debit'` |
| `category` | `VARCHAR(35)` | NOT NULL | — | سرفصل: `'gateway_deposit'`, `'order_payment'`, `'refund'`, `'cashback'`, `'late_payment_refund'`, `'admin_adjustment'` |
| `reference_type`| `VARCHAR(30)` | NULL | — | جدول مرتبط: `'orders'`, `'payments'`, `'order_returns'` |
| `reference_id` | `UUID` | NULL | — | شناسه رکورد مرتبط |
| `description_fa`| `TEXT` | NOT NULL | — | شرح فارسی سند |
| `created_by` | `UUID` | NULL | — | ثبت‌کننده (سیستم یا ادمین مالی) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان دقیق ثبت حسابداری تراکنش |

---

### ۸.۴. جدول `invoices` (صورتحساب‌های الکترونیکی رسمی فروشگاه)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی فاکتور |
| `invoice_number` | `VARCHAR(32)` | NOT NULL | — | شماره رسمی فاکتور؛ `UNIQUE` (تولید با سال پویا) |
| `order_id` | `UUID` | NOT NULL | — | ارجاع به `orders(id) ON DELETE RESTRICT`؛ `UNIQUE` |
| `user_id` | `UUID` | NOT NULL | — | ارجاع به `auth.users(id) ON DELETE RESTRICT` |
| `buyer_name` | `VARCHAR(150)` | NOT NULL | — | نام کامل شخص حقیقی یا حقوقی خریدار |
| `buyer_national_id`| `VARCHAR(14)`| NOT NULL | — | کد ملی خریدار حقیقی یا شناسه ملی شرکت |
| `buyer_economic_code`| `VARCHAR(14)`| NULL | — | کد اقتصادی شرکت خریدار |
| `buyer_postal_code`| `VARCHAR(10)`| NOT NULL | — | کد پستی محل سکونت یا اقامتگاه خریدار |
| `subtotal_toman` | `BIGINT` | NOT NULL | — | **جمع اقلام فاکتور قبل از مالیات به تومان (BIGINT)** |
| `discount_toman` | `BIGINT` | NOT NULL | `0` | **کل تخفیفات اعمال‌شده به تومان (BIGINT)** |
| `vat_amount_toman`| `BIGINT` | NOT NULL | — | **مالیات فاکتور به تومان (BIGINT)** |
| `total_amount_toman`| `BIGINT` | NOT NULL | — | **مبلغ نهایی صورتحساب به تومان (BIGINT)** |
| `tax_system_ref`| `VARCHAR(50)` | NULL | — | شناسه یکتای صورتحساب مالیاتی |
| `status` | `VARCHAR(20)` | NOT NULL | `'issued'` | وضعیت: `'issued'`, `'reported'`, `'cancelled'` |
| `issued_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | تاریخ و زمان صدور فاکتور |

---

### ۸.۵. جدول `payments` (پرونده‌های پرداخت سفارشات)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی پرونده پرداخت |
| `order_id` | `UUID` | NOT NULL | — | ارجاع به `orders(id) ON DELETE RESTRICT` |
| `user_id` | `UUID` | NOT NULL | — | ارجاع به `auth.users(id) ON DELETE RESTRICT` |
| `amount_toman` | `BIGINT` | NOT NULL | — | **کل مبلغ الزامی جهت تسویه به عدد صحیح تومان (BIGINT)** |
| `method` | `VARCHAR(30)` | NOT NULL | — | شیوه: `'online_ipg'`, `'wallet'`, `'installment'`, `'pos_on_delivery'` |
| `status` | `VARCHAR(20)` | NOT NULL | `'pending'` | وضعیت: `'pending'`, `'completed'`, `'failed'`, `'refunded'`, `'refund_pending'` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان ایجاد رکورد پرداخت |
| `completed_at` | `TIMESTAMPTZ` | NULL | — | زمان تسویه موفق وجه |

---

### ۸.۶. جدول `payment_transactions` (تراکنش‌های درگاه پرداخت)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی تراکنش |
| `payment_id` | `UUID` | NOT NULL | — | ارجاع به `payments(id) ON DELETE RESTRICT` |
| `gateway` | `VARCHAR(50)` | NOT NULL | — | درگاه پرداختی: `'mellat'`, `'saman'`, `'zarinpal'`, `'sadad'` |
| `amount_toman` | `BIGINT` | NOT NULL | — | **مبلغ ارسالی به درگاه پرداخت به عدد صحیح تومان (BIGINT)** |
| `authority_token`| `VARCHAR(100)`| NOT NULL | — | توکن دریافتی از بانک جهت ریدایرکت مشتری |
| `idempotency_key`| `VARCHAR(100)`| NOT NULL | — | کلید یکتای ضدتکرار تراکنش |
| `status` | `VARCHAR(20)` | NOT NULL | `'initiated'` | وضعیت: `'initiated'`, `'success'`, `'failed'`, `'verified'` |
| `shaparak_rrn` | `VARCHAR(50)` | NULL | — | شماره ارجاع شاپرک (Retrieval Reference Number) |
| `trace_number` | `VARCHAR(50)` | NULL | — | شماره پیگیری تراکنش در بانک صادرکننده |
| `masked_pan` | `VARCHAR(20)` | NULL | — | شماره کارت ماسک‌شده مشتری |
| `raw_response` | `JSONB` | NULL | — | رونوشت کامل پاسخ وب‌سرویس بانک |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان هدایت کاربر به صفحه بانک |
| `verified_at` | `TIMESTAMPTZ` | NULL | — | زمان استعلام و تایید نهایی تراکنش |

---

### ۸.۷. جدول `payment_webhook_logs` (لاگ‌های امنیتی وبهوک درگاه‌ها و ضدتکرار)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی لاگ |
| `gateway` | `VARCHAR(50)` | NOT NULL | — | نام درگاه ارسال‌کننده رویداد |
| `idempotency_key`| `VARCHAR(100)`| NOT NULL | — | کلید ضدتکرار؛ `UNIQUE` جهت جلوگیری از شارژ یا پردازش دوباره |
| `payload` | `JSONB` | NOT NULL | — | بدنه پیام وب‌هوک دریافتی از درگاه |
| `ip_address` | `INET` | NOT NULL | — | آدرس آی‌پی سرور ارسال‌کننده وب‌هوک |
| `status_code` | `INT` | NOT NULL | `200` | کد وضعیتی که سیستم ما به بانک پاسخ داده |
| `processed` | `BOOLEAN` | NOT NULL | `FALSE` | نشانگر پردازش موفق منطق تجاری تراکنش |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان دریافت وب‌هوک |

---

## ۹. دامنه روش‌های ارسال، بارنامه و رهگیری پستی (Shipping & Logistics)

### ۹.۱. جدول `shipping_methods` (روش‌های مجاز ارسال کالا)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی روش ارسال |
| `code` | `VARCHAR(50)` | NOT NULL | — | کد سیستمی؛ `UNIQUE` (`'express_tehran'`, `'tipax'`, `'iran_post'`) |
| `title_fa` | `VARCHAR(100)` | NOT NULL | — | عنوان فارسی (پیک فوری ۲ ساعته، تیپاکس، پست پیشتاز) |
| `base_cost_toman`| `BIGINT` | NOT NULL | — | **هزینه پایه ارسال به عدد صحیح تومان (BIGINT)** |
| `free_threshold_toman`| `BIGINT`| NULL | — | **حداقل مبلغ خرید برای ارسال رایگان به تومان (BIGINT)** |
| `estimated_days`| `VARCHAR(50)` | NOT NULL | — | مدت‌زمان تخمینی تحویل |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | قابلیت انتخاب توسط مشتری در سبد |

---

### ۹.۲. جدول `shipments` (مرسولات بسته‌بندی‌شده و بارنامه‌ها)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی مرسوله |
| `shipment_number`| `VARCHAR(32)` | NOT NULL | — | کد رهگیری مرسوله؛ `UNIQUE` |
| `order_id` | `UUID` | NOT NULL | — | ارجاع به `orders(id) ON DELETE RESTRICT` |
| `shipping_method_id`| `UUID`| NOT NULL | — | ارجاع به روش انتخابی ارسال |
| `warehouse_id` | `UUID` | NOT NULL | — | ارجاع به انبار صادرکننده بسته |
| `carrier_tracking_code`| `VARCHAR(100)`| NULL | — | کد رهگیری پستی یا بارکد تیپاکس |
| `status` | `VARCHAR(25)` | NOT NULL | `'preparing'` | وضعیت: `'preparing'`, `'dispatched'`, `'in_transit'`, `'delivered'`, `'returned'` |
| `dispatched_at` | `TIMESTAMPTZ` | NULL | — | زمان تحویل بسته به مامور پست |
| `delivered_at` | `TIMESTAMPTZ` | NULL | — | زمان قطعی تحویل بسته به مشتری |

---

### ۹.۳. جدول `shipment_tracking_events` (رویدادها و نقاط عطف مرسوله پستی)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی رویداد |
| `shipment_id` | `UUID` | NOT NULL | — | ارجاع به `shipments(id) ON DELETE CASCADE` |
| `status_label_fa`| `VARCHAR(100)`| NOT NULL | — | متن وضعیت (ورود به مرکز مبادلات پستی) |
| `location` | `VARCHAR(100)` | NULL | — | نام شهر یا مرکز پستی |
| `occurred_at` | `TIMESTAMPTZ` | NOT NULL | — | زمان وقوع رویداد به وقت محلی |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان ثبت در دیتابیس |

---

## ۱۰. بازاریابی، کوپن تخفیف و باشگاه مشتریان (Marketing & Loyalty)

### ۱۰.۱. جدول `coupons` (کدهای تخفیف و پروموشن‌ها)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی کوپن |
| `code` | `VARCHAR(50)` | NOT NULL | — | کد متنی تخفیف؛ `UNIQUE` |
| `title_fa` | `VARCHAR(150)` | NOT NULL | — | عنوان نمایشی جشنواره |
| `type` | `VARCHAR(20)` | NOT NULL | — | نوع تخفیف: `'percent'`, `'fixed'` |
| `value` | `BIGINT` | NOT NULL | — | **مقدار تخفیف (درصد یا مبلغ ثابت به عدد صحیح تومان) (BIGINT)** |
| `min_order_amount_toman`| `BIGINT`| NOT NULL | `0` | **حداقل ارزش سبد جهت مجاز شدن کد به تومان (BIGINT)** |
| `max_discount_cap_toman`| `BIGINT`| NULL | — | **سقف ریالی تخفیف برای کدهای درصدی به تومان (BIGINT)** |
| `max_usage_total`| `INT` | NULL | — | حداکثر تعداد مجاز کل استفاده‌ها |
| `max_usage_per_user`| `INT` | NOT NULL | `1` | حداکثر دفعات مجاز استفاده توسط یک کاربر |
| `current_usage_count`| `INT` | NOT NULL | `0` | شمارنده مصرف‌شده تاکنون |
| `valid_from` | `TIMESTAMPTZ` | NOT NULL | — | زمان شروع اعتبار کد |
| `valid_to` | `TIMESTAMPTZ` | NOT NULL | — | زمان انقضای کد تخفیف |
| `target_audience`| `VARCHAR(30)` | NOT NULL | `'all'` | جامعه هدف: `'all'`, `'vip'`, `'new_customers'` |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | وضعیت فعال بودن کوپن |

---

### ۱۰.۲. جدول `coupon_usages` (سوابق استفاده از کدهای تخفیف)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی ثبت مصرف |
| `coupon_id` | `UUID` | NOT NULL | — | ارجاع به `coupons(id) ON DELETE RESTRICT` |
| `user_id` | `UUID` | NOT NULL | — | ارجاع به `auth.users(id) ON DELETE RESTRICT` |
| `order_id` | `UUID` | NOT NULL | — | ارجاع به `orders(id) ON DELETE RESTRICT` |
| `discount_applied_toman`| `BIGINT`| NOT NULL | — | **مبلغ دقیق کسرشده در فاکتور به عدد صحیح تومان (BIGINT)** |
| `used_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان ثبت قطعی کوپن در سفارش |

---

### ۱۰.۳. جدول `loyalty_points` (دفتر کل امتیازات باشگاه مشتریان)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی سند امتیاز |
| `user_id` | `UUID` | NOT NULL | — | ارجاع به `auth.users(id) ON DELETE CASCADE` |
| `points_change` | `INT` | NOT NULL | — | امتیاز (مثبت برای کسب، منفی برای خرج‌کردن) |
| `reason` | `VARCHAR(50)` | NOT NULL | — | علت: `'purchase_reward'`, `'review_submitted'`, `'redeemed_for_voucher'` |
| `reference_id` | `UUID` | NULL | — | ارجاع به سفارش یا نظری که امتیاز از آن حاصل شده |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | تاریخ اعطای امتیاز |

---

## ۱۱. پشتیبانی، نظرات، تنظیمات و لاگ‌های ممیزی (Care, Settings & Audits)

### ۱۱.۱. جدول `reviews` (نظرات و امتیازات کاربران به کالاها)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی نظر |
| `product_id` | `UUID` | NOT NULL | — | ارجاع به `products(id) ON DELETE CASCADE` |
| `user_id` | `UUID` | NOT NULL | — | ارجاع به `profiles(id) ON DELETE CASCADE` |
| `rating` | `INT` | NOT NULL | — | امتیاز از ۱ تا ۵ (`CHECK (rating BETWEEN 1 AND 5)`) |
| `comment_fa` | `TEXT` | NOT NULL | — | متن بررسی تجربیات کاربر |
| `is_verified_buyer`| `BOOLEAN`| NOT NULL | `FALSE` | نشان خریدار تاییدشده |
| `status` | `VARCHAR(20)` | NOT NULL | `'pending'` | وضعیت انتشار: `'pending'`, `'approved'`, `'rejected'` |
| `likes_count` | `INT` | NOT NULL | `0` | تعداد لایک‌های مفید بودن نظر |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان ثبت نظر |

---

### ۱۱.۲. جدول `support_tickets` (تیکت‌های خدمات پس از فروش و پشتیبانی)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی تیکت |
| `ticket_number` | `VARCHAR(32)` | NOT NULL | — | شماره یکتای تیکت؛ `UNIQUE` |
| `user_id` | `UUID` | NOT NULL | — | کاربر ارسال‌کننده تیکت |
| `order_id` | `UUID` | NULL | — | ارجاع اختیاری به سفارش مربوطه |
| `subject` | `VARCHAR(200)` | NOT NULL | — | موضوع تیکت |
| `department` | `VARCHAR(50)` | NOT NULL | — | بخش: `'technical_warranty'`, `'orders_shipping'`, `'finance_refund'` |
| `priority` | `VARCHAR(20)` | NOT NULL | `'medium'` | اولویت: `'low'`, `'medium'`, `'high'`, `'urgent'` |
| `status` | `VARCHAR(20)` | NOT NULL | `'open'` | وضعیت: `'open'`, `'in_progress'`, `'waiting_on_customer'`, `'closed'` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان بازگشایی تیکت |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان آخرین پیام تبادل‌شده |

---

### ۱۱.۳. جدول `ticket_messages` (پیام‌های داخل هر گفتگوی پشتیبانی)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی پیام |
| `ticket_id` | `UUID` | NOT NULL | — | ارجاع به `support_tickets(id) ON DELETE CASCADE` |
| `sender_id` | `UUID` | NOT NULL | — | کاربر ارسال‌کننده پیام |
| `message` | `TEXT` | NOT NULL | — | متن پیام ارسال‌شده |
| `attachments` | `JSONB` | NOT NULL | `'[]'::jsonb` | لیست فایل‌ها و تصاویر ضمیمه‌شده |
| `is_staff_reply`| `BOOLEAN` | NOT NULL | `FALSE` | آیا این پاسخ توسط پشتیبان ارسال شده است؟ |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان دقیق ارسال پیام |

---

### ۱۱.۴. جدول `notifications` (صف و تاریخچه ارسال پیامک و اعلان‌ها)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی اعلان |
| `user_id` | `UUID` | NOT NULL | — | ارجاع به کاربر دریافت‌کننده |
| `channel` | `VARCHAR(20)` | NOT NULL | `'sms'` | کانال ارسال: `'sms'`, `'in_app'`, `'email'` |
| `template_code` | `VARCHAR(50)` | NOT NULL | — | کد الگوی پیامک خدماتی کاوه‌نگار |
| `recipient` | `VARCHAR(100)` | NOT NULL | — | شماره موبایل مقصد یا ایمیل |
| `title` | `VARCHAR(150)` | NOT NULL | — | عنوان پیام |
| `message` | `TEXT` | NOT NULL | — | متن نهایی ارسال‌شده |
| `status` | `VARCHAR(20)` | NOT NULL | `'pending'` | وضعیت ارسال: `'pending'`, `'sent'`, `'delivered'`, `'failed'` |
| `provider_ref_id`| `VARCHAR(100)`| NULL | — | شناسه بازگشتی وب‌سرویس پیامک |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان درخواست ارسال |
| `sent_at` | `TIMESTAMPTZ` | NULL | — | زمان قطعی خروج پیامک |

---

### ۱۱.۵. جدول `store_settings` (تنظیمات سراسری، درگاه‌ها و پارامترهای فروشگاه)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `VARCHAR(100)` | NOT NULL | — | کلید تنظیمات؛ کلید اصلی (`PRIMARY KEY`) (مانند `data_retention_policy_days`) |
| `value` | `JSONB` | NOT NULL | — | مقدار ساختاریافته تنظیمات |
| `description_fa`| `TEXT` | NOT NULL | — | توضیح کاربرد این تنظیم در پنل مدیریت |
| `is_public` | `BOOLEAN` | NOT NULL | `FALSE` | آیا این مقدار برای کلاینت عمومی قابل خواندن است؟ |
| `updated_by` | `UUID` | NULL | — | آخرین ادمینی که این متغیر را تغییر داده |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | تاریخ آخرین ذخیره |

---

### ۱۱.۶. جدول `admin_audit_logs` (دفتر ثبت تغییرات حساس و ردپای امنیتی)
| نام ستون | نوع داده | وضعیت Null | مقدار پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | کلید اصلی رخداد لاگ |
| `actor_id` | `UUID` | NOT NULL | — | ادمین انجام‌دهنده عملیات |
| `action` | `VARCHAR(50)` | NOT NULL | — | نوع عملیات: `'price_change'`, `'stock_override'`, `'reconciliation_alert'`, `'late_payment_recovery'` |
| `target_entity` | `VARCHAR(50)` | NOT NULL | — | جدول تحت تاثیر |
| `target_id` | `UUID` | NOT NULL | — | شناسه رکورد ویرایش‌شده |
| `old_data` | `JSONB` | NULL | — | محتوای فیلدها قبل از تغییر |
| `new_data` | `JSONB` | NULL | — | محتوای جدید فیلدها پس از تغییر |
| `ip_address` | `INET` | NOT NULL | — | آدرس آی‌پی ادمین در لحظه اقدام |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | زمان دقیق ثبت رویداد امنیتی |
