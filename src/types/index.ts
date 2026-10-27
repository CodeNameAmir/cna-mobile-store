/**
 * CNA Mobile Store TypeScript Interfaces
 * Unified store models re-exported from store.ts
 */

export * from './store';

export interface ProductVariant {
  id: string;
  colorName: string;
  colorHex: string;
  storage: string;
  ram?: string;
  priceModifier?: number; // Price difference in Toman if any
  inStock: boolean;
  stockCount: number;
}

export interface FilterState {
  onlyInStock: boolean;
  onlyDiscounted: boolean;
  onlyExpress: boolean;
  selectedBrands: import('./store').Brand[];
  priceRange: [number, number];
  selectedStorage: string[];
  selectedRam: string[];
  selectedColors: string[];
  searchQuery: string;
  sortBy: 'newest' | 'bestselling' | 'cheapest' | 'expensive' | 'popular';
}

export interface Review {
  id: string;
  authorName: string;
  authorInitials: string;
  isVerifiedBuyer: boolean;
  productNameFa: string;
  rating: number;
  dateFa: string;
  commentFa: string;
  cityFa?: string;
}

export interface Article {
  id: string;
  titleFa: string;
  excerptFa: string;
  categoryFa: string;
  readTimeFa: string;
  dateFa: string;
  imageUrl: string;
  slug: string;
}

