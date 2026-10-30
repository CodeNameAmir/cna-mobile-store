/**
 * CNA Mobile Store Central Supabase Client & Diagnostic Gateway
 * 
 * Implements a strict module-level Singleton pattern:
 * - Prevents redundant client instances, isolated sessions, and extraneous auth listeners.
 * - Enforces explicit, intelligible errors when DATA_SOURCE is 'supabase' and variables are missing.
 * - Prevents instantiation with empty or invalid URLs/keys.
 * - Provides multi-stage diagnostics (Config -> Auth Health -> REST API status -> DB Query deferred).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  DATA_SOURCE,
  SUPABASE_URL,
  SUPABASE_PUBLIC_KEY,
  SUPABASE_KEY_TYPE,
  validateSupabaseConfig,
  isSupabaseConfigured,
  SupabaseKeyType,
} from './config';

// Module-level Singleton
let supabaseInstance: SupabaseClient | null = null;

/**
 * Returns the centralized Supabase client instance.
 * Throws explicit descriptive error if DATA_SOURCE is 'supabase' but environment is not configured.
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const config = validateSupabaseConfig();

  if (DATA_SOURCE === 'supabase') {
    if (!config.isValid) {
      throw new Error(
        `[CNA Supabase] خطای پیکربندی: منبع داده روی Supabase تنظیم شده اما تنظیمات ناقص است: ${
          config.error || 'کلید عمومی یا آدرس سرور نامعتبر است.'
        }`
      );
    }

    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    return supabaseInstance;
  }

  // In 'mock' mode: If credentials happen to be provided, we can initialize lazily
  if (config.isValid) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return supabaseInstance;
  }

  // Safe fallback in mock mode when variables are absent (never crash app boot)
  throw new Error(
    '[CNA Supabase] کلاینت سوپابیس در حالت Mock مقداردهی نشده است. برای دسترسی به دیتابیس زنده، متغیرهای محیطی را تنظیم فرمایید.'
  );
}

/**
 * Backward-compatible gateway for existing domain services
 */
export const supabaseGateway = {
  getClient(): SupabaseClient {
    return getSupabaseClient();
  },
  isConfigured(): boolean {
    return isSupabaseConfigured();
  },
};

// ============================================================================
// Multi-Stage Diagnostic Types & Verification Engine
// ============================================================================

export type DiagnosticStatus = 'SUCCESS' | 'FAILED' | 'NOT_TESTABLE_YET' | 'DEFERRED' | 'SKIPPED';
export type DiagnosticErrorType = 'TIMEOUT' | 'HTTP_STATUS_ERROR' | 'NETWORK_OR_CORS_ERROR' | 'INVALID_PAYLOAD' | 'CONFIG_ERROR';

export interface Stage1ConfigResult {
  isValid: boolean;
  urlValid: boolean;
  keyValid: boolean;
  urlHost: string;
  keyType: SupabaseKeyType;
  hasKey: boolean;
  error?: string;
}

export interface Stage2AuthResult {
  status: DiagnosticStatus;
  latencyMs?: number;
  serviceName?: string;
  version?: string;
  errorType?: DiagnosticErrorType;
  message: string;
}

export interface Stage3RestResult {
  status: DiagnosticStatus;
  message: string;
  note: string;
}

export interface Stage4DbResult {
  status: DiagnosticStatus;
  message: string;
}

export interface FullDiagnosticReport {
  timestamp: string;
  dataSource: 'mock' | 'supabase';
  stage1Config: Stage1ConfigResult;
  stage2Auth: Stage2AuthResult;
  stage3Rest: Stage3RestResult;
  stage4Database: Stage4DbResult;
}

/**
 * Stage 2: Tests Auth API Health
 * Sends a GET request to ${SUPABASE_URL}/auth/v1/health with 'apikey' header and 5-second timeout.
 * Validates HTTP 200, parses JSON, and verifies name === 'GoTrue' and a valid version string.
 */
