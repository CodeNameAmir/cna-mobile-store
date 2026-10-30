# CNA Mobile Store — Database Relationships & Normalization Architecture

مستندات تحلیلی ماتریس روابط، کاردینالیتی، قوانین کلید خارجی، خط‌مشی‌های پیشگیری از حذف ناخواسته (Referential Integrity)، اسناد جفتی انبار و اثبات نرمال‌سازی پایگاه داده فروشگاه سی‌ان‌ای.

---

## ۱. جدول مرجع کلیدهای خارجی و قوانین رفتار در زمان حذف (Foreign Key Rules)

> [!IMPORTANT]
> **قانون یکپارچگی ارجاعی و پایداری دفاتر کل:**
> هیچ رکوردی در جداول `orders`, `order_items`, `invoices`, `payments`, `wallet_transactions`, `stock_movements` و `product_serial_units` نباید به صورت آبشاری (`CASCADE`) در زمان حذف کاربر یا محصول حذف شود. در این موارد، رفتار اکیداً برابر `ON DELETE RESTRICT` تعریف شده است.

| جدول مبدا (From Table) | ستون کلید خارجی (FK Column) | جدول مقصد (Target Table) | ستون مقصد | رفتار در زمان حذف (`ON DELETE`) | دلیل معماری و توجیه بیزینسی |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `profiles` | `id` | `auth.users` | `id` | `RESTRICT` | جلوگیری از پاک شدن پروفایل تا پیش از تسویه و بستن حساب کاربری |
| `user_addresses` | `user_id` | `profiles` | `id` | `CASCADE` | نشانی‌های پیش‌نویس با حذف کاربر پاکسازی می‌شوند (آدرس خریدهای قبلی در اسنپ‌شات سفارش محفوظ است) |
| `auth_role_permissions` | `role_id` | `auth_roles` | `id` | `CASCADE` | با حذف نقش، نگاشت مجوزهای آن پاک می‌شود |
| `auth_role_permissions` | `permission_id` | `auth_permissions` | `id` | `CASCADE` | با حذف مجوز، انتساب‌های آن پاک می‌شود |
| `auth_user_roles` | `user_id` | `auth.users` | `id` | `CASCADE` | حذف انتساب نقش کاربر در صورت حذف هویت |
| `auth_user_roles` | `role_id` | `auth_roles` | `id` | `RESTRICT` | جلوگیری از حذف نقشی که کاربران هنوز آن را دارا هستند |
| `categories` | `parent_id` | `categories` | `id` | `RESTRICT` | جلوگیری از ایجاد شاخه‌های سرگردان در رده‌بندی |
| `products` | `category_id` | `categories` | `id` | `RESTRICT` | حذف دسته‌بندی حاوی کالا اکیداً مسدود است |
| `products` | `brand_id` | `brands` | `id` | `RESTRICT` | حذف برندی که دارای کالای ثبت‌شده است ممنوع است |
| `product_images` | `product_id` | `products` | `id` | `CASCADE` | تصاویر گالری وابسته به کالا هستند و با حذف کالا حذف می‌شوند |
| `category_attributes` | `category_id` | `categories` | `id` | `CASCADE` | حذف نگاشت مشخصه با حذف رده |
| `category_attributes` | `attribute_id` | `attribute_definitions` | `id` | `CASCADE` | حذف نگاشت مشخصه با حذف تعریف فیلد |
| `product_attribute_values` | `product_id` | `products` | `id` | `CASCADE` | مقادیر مشخصات کانونیکال با حذف محصول پاک می‌شوند |
| `product_attribute_values` | `attribute_id` | `attribute_definitions` | `id` | `RESTRICT` | جلوگیری از حذف تعریف فیلدی که در محصولات داده دارد |
| `product_variants` | `product_id` | `products` | `id` | `CASCADE` | با حذف کاتالوگ محصول، تنوع‌های آن حذف می‌شوند |
| `product_variants` | `warranty_id` | `warranties` | `id` | `RESTRICT` | جلوگیری از حذف شرکت گارانتی دارای SKUهای فعال |
| `product_serial_units` | `variant_id` | `product_variants` | `id` | `RESTRICT` | محافظت از تاریخچه ردیابی IMEI هر دستگاه |
| `product_serial_units` | `warehouse_id` | `warehouses` | `id` | `RESTRICT` | محافظت از دستگاه‌های فیزیکی موجود در انبار |
| `product_serial_units` | `order_item_id` | `order_items` | `id` | `SET NULL` | در صورت لغو سفارش قبل از ارسال، تخصیص برداشته می‌شود |
| `warehouse_stock` | `warehouse_id` | `warehouses` | `id` | `RESTRICT` | انبار دارای موجودی قابل حذف نیست |
| `warehouse_stock` | `variant_id` | `product_variants` | `id` | `RESTRICT` | کالای دارای رکورد انبارداری قابل حذف نیست |
| `stock_movements` | `warehouse_id` | `warehouses` | `id` | `RESTRICT` | اسناد دفتر کل انبار تغییرناپذیر هستند |
| `stock_movements` | `variant_id` | `product_variants` | `id` | `RESTRICT` | دفتر کل گردش انبار تغییرناپذیر است |
| `stock_reservations` | `warehouse_id` | `warehouses` | `id` | `RESTRICT` | رزرو فعال باید به انبار معتبر متصل باشد |
| `stock_reservations` | `variant_id` | `product_variants` | `id` | `RESTRICT` | رزرو باید به تنوع کالای معتبر متصل باشد |
| `stock_reservations` | `user_id` | `auth.users` | `id` | `CASCADE` | لغو رزرو موقت با انصراف کاربر |
| `inventory_transfers` | `source_warehouse_id` | `warehouses` | `id` | `RESTRICT` | اسناد حواله مبدا باید معتبر بمانند |
| `inventory_transfers` | `target_warehouse_id` | `warehouses` | `id` | `RESTRICT` | اسناد حواله مقصد باید معتبر بمانند |
| `inventory_transfer_items`| `transfer_id`| `inventory_transfers` | `id` | `CASCADE` | اقلام حواله با سند اصلی یکپارچه هستند |
| `inventory_transfer_items`| `variant_id` | `product_variants` | `id` | `RESTRICT` | حفاظت از اقلام مندرج در حواله |
| `cart_items` | `cart_id` | `carts` | `id` | `CASCADE` | اقلام سبد خرید با تخلیه سبد پاک می‌شوند |
| `cart_items` | `variant_id` | `product_variants` | `id` | `CASCADE` | حذف خودکار اقلام ناموجود یا حذف‌شده از سبد مشتری |
| `wishlists` | `user_id` | `profiles` | `id` | `CASCADE` | حذف نشان‌های علاقه‌مندی با حذف کاربر |
| `wishlists` | `product_id` | `products` | `id` | `CASCADE` | حذف نشان‌های علاقه‌مندی با حذف کالا |
| `orders` | `user_id` | `auth.users` | `id` | `RESTRICT` | سفارشات مشتری جهت حفظ سوابق مالی هرگز حذف آبشاری نمی‌شوند |
| `orders` | `shipping_method_id` | `shipping_methods` | `id` | `RESTRICT` | روش پستی سفارش باید مشخص باقی بماند |
| `orders` | `tax_rule_id` | `tax_rules` | `id` | `RESTRICT` | قانون مالیاتی موثر بر سفارش تغییرناپذیر است |
| `order_items` | `order_id` | `orders` | `id` | `CASCADE` | یکپارچگی اقلام درون یک فاکتور |
| `order_items` | `product_id` | `products` | `id` | `RESTRICT` | محصول دارای فاکتور فروش قبلی غیرقابل حذف است |
| `order_items` | `variant_id` | `product_variants` | `id` | `RESTRICT` | SKU دارای فاکتور فروش قبلی غیرقابل حذف است |
| `order_status_history` | `order_id` | `orders` | `id` | `CASCADE` | لاگ وضعیت متعلق به سفارش است |
| `order_returns` | `order_id` | `orders` | `id` | `RESTRICT` | درخواست مرجوعی به فاکتور اصلی متصل است |
| `order_returns` | `order_item_id` | `order_items` | `id` | `RESTRICT` | مرجوعی به قلم خاص فاکتور متصل است |
| `wallets` | `user_id` | `auth.users` | `id` | `RESTRICT` | کیف پول دارای تراز مالی قابل حذف کورکورانه نیست |
| `wallet_transactions` | `wallet_id` | `wallets` | `id` | `RESTRICT` | دفتر کل مالی غیرقابل حذف است |
| `invoices` | `order_id` | `orders` | `id` | `RESTRICT` | صورتحساب رسمی فروشگاه غیرقابل حذف است |
| `payments` | `order_id` | `orders` | `id` | `RESTRICT` | پرونده پرداخت تسویه سفارش |
| `payment_transactions` | `payment_id` | `payments` | `id` | `RESTRICT` | سند تراکنش درگاه پرداخت غیرقابل حذف است |
| `payment_transactions` | `parent_transaction_id`| `payment_transactions` | `id` | `RESTRICT` | ارجاع تراکنش استرداد به تراکنش خرید اصلی جهت ممیزی و تطابق مبالغ |
| `payment_refund_attempts`| `refund_transaction_id`| `payment_transactions`| `id` | `RESTRICT` | هر تلاش استرداد به سند تراکنش استرداد متصل است و لاگ ممیزی آن نباید حذف شود |
| `shipments` | `order_id` | `orders` | `id` | `RESTRICT` | بارنامه پستی کالا |
| `shipment_tracking_events`| `shipment_id`| `shipments` | `id` | `CASCADE` | سوابق جابه‌جایی مرسوله پستی |
| `coupon_usages` | `coupon_id` | `coupons` | `id` | `RESTRICT` | تاریخچه استناد به کدهای تخفیف |
| `coupon_usages` | `order_id` | `orders` | `id` | `RESTRICT` | کسر تخفیف در فاکتور مربوطه |
| `loyalty_points` | `user_id` | `auth.users` | `id` | `RESTRICT` | تاریخچه امتیازات مشتریان |
| `reviews` | `product_id` | `products` | `id` | `CASCADE` | نظرات متعلق به کالای مربوطه |
| `reviews` | `user_id` | `profiles` | `id` | `SET NULL` | در صورت خروج کاربر، نظر به عنوان کاربر ناشناس باقی می‌ماند |
| `support_tickets` | `user_id` | `profiles` | `id` | `RESTRICT` | تیکت‌های پشتیبانی |
| `ticket_messages` | `ticket_id` | `support_tickets` | `id` | `CASCADE` | پیام‌های درون رشته مکالمه |

