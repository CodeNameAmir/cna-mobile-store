# Task 4.1 — آماده‌سازی زیرساخت ارتباطی Supabase (نسخه نهایی ۴)

طرح معماری و برنامه اجرایی قطعی گام ۴.۱ جهت استقرار زیرساخت استاندارد و مینیمال کلاینت Supabase در پروژه فروشگاه اینترنتی سی‌ان‌ای موبایل (CNA Mobile Store)، با اعمال ۳ اصلاحیه تکمیلی نهایی.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **اصلاحات و الزامات قطعی نهایی:**
> 1. **بررسی عمیق محتوای پاسخ Auth API:** در استعلام GET به `/auth/v1/health`، علاوه بر HTTP 200 و JSON معتبر، محتوای پاسخ اعتبارسنجی می‌شود؛ فیلد `name` باید دقیقاً برابر `'GoTrue'` و فیلد `version` باید یک رشته غیرخالی باشد.
> 2. **اعتبارسنجی بدون طول شکننده برای کلید:** هیچ حداقل طول ثابتی برای کلید عمومی اعمال نمی‌شود. صرفاً غیرخالی بودن، عدم وجود فاصله (whitespace) داخلی و نبود کاراکترهای کنترلی بررسی شده و تایید نهایی به عهده پاسخ سرویس گذاشته می‌شود.
> 3. **مدیریت خطای مشترک مرورگر (`NETWORK_OR_CORS_ERROR`):** به دلیل این‌که موتور مرورگر در زمان شکست Network یا بلاک شدن توسط CORS استثنای یکسان (`TypeError: Failed to fetch`) تولید می‌کند، در موارد مبهم وضعیت صریح `NETWORK_OR_CORS_ERROR` ثبت شده و از حدس و گمان پرهیز می‌شود.
> 4. **صداقت در وضعیت REST API (`NOT TESTABLE YET`):** تا قبل از استقرار جداول در فاز ۴.۲، وضعیت REST API به عنوان «هنوز قابل ارزیابی نیست» نمایش داده شده و با کوئری دیتابیس اشتباه گرفته نمی‌شود.
> 5. **یکپارچگی متغیر منبع داده:** نامگذاری منحصراً بر پایه `VITE_DATA_SOURCE` (`mock` یا `supabase`).
> 6. **پشتیبانی دوگانه با اولویت `VITE_SUPABASE_PUBLISHABLE_KEY` بر `VITE_SUPABASE_ANON_KEY`.**
> 7. **عدم نمایش هیچ بخشی از مقدار کلید در پنل مدیریت یا کنسول.**
> 8. **ساختار کلاینت تکینگی ساده ماژولار بدون کلاس‌های انتزاعی سنگین.**

---

