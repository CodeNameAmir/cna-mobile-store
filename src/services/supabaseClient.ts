/**
 * Supabase Client Gateway
 * Enforces explicit error throwing when Supabase mode is active without valid credentials.
 * NEVER silently switches to mock in production or when DATA_SOURCE is 'supabase'.
 */

import { DATA_SOURCE, SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

export interface SupabaseClientInterface {
  isConfigured: boolean;
  from: (table: string) => any;
}

class SupabaseService {
  private client: SupabaseClientInterface | null = null;

  constructor() {
    if (DATA_SOURCE === 'supabase') {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error(
          'خطای پیکربندی: منبع داده روی Supabase تنظیم شده اما مقادیر VITE_SUPABASE_URL یا VITE_SUPABASE_ANON_KEY خالی هستند.'
        );
      }
      // If credentials exist, initialize client
      this.client = {
        isConfigured: true,
        from: (table: string) => {
          return {
            select: async () => {
              throw new Error(`اتصال به جدول ${table} در Supabase نیازمند پیکربندی سرور زنده است.`);
            },
          };
        },
      };
    }
  }

  public getClient(): SupabaseClientInterface {
    if (DATA_SOURCE === 'supabase' && !this.client) {
      throw new Error(
        'خطای اتصال به دیتابیس Supabase: کلاینت در دسترس نیست. تغییر خودکار به داده‌های محلی غیرفعال است.'
      );
    }
    return this.client || {
      isConfigured: false,
      from: () => ({ select: async () => ({ data: [], error: null }) }),
    };
  }
}

export const supabaseGateway = new SupabaseService();