---

## ۲. اسناد جفتی انبارداری در انتقالات بین‌انباری (Paired Transfer Movements)

در زمان ثبت حواله انتقال کالا بین دو انبار در جدول `inventory_transfers`، برای تضمین تراز دفاتر و جلوگیری از گم‌شدن کالا، دو رکورد جفتی در جدول `stock_movements` به شکل همزمان ثبت می‌شود:
1. سطر خروج انبار مبدا: `warehouse_id = source_warehouse_id`, `movement_type = 'transfer_out'`, `quantity_change = -N`, `reference_id = inventory_transfers.id`
2. سطر ورود انبار مقصد: `warehouse_id = target_warehouse_id`, `movement_type = 'transfer_in'`, `quantity_change = +N`, `reference_id = inventory_transfers.id`

این دو سطر در یک تراکنش واحد اتمیک درج شده و قفل‌های سطری بر روی سطرهای موجودی انبار مبدا و مقصد اعمال می‌گردد.

---

## ۳. کاردینالیتی و انواع روابط (Cardinality Matrix)

### روابط یک‌به‌یک (1:1 Relationships)
1. **`auth.users ↔ profiles`**: هر حساب کاربری در سامانه احراز هویت، یک پروفایل در `profiles` دارد (`id = auth.users.id`).
2. **`auth.users ↔ wallets`**: هر مشتری دارای یک کیف پول اعتباری در سامانه است (`UNIQUE(user_id)`).
3. **`orders ↔ invoices`**: هر سفارش تاییدشده دقیقاً به یک صورتحساب رسمی متصل می‌شود (`UNIQUE(order_id)`).

