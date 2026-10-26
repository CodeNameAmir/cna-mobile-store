import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Product } from '../types';
import { PRODUCTS } from '../services/mockData';

interface ToastState {
  show: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface CartContextType {
  items: CartItem[];
  totalItemsCount: number;
  subtotalAmount: number;
  discountAmount: number;
  voucherDiscount: number;
  shippingCost: number;
  finalPayableAmount: number;
  appliedCoupon: string | null;
  couponMessage: { text: string; isError: boolean } | null;
  toast: ToastState;
  addItem: (product: Product, selectedColor?: string, selectedStorage?: string, quantity?: number) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
  hideToast: () => void;
}

const CART_STORAGE_KEY = 'cna_cart_items_v1';
const COUPON_STORAGE_KEY = 'cna_cart_coupon_v1';

// Initial pre-seeded items matching the user's cart screenshot for authentic experience
const getInitialItems = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading cart from localStorage', e);
  }

  // Pre-seed with the 2 items seen in the uploaded Cart screenshot
  const iphone = PRODUCTS.find((p) => p.slug === 'iphone-16-pro-max');
  const buds = PRODUCTS.find((p) => p.slug === 'galaxy-buds-2-pro');

  const defaultItems: CartItem[] = [];

  if (iphone) {
    defaultItems.push({
      id: `${iphone.id}-natural-256`,
      product: {
        ...iphone,
        titleFa: 'گوشی موبایل اپل مدل iPhone 15 Pro Max دو سیم کارت',
      },
      selectedColor: 'تیتانیوم طبیعی',
      selectedStorage: '۲۵۶ گیگابایت',
      quantity: 1,
      price: 69900000,
      originalPrice: 74200000,
    });
  }

  if (buds) {
    defaultItems.push({
      id: `${buds.id}-graphite-std`,
      product: buds,
      selectedColor: 'خاکستری گرافیتی (Graphite)',
      selectedStorage: 'استاندارد',
      quantity: 1,
      price: 7950000,
      originalPrice: 8950000,
    });
  }

  return defaultItems;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(getInitialItems);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(COUPON_STORAGE_KEY) || null;
    }
    return null;
  });
  const [couponMessage, setCouponMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    type: 'success',
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [items]);

  useEffect(() => {
    try {
      if (appliedCoupon) {
        localStorage.setItem(COUPON_STORAGE_KEY, appliedCoupon);
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save coupon to localStorage', e);
    }
  }, [appliedCoupon]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3200);
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, show: false }));
  };

  const addItem = (
    product: Product,
    selectedColor = product.selectedColor || product.colors[0]?.name || 'پیش‌فرض',
    selectedStorage = product.selectedStorage || product.storageOptions[0] || 'استاندارد',
    quantity = 1
  ) => {
    if (!product.inStock) {
      showToast('این کالا در حال حاضر ناموجود است', 'error');
      return;
    }

    const itemId = `${product.id}-${selectedColor}-${selectedStorage}`;

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.id === itemId);

      if (existingIndex > -1) {
        const updated = [...prevItems];
        const newQty = updated[existingIndex].quantity + quantity;
        if (newQty > product.stockCount) {
          showToast(`تنها ${product.stockCount} عدد از این کالا در انبار موجود است`, 'info');
          return prevItems;
        }
        updated[existingIndex].quantity = newQty;
        return updated;
      }

      return [
        ...prevItems,
        {
          id: itemId,
          product,
          selectedColor,
          selectedStorage,
          quantity,
          price: product.price,
          originalPrice: product.originalPrice || product.price,
        },
      ];
    });

    showToast(`«${product.titleFa}» با موفقیت به سبد خرید افزوده شد!`, 'success');
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setItems((prevItems) => {
      return prevItems
        .map((item) => {
          if (item.id === itemId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (item.product.stockCount && nextQty > item.product.stockCount) {
              showToast(`حداکثر موجودی قابل سفارش ${item.product.stockCount} عدد است`, 'info');
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeItem = (itemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    showToast('کالا از سبد خرید حذف شد', 'info');
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
    setCouponMessage(null);
    showToast('سبد خرید خالی شد', 'info');
  };

  const applyCoupon = (code: string): boolean => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setCouponMessage({ text: 'لطفاً کد تخفیف را وارد نمایید', isError: true });
      return false;
    }

    if (clean === 'CNA-OFF' || clean === 'تخفیف' || clean === 'CNA2025') {
      setAppliedCoupon(clean);
      setCouponMessage({
        text: 'کد تخفیف معتبر اعمال گردید (۵۰۰,۰۰۰ تومان کسر شد)',
        isError: false,
      });
      showToast('کد تخفیف ۵۰۰,۰۰۰ تومانی با موفقیت اعمال شد', 'success');
      return true;
    }

    setCouponMessage({ text: 'کد وارد شده نامعتبر است یا منقضی شده است', isError: true });
    return false;
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponMessage(null);
    showToast('کد تخفیف حذف گردید', 'info');
  };

  // Calculations
  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Subtotal based on original prices (or price if no original)
  const subtotalAmount = items.reduce(
    (sum, item) => sum + (item.originalPrice || item.price) * item.quantity,
    0
  );

  // Product discounts
  const itemLevelDiscount = items.reduce(
    (sum, item) => sum + ((item.originalPrice || item.price) - item.price) * item.quantity,
    0
  );

  // Voucher discount
  const voucherDiscount = appliedCoupon && items.length > 0 ? 500000 : 0;

  const totalDiscount = itemLevelDiscount + voucherDiscount;

  // Free shipping over 1,000,000 Toman, else 50,000 Toman (if items > 0)
  const shippingCost = items.length === 0 ? 0 : subtotalAmount - itemLevelDiscount >= 1000000 ? 0 : 50000;

  const finalPayableAmount = Math.max(0, subtotalAmount - totalDiscount + shippingCost);

  return (
    <CartContext.Provider
      value={{
        items,
        totalItemsCount,
        subtotalAmount,
        discountAmount: totalDiscount,
        voucherDiscount,
        shippingCost,
        finalPayableAmount,
        appliedCoupon,
        couponMessage,
        toast,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        applyCoupon,
        removeCoupon,
        hideToast,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
