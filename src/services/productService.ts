/**
 * Product Domain Service
 * Encapsulates all product data queries, filtering, and mutations.
 * Separation of concerns: Components consume this service instead of direct storage access.
 */

import { Product, FilterState } from '../types';
import { PRODUCTS } from './mockData';
import { DATA_SOURCE, assertValidDataSource } from './config';
import { supabaseGateway } from './supabaseClient';

const LOCAL_PRODUCTS_KEY = 'cna_store_products_v1';

// Seed or retrieve from localStorage in mock mode
function getLocalProducts(): Product[] {
  if (typeof window === 'undefined') return PRODUCTS;
  try {
    const saved = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    // Also check if admin products already exist
    const adminSaved = localStorage.getItem('cna_admin_products');
    if (adminSaved) {
      const parsed = JSON.parse(adminSaved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Map admin products to unified store format if needed
        return parsed.map((p: any) => ({
          ...p,
          titleFa: p.name || p.titleFa,
          titleEn: p.englishTitle || p.titleEn || p.name,
          imageUrl: p.image || p.imageUrl || '',
          galleryImages: p.galleryImages || (p.image ? [p.image] : []),
          stockCount: p.stock !== undefined ? p.stock : (p.stockCount ?? 0),
          inStock: (p.stock ?? p.stockCount ?? 0) > 0,
          colors: p.colors || (p.specs?.color ? [{ name: p.specs.color, hex: '#334155' }] : [{ name: 'استاندارد', hex: '#64748b' }]),
          storageOptions: p.storageOptions || (p.specs?.storage ? [p.specs.storage] : ['استاندارد']),
          specs: p.specs || {},
          rating: p.rating || 4.8,
          reviewsCount: p.reviewsCount || 12,
        }));
      }
    }
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(PRODUCTS));
  } catch (err) {
    console.error('Error accessing local products storage', err);
  }
  return PRODUCTS;
}

export function saveLocalProducts(products: Product[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));
    // Trigger storage event for cross-tab synchronization
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Failed to save products locally', err);
  }
}

export const productService = {
  /**
   * Fetch all products with simulated network latency in mock mode or live Supabase query
   */
  async getProducts(filters?: Partial<FilterState>): Promise<Product[]> {
    assertValidDataSource();
    if (DATA_SOURCE === 'supabase') {
      const client = supabaseGateway.getClient();
      const { data, error } = await client.from('products').select('*');
      if (error) {
        throw new Error(`خطای دریافت محصولات از سرور دیتابیس: ${error.message || 'خطای ناشناخته'}`);
      }
      return (data || []) as Product[];
    }

    // Mock Mode (Controlled development repository)
    await new Promise((resolve) => setTimeout(resolve, 80)); // realistic micro latency
    let items = getLocalProducts();

    if (filters) {
      if (filters.onlyInStock) {
        items = items.filter((p) => p.inStock && p.stockCount > 0);
      }
      if (filters.onlyDiscounted) {
        items = items.filter((p) => (p.discountPercent || 0) > 0);
      }
      if (filters.onlyExpress) {
        items = items.filter((p) => p.isExpressDelivery);
      }
      if (filters.selectedBrands && filters.selectedBrands.length > 0) {
        items = items.filter((p) => filters.selectedBrands!.includes(p.brand));
      }
      if (filters.priceRange) {
        const [min, max] = filters.priceRange;
        items = items.filter((p) => p.price >= min && p.price <= max);
      }
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase().trim();
        items = items.filter(
          (p) =>
            p.titleFa.toLowerCase().includes(q) ||
            p.titleEn.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q)
        );
      }
    }

    return items;
  },

  /**
   * Get single product by slug
   */
  async getProductBySlug(slug: string): Promise<Product | null> {
    assertValidDataSource();
    if (DATA_SOURCE === 'supabase') {
      const client = supabaseGateway.getClient();
      const { data, error } = await client.from('products').select('*').eq('slug', slug).single();
      if (error) {
        throw new Error(`خطا در یافتن محصول ${slug} از سرور: ${error.message}`);
      }
      return data as Product;
    }

    await new Promise((resolve) => setTimeout(resolve, 60));
    const all = getLocalProducts();
    const found = all.find((p) => p.slug === slug);
    return found || null;
  },

  /**
   * Update product stock (used when admin changes inventory or an order is processed)
   */
  async updateStock(productId: string, newStock: number): Promise<Product> {
    assertValidDataSource();
    if (DATA_SOURCE === 'supabase') {
      throw new Error('ویرایش موجودی در حالت زنده باید از طریق توابع اتمیک سمت سرور انجام شود.');
    }

    const items = getLocalProducts();
    const index = items.findIndex((p) => p.id === productId || p.sku === productId);
    if (index === -1) {
      throw new Error(`محصول با شناسه ${productId} یافت نشد.`);
    }

    const updated = {
      ...items[index],
      stockCount: Math.max(0, newStock),
      inStock: newStock > 0,
      stock: Math.max(0, newStock),
    };

    items[index] = updated;
    saveLocalProducts(items);
    return updated;
  },

  /**
   * Update product price (Toman integer)
   */
  async updatePrice(productId: string, newPriceToman: number): Promise<Product> {
    assertValidDataSource();
    if (DATA_SOURCE === 'supabase') {
      throw new Error('ویرایش قیمت در حالت زنده باید در محیط امن سرور انجام شود.');
    }

    const items = getLocalProducts();
    const index = items.findIndex((p) => p.id === productId || p.sku === productId);
    if (index === -1) {
      throw new Error(`محصول با شناسه ${productId} یافت نشد.`);
    }

    const updated = {
      ...items[index],
      price: Math.max(0, Math.round(newPriceToman)),
    };

    items[index] = updated;
    saveLocalProducts(items);
    return updated;
  },
};