### روابط یک‌به‌چند (1:N Relationships)
1. **`categories (Parent) ↔ categories (Children)`**: رابطه درختی خودارجاعی جهت ایجاد زیردسته‌ها.
2. **`brands ↔ products`**: هر برند مالک چندین مدل کالا در فروشگاه است.
3. **`products ↔ product_variants`**: هر مدل محصول پایه به چندین SKU تفکیک می‌شود.
4. **`warranties ↔ product_variants`**: هر گارانتی با مدت‌زمان مشخص به چندین تنوع کالا متصل است.
5. **`product_variants ↔ product_serial_units`**: هر SKU می‌تواند چندین دستگاه فیزیکی با IMEIهای مختلف داشته باشد.
6. **`warehouses ↔ warehouse_stock`**: هر انبار میزبان موجودی‌های گوناگون کالا در قفسه‌های مختلف است.
7. **`orders ↔ order_items`**: هر سفارش شامل یک یا چند ردیف کالا است.
8. **`orders ↔ order_status_history`**: هر سفارش دارای خط زمانی چندمرحله‌ای است.
9. **`payments ↔ payment_transactions`**: هر پرونده پرداخت ممکن است شامل چند تلاش درگاه باشد.
10. **`wallets ↔ wallet_transactions`**: هر کیف پول دارای تاریخچه‌ای از تراکنش‌های واریز و برداشت است.

