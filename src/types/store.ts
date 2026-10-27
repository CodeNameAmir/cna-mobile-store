/**
 * CNA Mobile Store - Unified Core Data Model & Types
 * Currency: Strictly integer Toman (تومان) across all entities and calculations.
 * Compatible with Supabase relational schema and local state.
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
  color?: string;
  storage?: string;
  ram?: string;
  port?: string;
  capacity?: string;
  [key: string]: string | undefined;
}

export type Brand = 'Apple' | 'Samsung' | 'Xiaomi' | 'Honor' | 'Anker' | 'Nillkin' | 'Motorola' | string;

export type CategorySlug =
  | 'phones'
  | 'tablets'
  | 'smartwatches'
  | 'audio'
  | 'chargers'
  | 'cases-screen'
  | 'gaming'
  | string;

export interface ProductColor {
  name: string;
  hex: string;
}

/**
 * Unified Product model supporting storefront display and warehouse management.
 * All prices are integers in Toman.
 */
export interface Product {
  id: string;
  titleFa: string;
  titleEn: string;
  name?: string; // Backwards compatible alias for titleFa in admin
  englishTitle?: string; // Backwards compatible alias for titleEn in admin
  slug: string;
  sku?: string;
  barcode?: string;
  brand: Brand;
  category: CategorySlug;
  categoryFa?: string;

  // Pricing (Integer Toman)
  price: number; // Current selling price in Toman
  originalPrice?: number; // Base price before discount in Toman
  discountPrice?: number; // Pre-discount or reference price in Toman
  discountPercent?: number;

  // Inventory & Logistics
  inStock: boolean;
  stockCount: number;
  stock?: number; // Alias for stockCount in admin
  shelfLocation?: string;
  warranty?: string;
  warrantyFa?: string;
  partNumber?: string;
  isPublished?: boolean;

  // Presentation & Badges
  rating: number;
  reviewsCount: number;
  imageUrl: string;
  image?: string; // Alias for imageUrl
  galleryImages: string[];
  badge?: string;
  isSpecialOffer?: boolean;
  isBestseller?: boolean;
  isNew?: boolean;
  isExpressDelivery?: boolean;

  // Variants & Specifications
  colors: ProductColor[];
  storageOptions: string[];
  ramOptions?: string[];
  selectedColor?: string;
  selectedStorage?: string;
  tags?: string[];
  specs: ProductSpec;
  descriptionFa?: string;
}

export interface CartItem {
  id: string; // Unique item ID (productId + variant)
  product: Product;
  selectedColor: string;
  selectedStorage: string;
  quantity: number;
  price: number; // Unit price in Toman
  originalPrice?: number; // Original unit price in Toman
}

export interface Category {
  id: string;
  slug: CategorySlug;
  titleFa: string;
  subtitleFa: string;
  iconName: string;
  itemCount?: number;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  city: string;
  address: string;
  postalCode: string;
  notes?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  specs?: string;
  price: number; // Unit price in Toman
  quantity: number;
  image?: string;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  subtotalAmount: number; // Toman
  discountAmount: number; // Toman
  shippingCost: number; // Toman
  totalAmount: number; // Toman
  paymentGateway: string;
  shippingMethod: string;
  shippingAddress: string;
  trackingCode?: string;
  status: OrderStatus;
  createdAt: string;
  paymentStatus?: string;
  statusNote?: string;
}
