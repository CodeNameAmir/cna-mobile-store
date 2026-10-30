import React, { useState, useEffect } from 'react';
import {
  runSupabaseDiagnostics,
  FullDiagnosticReport,
  DiagnosticStatus,
} from '../../../services/supabaseClient';
import {
  DATA_SOURCE,
  RAW_DATA_SOURCE,
  IS_DATA_SOURCE_VALID,
  DATA_SOURCE_ERROR,
  SUPABASE_URL,
  SUPABASE_KEY_TYPE,
  SUPABASE_PUBLIC_KEY,
  validateSupabaseConfig,
} from '../../../services/config';

export const DatabaseDiagnosticsPanel: React.FC = () => {
  const [report, setReport] = useState<FullDiagnosticReport | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const initialConfig = validateSupabaseConfig();
  let serverHost = 'تنظیم نشده';
  try {
    if (SUPABASE_URL) {
      serverHost = new URL(SUPABASE_URL).hostname;
    }
  } catch {
    serverHost = 'نامعتبر';
  }

  const handleRunDiagnostics = async () => {
    setIsRunning(true);
    try {
      const res = await runSupabaseDiagnostics();
      setReport(res);
    } catch (err) {
      console.error('[CNA Diagnostics] خطا در اجرای آزمون‌ها:', err);
    } finally {
      setIsRunning(false);
    }
  };

  // Run initial diagnostic passively on mount
  useEffect(() => {
    handleRunDiagnostics();
  }, []);

  const getStatusBadge = (status: DiagnosticStatus) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            عملیاتی و موفق
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            خطا در آزمون
          </span>
        );
      case 'NOT_TESTABLE_YET':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            NOT TESTABLE YET (موکول به فاز ۴.۲)
          </span>
        );
      case 'DEFERRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20">
            موکول به طراحی اسکیما
          </span>
        );
      case 'SKIPPED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            انجام‌نشده
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full text-right" dir="rtl">
      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-surface-container-high/60 gap-4">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">
            زیرساخت ارتباطی و پایگاه داده ابری (Supabase)
          </h3>
          <p className="font-body-sm text-on-surface-variant mt-1">
            پایش یکپارچگی کلاینت تکینگی، بررسی متغیرهای محیطی و تست سلامت مرحله‌ای سرویس‌ها بدون افشای اطلاعات محرمانه
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunDiagnostics}
          disabled={isRunning}
          className="h-10 px-5 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-label-md font-medium transition-all shadow-sm flex items-center justify-center gap-2 self-start sm:self-auto disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[18px] ${isRunning ? 'animate-spin' : ''}`}>
            {isRunning ? 'progress_activity' : 'sync'}
          </span>
          <span>{isRunning ? 'در حال آزمون...' : 'آزمایش سلامت اتصال'}</span>
        </button>
      </div>

      {/* Non-sensitive Configuration Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Data Source Mode */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 flex flex-col gap-2">
          <span className="text-xs text-on-surface-variant font-medium">منبع داده فعال سیستم (VITE_DATA_SOURCE)</span>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                !IS_DATA_SOURCE_VALID
                  ? 'bg-rose-500'
                  : DATA_SOURCE === 'supabase'
                  ? 'bg-primary'
                  : 'bg-amber-500'
              }`}
            ></span>
            <span className="font-mono text-base font-bold text-on-surface uppercase">
              {!IS_DATA_SOURCE_VALID ? RAW_DATA_SOURCE || 'نامعتبر' : DATA_SOURCE}
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            {!IS_DATA_SOURCE_VALID
              ? DATA_SOURCE_ERROR
              : DATA_SOURCE === 'supabase'
              ? 'پروژه به صورت زنده به سرویس ابری متصل است.'
              : 'پروژه در حالت داده‌های محلی (Mock) اجرا می‌شود.'}
          </p>
        </div>

        {/* Card 2: Server Host */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 flex flex-col gap-2">
          <span className="text-xs text-on-surface-variant font-medium">دامنه سرور ابری (Server Host)</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="material-symbols-outlined text-primary text-[18px]">cloud_done</span>
            <span className="font-mono text-sm font-semibold text-on-surface dir-ltr text-left truncate">
              {serverHost}
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            {initialConfig.urlValid
              ? 'پروتکل و فرمت دامنه سرور معتبر است.'
              : 'آدرس اینترنتی تعریف نشده یا نامعتبر است.'}
          </p>
        </div>

        {/* Card 3: Key Status (Zero characters revealed) */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 flex flex-col gap-2">
          <span className="text-xs text-on-surface-variant font-medium">وضعیت کلید عمومی کلاینت</span>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                SUPABASE_KEY_TYPE !== 'none' ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            ></span>
            <span className="text-sm font-bold text-on-surface">
              {SUPABASE_KEY_TYPE === 'publishable'
                ? 'تنظیم شده (Publishable Key)'
                : SUPABASE_KEY_TYPE === 'anon'
                ? 'تنظیم شده (Legacy Anon Key)'
                : 'تنظیم نشده'}
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            {Boolean(SUPABASE_PUBLIC_KEY)
              ? 'کلید عمومی فاقد فاصله و کاراکتر کنترلی شناسایی شد.'
              : 'کلید عمومی در محیط تعریف نشده است.'}
          </p>
        </div>
      </div>

      {/* Multi-Stage Test Matrix (Modular Architecture) */}
      <div className="flex flex-col gap-3">
        <h4 className="font-label-lg text-label-lg font-bold text-on-surface">
          ماتریس بررسی سلامت ۴ مرحله‌ای (Task 4.1 Infrastructure Matrix)
        </h4>

        <div className="flex flex-col divide-y divide-surface-container-high/60 rounded-xl border border-surface-container-high/60 bg-surface-container-lowest overflow-hidden">
          {/* Stage 1: Config Validation */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center font-mono text-xs font-bold text-primary shrink-0">
                1
              </span>
              <div className="flex flex-col">
                <span className="font-label-md font-bold text-on-surface">
                  اعتبارسنجی مقادیر محیطی (Configuration Validation)
                </span>
                <span className="text-xs text-on-surface-variant mt-0.5">
                  بررسی آفلاین پروتکل HTTPS، سلامت دامین و فرمت کاراکتری کلید عمومی
                </span>
                {report && (
                  <span className="text-xs text-on-surface mt-1 font-mono">
                    {report.stage1Config.isValid
                      ? 'تمامی متغیرهای مورد نیاز برای ساخت کلاینت معتبر هستند.'
                      : report.stage1Config.error}
                  </span>
                )}
              </div>
            </div>
            <div>
              {report ? (
                getStatusBadge(report.stage1Config.isValid ? 'SUCCESS' : 'FAILED')
              ) : (
                <span className="text-xs text-on-surface-variant">در انتظار آزمون...</span>
              )}
            </div>
          </div>

          {/* Stage 2: Auth API Health */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center font-mono text-xs font-bold text-primary shrink-0">
                2
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-label-md font-bold text-on-surface">
                    سلامت وب‌سرویس احراز هویت (Auth API Health)
                  </span>
                  {report?.stage2Auth.latencyMs !== undefined && (
                    <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                      {report.stage2Auth.latencyMs} ms
                    </span>
                  )}
                </div>
                <span className="text-xs text-on-surface-variant mt-0.5">
                  ارسال درخواست GET به اندپوینت سلامت <code className="font-mono text-[11px] bg-surface-container px-1 rounded">/auth/v1/health</code> با هدر apikey
                </span>
                {report && (
                  <span className="text-xs text-on-surface mt-1">
                    {report.stage2Auth.message}
                  </span>
                )}
              </div>
            </div>
            <div>
              {report ? (
                getStatusBadge(report.stage2Auth.status)
              ) : (
                <span className="text-xs text-on-surface-variant">در انتظار آزمون...</span>
              )}
            </div>
          </div>

          {/* Stage 3: REST API Availability */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low/30">
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center font-mono text-xs font-bold text-on-surface-variant shrink-0">
                3
              </span>
              <div className="flex flex-col">
                <span className="font-label-md font-bold text-on-surface">
                  دسترس‌پذیری وب‌سرویس پست‌گرس (REST API Availability)
                </span>
                <span className="text-xs text-on-surface-variant mt-0.5">
                  نیازمند دسترسی خواندن به اولین جدول عمومی یا تابع RPC مجاز با کلید عمومی
                </span>
                {report && (
                  <span className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    {report.stage3Rest.note}
                  </span>
                )}
              </div>
            </div>
            <div>
              {getStatusBadge('NOT_TESTABLE_YET')}
            </div>
          </div>

          {/* Stage 4: Database Query Execution */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low/30">
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center font-mono text-xs font-bold text-on-surface-variant shrink-0">
                4
              </span>
              <div className="flex flex-col">
                <span className="font-label-md font-bold text-on-surface">
                  اجرای کوئری پایگاه داده (Database Query Execution)
                </span>
                <span className="text-xs text-on-surface-variant mt-0.5">
                  ارزیابی و همگام‌سازی داده‌های جداول کالاها، دسته‌ها و سیاست‌های RLS
                </span>
                {report && (
                  <span className="text-xs text-on-surface-variant mt-1">
                    {report.stage4Database.message}
                  </span>
                )}
              </div>
            </div>
            <div>
              {getStatusBadge('DEFERRED')}
            </div>
          </div>
        </div>
      </div>

      {/* Developer Console Hint */}
      <div className="p-4 rounded-xl bg-surface-container-low/60 border border-surface-container-high/60 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-primary text-[20px]">terminal</span>
          <span className="text-xs text-on-surface">
            ابزار تست سریع خط فرمان در کنسول توسعه‌دهنده مرورگر فعال است:
          </span>
          <code className="font-mono text-xs px-2 py-1 rounded bg-surface-container-lowest border border-surface-container text-primary dir-ltr">
            window.cnaSupabaseDiagnostic()
          </code>
        </div>
        <span className="text-[11px] text-on-surface-variant">
          خروجی ساخت‌یافته و پرجزئیات در تب Console قابل پایش است.
        </span>
      </div>
    </div>
  );
};
