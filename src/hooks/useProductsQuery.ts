/**
 * TanStack Query Hooks for Products and Categories
 * Provides automatic caching, loading states, error handling, and manual retry.
 */

import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { FilterState } from '../types';

export const PRODUCTS_QUERY_KEY = ['products'];
export const CATEGORIES_QUERY_KEY = ['categories'];

export function useProducts(filters?: Partial<FilterState>) {
  return useQuery({
    queryKey: [...PRODUCTS_QUERY_KEY, filters],
    queryFn: () => productService.getProducts(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

export function useProductBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: [...PRODUCTS_QUERY_KEY, 'slug', slug],
    queryFn: () => (slug ? productService.getProductBySlug(slug) : null),
    enabled: Boolean(slug),
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: () => categoryService.getCategories(),
    staleTime: 1000 * 60 * 15, // 15 minutes
    retry: 2,
  });
}