export async function testAuthHealth(timeoutMs: number = 5000): Promise<Stage2AuthResult> {
  const config = validateSupabaseConfig();
  if (!config.isValid) {
    return {
      status: 'SKIPPED',
      errorType: 'CONFIG_ERROR',
      message: 'آزمون Auth API به دلیل عدم وجود یا نامعتبر بودن تنظیمات اولیه انجام نشد.',
    };
  }

  const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/health`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const startTime = performance.now();

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_PUBLIC_KEY,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      return {
        status: 'FAILED',
        latencyMs,
        errorType: 'HTTP_STATUS_ERROR',
        message: `سرویس Auth با کد وضعیت HTTP ${response.status} (${response.statusText || 'خطای سرور'}) پاسخ داد.`,
      };
    }

    const payload = await response.json();

    // Verify response content: name must be 'GoTrue' and version must be non-empty string
    if (
      payload &&
      typeof payload === 'object' &&
      payload.name === 'GoTrue' &&
      typeof payload.version === 'string' &&
      payload.version.trim().length > 0
    ) {
      return {
        status: 'SUCCESS',
        latencyMs,
        serviceName: payload.name,
        version: payload.version,
        message: `سرویس احراز هویت (${payload.name} نسخه ${payload.version}) در دسترس و عملیاتی است.`,
      };
    }

    return {
      status: 'FAILED',
      latencyMs,
      errorType: 'INVALID_PAYLOAD',
      message: 'پاسخ اندپوینت سلامت فاقد ساختار استاندارد GoTrue یا نسخه معتبر بود.',
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    if (err instanceof DOMException && err.name === 'AbortError') {
      return {
        status: 'FAILED',
        latencyMs,
        errorType: 'TIMEOUT',
        message: `پاسخی در مهلت مقرر (${timeoutMs / 1000} ثانیه) از سرور Auth دریافت نشد (خطای وقفه زمانی).`,
      };
    }

    // In browsers, TypeError thrown by fetch indicates either network connectivity failure or CORS restriction
    if (err instanceof TypeError) {
      return {
        status: 'FAILED',
        latencyMs,
        errorType: 'NETWORK_OR_CORS_ERROR',
        message: 'عدم برقراری ارتباط با سرویس Auth (احتمال قطعی شبکه، محدودیت دامنه یا انسداد CORS مرورگر).',
      };
    }

    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: 'FAILED',
      latencyMs,
      errorType: 'NETWORK_OR_CORS_ERROR',
      message: `خطای ارتباطی با وب‌سرویس احراز هویت: ${msg}`,
    };
  }
}

/**
 * Runs complete multi-stage diagnostics
 */
export async function runSupabaseDiagnostics(): Promise<FullDiagnosticReport> {
  const config = validateSupabaseConfig();

  let parsedHost = '';
  try {
    if (SUPABASE_URL) {
      parsedHost = new URL(SUPABASE_URL).hostname;
    }
  } catch {
    parsedHost = 'نامعتبر';
  }

  const stage1Config: Stage1ConfigResult = {
    isValid: config.isValid,
    urlValid: config.urlValid,
    keyValid: config.keyValid,
    urlHost: parsedHost,
    keyType: SUPABASE_KEY_TYPE,
    hasKey: Boolean(SUPABASE_PUBLIC_KEY),
    error: config.error,
  };

  // Stage 2: Auth Health
  const stage2Auth: Stage2AuthResult = config.isValid
    ? await testAuthHealth(5000)
    : {
        status: 'SKIPPED',
        errorType: 'CONFIG_ERROR',
        message: 'آزمون Auth API به دلیل عدم وجود تنظیمات معتبر انجام نشد.',
      };

  // Stage 3: REST API Availability (Honestly marked as NOT TESTABLE YET in Task 4.1)
  const stage3Rest: Stage3RestResult = {
    status: 'NOT_TESTABLE_YET',
    message: 'وضعیت REST API در این مرحله قابل ارزیابی نیست (NOT TESTABLE YET).',
    note: 'در تسک ۴.۱ به دلیل عدم ایجاد جدول، View یا RPC عمومی، ارزیابی REST API موکول به فاز ۴.۲ پس از استقرار اولین منبع داده است.',
  };

  // Stage 4: Database Query Execution (Deferred)
  const stage4Database: Stage4DbResult = {
    status: 'DEFERRED',
    message: 'اجرای کوئری دیتابیس منوط به طراحی و ایجاد جداول در مراحل بعدی است.',
  };

  const report: FullDiagnosticReport = {
    timestamp: new Date().toISOString(),
    dataSource: DATA_SOURCE,
    stage1Config,
    stage2Auth,
    stage3Rest,
    stage4Database,
  };

  return report;
}

// Register console test helper in development mode
if (typeof window !== 'undefined' && typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
  (window as unknown as { cnaSupabaseDiagnostic: () => Promise<FullDiagnosticReport> }).cnaSupabaseDiagnostic = async () => {
    console.info('[CNA Supabase] در حال اجرای آزمون چندمرحله‌ای زیرساخت...');
    const report = await runSupabaseDiagnostics();
    console.group('📋 گزارش وضعیت ارتباطی Supabase (Task 4.1)');
    console.info('🕒 زمان آزمون:', report.timestamp);
    console.info('⚙️ منبع داده فعلی:', report.dataSource);
    console.info('🌐 دامنه سرور:', report.stage1Config.urlHost || 'تنظیم نشده');
    console.info('🔑 نوع کلید عمومی:', report.stage1Config.keyType);
    console.info('1️⃣ اعتبارسنجی کانفیگ:', report.stage1Config.isValid ? '✅ تایید' : `❌ ${report.stage1Config.error}`);
    console.info('2️⃣ سرویس احراز هویت (Auth Health):', report.stage2Auth.status, report.stage2Auth.message);
    if (report.stage2Auth.latencyMs !== undefined) {
      console.info('⏱️ تاخیر Auth:', `${report.stage2Auth.latencyMs}ms`);
    }
    console.info('3️⃣ وب‌سرویس REST API:', report.stage3Rest.status, report.stage3Rest.note);
    console.info('4️⃣ کوئری پایگاه داده:', report.stage4Database.status, report.stage4Database.message);
    console.groupEnd();
    return report;
  };
}
