/**
 * CNA Mobile Store TypeScript Interfaces
 * Designed for seamless Supabase Schema mapping and TanStack Query integration.
 */

export interface ProductSpec {
  screen?: string;
  resolution?: string;
  refreshRate?: string;
  brightness?: string;
  processor?: string;
  cpuCores?: string;
  neuralEngine?: string;
  mainCamera?: string;
  telephotoCamera?: string;
  ultraWideCamera?: string;
  videoRecording?: string;
  battery?: string;
  charging?: string;
  weight?: string;
  dimensions?: string;
  simType?: string;
  os?: string;
  featuresFa?: string;
}

export type Brand = 'Apple' | 'Samsung' | 'Xiaomi' | 'Honor' | 'Anker' | 'Nillkin' | 'Motorola';

export type CategorySlug = 
  | 'phones' 
  | 'tablets' 
  | 'smartwatches' 
  | 'audio' 
  | 'chargers' 
  | 'cases-screen' 
  | 'gaming';

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

export interface Product {
  id: string;
  titleFa: string;
  titleEn: string;
  slug: string;
  brand: Brand;
  category: CategorySlug;
  categoryFa: string;
  price: number; // Integer in Toman
  originalPrice?: number; // Integer in Toman
  discountPercent?: number;
  inStock: boolean;
  stockCount: number;
  rating: number; // 0 - 5
  reviewsCount: number;
  imageUrl: string;
  galleryImages: string[];
  warrantyFa: string;
  isSpecialOffer?: boolean;
  isBestseller?: boolean;
  isNew?: boolean;
  isExpressDelivery?: boolean;
  colors: {
    name: string;
    hex: string;
  }[];
  storageOptions: string[];
  ramOptions?: string[];
  selectedColor?: string;
  selectedStorage?: string;
  tags?: string[];
  specs: ProductSpec;
  descriptionFa?: string;
}

export interface CartItem {
  id: string; // Unique cart item ID (e.g., productId + color + storage)
  product: Product;
  selectedColor: string;
  selectedStorage: string;
  quantity: number;
  price: number;
  originalPrice?: number;
}

export interface Category {
  id: string;
  slug: CategorySlug;
  titleFa: string;
  subtitleFa: string;
  iconName: string;
  itemCount?: number;
}

export interface FilterState {
  onlyInStock: boolean;
  onlyDiscounted: boolean;
  onlyExpress: boolean;
  selectedBrands: Brand[];
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

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  status: 'pending' | 'processing' | 'delivered';
}
