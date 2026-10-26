/**
 * CNA Mobile Admin & Warehouse Panel TypeScript Definitions
 * Strict types without 'any'
 */

export interface ProductSpecs {
  color?: string;
  storage?: string;
  ram?: string;
  port?: string;
  capacity?: string;
  features?: string;
  [key: string]: string | undefined;
}

export interface Product {
  id: string;
  name: string;
  englishTitle: string;
  slug: string;
  sku: string;
  barcode: string;
  brand: string;
  category: string;
  price: number; // Integer in Toman
  discountPrice?: number; // Integer in Toman
  discountPercent?: number;
  stock: number;
  shelfLocation: string;
  warranty: string;
  partNumber: string;
  isPublished: boolean;
  image: string;
  badge?: string;
  specs: ProductSpecs;
}

export interface OrderItem {
  productId: string;
  productName: string;
  specs?: string;
  price: number; // Integer in Toman
  quantity: number;
  image?: string;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string; // e.g. CNA-10492
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  totalAmount: number; // Integer in Toman
  paymentGateway: string;
  shippingMethod: string;
  shippingAddress: string;
  trackingCode?: string;
  status: OrderStatus;
  createdAt: string;
  paymentStatus?: string;
  statusNote?: string;
}

export type UserRole = 'customer' | 'vip' | 'warehouse_manager' | 'support' | 'super_admin';
export type UserStatus = 'active' | 'suspended' | 'unverified';

export interface UserOrderSummary {
  title: string;
  invoice: string;
  date: string;
  amount: number;
  status: string;
  icon: string;
}

export interface UserAddress {
  title: string;
  fullAddress: string;
  postalCode: string;
  receiver: string;
  phone: string;
}

export interface AdminUser {
  id: string;
  fullName: string;
  nationalId: string;
  phone: string;
  email: string;
  role: UserRole;
  totalPurchases: number; // Integer in Toman
  orderCount: number;
  orderSummary: string;
  walletBalance: number; // Integer in Toman
  joinedAt: string;
  lastLogin: string;
  status: UserStatus;
  avatar: string;
  recentOrders?: UserOrderSummary[];
  address?: UserAddress;
  adminNote?: string;
}

export interface SystemLog {
  id: string;
  title: string;
  author: string;
  description: string;
  timeAgo: string;
  icon: string;
  type: 'price' | 'inventory' | 'warranty' | 'campaign' | 'security';
}

export type InvoiceStatus = 'approved' | 'pending_tax' | 'rejected';

export interface FinancialInvoice {
  id: string;
  invoiceNumber: string; // e.g. CNA-INV-1403-8841
  orderNumber: string;
  customerName: string;
  nationalId: string;
  economicCode?: string;
  subtotal: number;
  vatAmount: number; // 10%
  totalAmount: number;
  paymentGateway: string;
  paymentRefCode: string;
  status: InvoiceStatus;
  date: string;
  itemsCount: number;
}

export interface DiscountCoupon {
  id: string;
  code: string; // e.g. CNA-GOLD, IPHONE16-PRO
  title: string;
  type: 'percent' | 'fixed';
  value: number; // e.g. 15 for 15% or 500000 for 500k Toman
  minOrderAmount: number;
  maxDiscountCap?: number;
  usageCount: number;
  maxUsage: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  targetAudience: 'all' | 'vip' | 'new_customers';
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  supportPhone: string;
  emergencyPhone: string;
  centralAddress: string;
  postalCode: string;
  workHours: string;
  isStoreOpen: boolean;
  autoManifestEnabled: boolean;
  taxRatePercent: number;
  mellatTerminalId: string;
  samanMerchantId: string;
  kavenegarApiKey: string;
  freeShippingThreshold: number;
  expressTehranCost: number;
  tipaxBaseCost: number;
  zebraPort: string;
  twoFactorEnabled: boolean;
}