## ۱. نمای کلی سیستم و معماری جریان داده (System Architecture)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Environment Variables                           │
│   - VITE_DATA_SOURCE: 'mock' | 'supabase'                              │
│   - VITE_SUPABASE_URL: string (HTTPS prod / HTTP localhost)           │
│   - VITE_SUPABASE_PUBLISHABLE_KEY: string (Primary public key)         │
│   - VITE_SUPABASE_ANON_KEY: string (Legacy fallback key)               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     src/services/config.ts                             │
│   - DATA_SOURCE: DataSourceType                                        │
│   - SUPABASE_URL: string                                               │
│   - SUPABASE_KEY_INFO: { hasKey: boolean, keyType: 'publishable'|... } │
│   - validateKeyFormat(key: string): boolean (No whitespace/control)    │
│   - validateSupabaseConfig(): ConfigValidationResult                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   src/services/supabaseClient.ts                       │
│   - Module-level Singleton (let supabase: SupabaseClient | null)       │
│   - getSupabaseClient(): SupabaseClient | throws explicit config error │
│   - testAuthHealth(): GET /auth/v1/health + checks name === 'GoTrue'   │
│   - Error Classification: TIMEOUT, HTTP_ERROR, NETWORK_OR_CORS_ERROR   │
│   - runSupabaseDiagnostics(): Multi-stage diagnostic runner            │
│   - window.cnaSupabaseDiagnostic (DEV environment helper)              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        ▼                                                       ▼
┌──────────────────────────────────────┐  ┌─────────────────────────────┐
│ src/components/admin/diagnostics/    │  │ Browser Console Diagnostic  │
│ DatabaseDiagnosticsPanel.tsx         │  │ window.cnaSupabaseDiagnostic│
│ - Stage 1: Configuration Validation  │  └─────────────────────────────┘
│ - Stage 2: Auth API Health (GoTrue)  │
│ - Stage 3: REST API (NOT TESTABLE)   │
│ - Stage 4: Database Query (DEFERRED) │
└──────────────────────────────────────┘
```

---

## ۲. طراحی گام‌های تست سلامت (Multi-Stage Healthcheck Matrix)

| گام تست | نوع استعلام و شرایط بررسی | شرایط موفقیت | وضعیت در تسک ۴.۱ |
| :--- | :--- | :--- | :--- |
| **۱. Configuration Validation** | بررسی آفلاین URL و ساختار کاراکتری کلید | بدون whitespace، فاقد کاراکتر کنترلی، پروتکل مجاز HTTPS یا HTTP لوکال | **عملیاتی و فعال** |
| **۲. Auth API Health** | درخواست GET به `${URL}/auth/v1/health` با هدر `apikey` و Timeout ۵ ثانیه‌ای | دریافت HTTP 200 و تطابق `data.name === 'GoTrue'` و وجود نسخه غیرخالی | **عملیاتی و فعال** |
| **۳. REST API Availability** | نیازمند جدول یا RPC عمومی با کلید عمومی | — | **صادقانه: NOT TESTABLE YET (موکول به فاز ۴.۲)** |
| **۴. Database Query Execution** | اجرای کوئری با PostgREST | — | **غیرفعال: DEFERRED TO SCHEMA CREATION** |

---

## ۳. مراحل اجرایی دقیق (Implementation Checklist)

1. **نصب پکیج رسمی**:
   - نصب `@supabase/supabase-js` با ابزار `install_applet_package`.
2. **به‌روزرسانی و استانداردسازی `src/services/config.ts`**:
   - دریافت `VITE_DATA_SOURCE`.
   - اولویت‌دهی `VITE_SUPABASE_PUBLISHABLE_KEY` به `VITE_SUPABASE_ANON_KEY`.
   - اعتبارسنجی URL سازگار با پروداکشن (HTTPS) و لوکال‌هاست (HTTP).
   - اعتبارسنجی منعطف کلید: غیرخالی بودن، عدم وجود فاصله داخلی (`!/\s/.test(key)`) و نبود کاراکترهای کنترلی (`!/[\x00-\x1F\x7F]/.test(key)`).
   - ثبت هشدار در صورت تعریف همزمان هر دو کلید بدون افشای مقادیر.
3. **پیاده‌سازی کلاینت متمرکز و رانر تشخیصی در `src/services/supabaseClient.ts`**:
   - متغیر ماژولار `let supabaseInstance: SupabaseClient | null = null`.
   - تابع `getSupabaseClient()` با پرتاب خطای صریح در حالت `DATA_SOURCE === 'supabase'`.
   - متد تست سلامت Auth API با `AbortController` (مهلت ۵ ثانیه)، ارسال هدر `apikey`، و ارزیابی محتوای `data.name === 'GoTrue'` و رشته بودن `version`.
   - دسته‌بندی خطاهای شبکه به `TIMEOUT`, `HTTP_STATUS_ERROR`, `NETWORK_OR_CORS_ERROR`.
   - تابع جامع `runSupabaseDiagnostics()` بازگرداننده وضعیت تفکیک‌شده ۳ فاز.
   - ثبت در `window.cnaSupabaseDiagnostic` در محیط توسعه (`import.meta.env.DEV`).
4. **توسعه کامپوننت ماژولار تشخیصی**:
   - ساخت `src/components/admin/diagnostics/DatabaseDiagnosticsPanel.tsx`.
   - نمایش کارت‌های متادیتای غیرحساس (وضعیت منبع داده، آدرس سرور، نوع کلید فعال، وضعیت ۳ تست).
   - نمایش وضعیت صریح `NOT TESTABLE YET` برای REST API و برچسب فاز بعدی.
   - الحاق تب در `src/pages/admin/AdminSettingsPage.tsx`.
5. **مستندسازی و کنترل Git**:
   - تکمیل `.env.example` با متغیرهای `VITE_DATA_SOURCE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_ANON_KEY`.
   - بررسی و اطمینان از قرار داشتن فایل‌های `.env` و `.env.local` در `.gitignore`.
6. **تست و ارزیابی نهایی**:
   - اجرای `compile_applet` و اطمینان از قبولی کامل بیلد و سلامت انواع تایپ‌ها.
