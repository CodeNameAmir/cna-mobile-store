/**
 * CNA Mobile Store Service Configuration
 * Explicit data source control: 'mock' | 'supabase'
 * Strict rule: When configured as 'supabase', connection errors MUST throw explicitly and never silently fallback to mock.
 */

export type DataSourceType = 'mock' | 'supabase';

// Explicitly controlled via environment variable VITE_DATA_SOURCE. Default in local dev is 'mock'.
export const DATA_SOURCE: DataSourceType =
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_DATA_SOURCE as DataSourceType)) ||
  (typeof process !== 'undefined' && process.env && (process.env.VITE_DATA_SOURCE as DataSourceType)) ||
  'mock';

export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_URL) ||
  '';

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_ANON_KEY) ||
  '';

export const IS_PRODUCTION =
  typeof import.meta !== 'undefined' && import.meta.env ? Boolean(import.meta.env.PROD) : false;