### روابط چندبه‌چند (N:M Relationships via Junction Tables)
1. **`auth_roles ↔ auth_permissions` (واسط: `auth_role_permissions`)**: هر نقش چندین مجوز دارد و هر مجوز در چندین نقش تکرار می‌شود.
2. **`auth.users ↔ auth_roles` (واسط: `auth_user_roles`)**: یک پرسنل می‌تواند چند نقش کاربری داشته باشد.
3. **`categories ↔ attribute_definitions` (واسط: `category_attributes`)**: دسته‌بندی موبایل به ویژگی‌های رم، حافظه، باتری و دوربین متصل است.
4. **`products ↔ attribute_definitions` (واسط: `product_attribute_values`)**: ذخیره‌سازی کانونیکال مقدار هر ویژگی برای هر محصول.

---

## ۴. اثبات انطباق با فرم‌های نرمال‌سازی (Normalization Proof)

- **1NF:** کلیه فیلدها اتمیک هستند و هیچ ستون چندمقداری وجود ندارد؛ تمامی جداول دارای کلید اصلی یکتای `UUID` هستند.
- **2NF:** تمام صفات غیرکلیدی وابستگی تابعی کامل به کلید اصلی دارند و هیچ وابستگی جزئی در جداول با کلید کامپوزیت وجود ندارد.
- **3NF & BCNF:** هیچ وابستگی ترایایی (Transitive Dependency) میان فیلدهای غیرکلیدی وجود ندارد؛ مشخصات گارانتی، برندها و تعاریف مشخصات فنی در جداول کانونیکال خود نگهداری می‌شوند.
- **مورد کنترل‌شده دنرمالایز:** ستون `specs_summary (JSONB)` در جدول `products` صرفاً به عنوان کش خواندنی سریع استفاده می‌شود و سورس حقیقت در `product_attribute_values` است.
