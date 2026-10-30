/**
 * CNA Mobile Store Service Configuration
 * 
 * Manages runtime environment variables, data source mode ('mock' | 'supabase'),
 * and Supabase public credentials with strict priority ordering and security isolation.
 */

export type DataSourceType = 'mock' | 'supabase';
export type SupabaseKeyType = 'publishable' | 'anon' | 'none';

export interface ConfigValidationResult {
  isValid: boolean;
  urlValid: boolean;
  keyValid: boolean;
  error?: string;
  urlError?: string;
  keyError?: string;
}

// 1. Data Source Selection
const rawDataSource = (
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DATA_SOURCE) ||
  'mock'
).toString().trim().toLowerCase();

export const DATA_SOURCE: DataSourceType = rawDataSource === 'supabase' ? 'supabase' : 'mock';

// 2. Production Environment Check
export const IS_PRODUCTION: boolean =
  typeof import.meta !== 'undefined' && import.meta.env ? Boolean(import.meta.env.PROD) : false;

// 3. Supabase URL
export const SUPABASE_URL: string = (
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  ''
).toString().trim();

// 4. Public Key Priority Ordering:
// VITE_SUPABASE_PUBLISHABLE_KEY takes precedence; VITE_SUPABASE_ANON_KEY provides backward compatibility.
const rawPublishableKey = (
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  ''
).toString().trim();

const rawAnonKey = (
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  ''
).toString().trim();

// One-time non-sensitive warning if both keys are provided (never log key contents)
if (rawPublishableKey && rawAnonKey && typeof console !== 'undefined') {
  console.warn(
    '[CNA Config] Both VITE_SUPABASE_PUBLISHABLE_KEY and VITE_SUPABASE_ANON_KEY are defined. VITE_SUPABASE_PUBLISHABLE_KEY is selected as primary.'
  );
}

export const SUPABASE_KEY_TYPE: SupabaseKeyType = rawPublishableKey
  ? 'publishable'
  : rawAnonKey
  ? 'anon'
  : 'none';

export const SUPABASE_PUBLIC_KEY: string = rawPublishableKey || rawAnonKey;

// Backward-compatible alias for legacy references
export const SUPABASE_ANON_KEY: string = SUPABASE_PUBLIC_KEY;

/**
 * Validates Supabase URL.
 * In production: Enforces HTTPS.
 * In local development: Permits HTTP for localhost or 127.0.0.1.
 */
export function validateSupabaseUrl(url: string, isProd: boolean = IS_PRODUCTION): { isValid: boolean; error?: string } {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return { isValid: false, error: 'آدرس VITE_SUPABASE_URL خالی است.' };
  }

  try {
    const parsed = new URL(url.trim());
    const isHttps = parsed.protocol === 'https:';
    const isHttp = parsed.protocol === 'http:';
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

    if (isProd && !isHttps) {
      return {
        isValid: false,
        error: 'در محیط پروداکشن، آدرس Supabase باید الزماً با پروتکل امن https آغاز شود.',
      };
    }

    if (!isHttps && (!isHttp || !isLocalhost)) {
      return {
        isValid: false,
        error: 'پروتکل http فقط برای دامنه‌های localhost در محیط توسعه محلی مجاز است.',
      };
    }

    if (!parsed.hostname || parsed.hostname.length < 3) {
      return { isValid: false, error: 'نام دامنه آدرس Supabase نامعتبر است.' };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'قالب آدرس اینترنتی VITE_SUPABASE_URL نامعتبر است.' };
  }
}

/**
 * Extensible validation for public keys:
 * Ensures the key is non-empty, contains no whitespace, and contains no control characters.
 * Does not enforce brittle fixed lengths or rigid prefix locks so future Supabase key formats are supported.
 */
export function validateSupabaseKey(key: string): { isValid: boolean; error?: string } {
  if (!key || typeof key !== 'string' || key.trim().length === 0) {
    return { isValid: false, error: 'کلید عمومی Supabase تنظیم نشده است.' };
  }

  const trimmed = key.trim();

  // No internal whitespace allowed
  if (/\s/.test(trimmed)) {
    return { isValid: false, error: 'کلید عمومی نباید حاوی فاصله‌های خالی (Whitespace) باشد.' };
  }

  // No ASCII control characters (0x00 to 0x1F and 0x7F)
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return { isValid: false, error: 'کلید عمومی شامل کاراکترهای غیرمجاز کنترلی است.' };
  }

  return { isValid: true };
}

/**
 * Validates complete Supabase configuration
 */
export function validateSupabaseConfig(): ConfigValidationResult {
  const urlRes = validateSupabaseUrl(SUPABASE_URL, IS_PRODUCTION);
  const keyRes = validateSupabaseKey(SUPABASE_PUBLIC_KEY);

  const isValid = urlRes.isValid && keyRes.isValid;
  let generalError: string | undefined = undefined;

  if (!urlRes.isValid && !keyRes.isValid) {
    generalError = 'متغیرهای VITE_SUPABASE_URL و کلید عمومی هر دو فاقد تنظیمات معتبر هستند.';
  } else if (!urlRes.isValid) {
    generalError = urlRes.error;
  } else if (!keyRes.isValid) {
    generalError = keyRes.error;
  }

  return {
    isValid,
    urlValid: urlRes.isValid,
    keyValid: keyRes.isValid,
    error: generalError,
    urlError: urlRes.error,
    keyError: keyRes.error,
  };
}

export function isSupabaseConfigured(): boolean {
  return validateSupabaseConfig().isValid;
}
