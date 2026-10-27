/**
 * Category Domain Service
 * Encapsulates category tree and metadata.
 */

import { Category } from '../types';
import { CATEGORIES } from './mockData';
import { DATA_SOURCE } from './config';
import { supabaseGateway } from './supabaseClient';

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    if (DATA_SOURCE === 'supabase') {
      const client = supabaseGateway.getClient();
      const { data, error } = await client.from('categories').select('*');
      if (error) {
        throw new Error(`خطای دریافت دسته‌بندی‌ها از سرور: ${error.message}`);
      }
      return (data || []) as Category[];
    }

    await new Promise((resolve) => setTimeout(resolve, 40));
    return CATEGORIES;
  },

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const list = await this.getCategories();
    return list.find((c) => c.slug === slug) || null;
  },
};
