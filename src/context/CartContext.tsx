import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Product } from '../types';
import { PRODUCTS } from '../services/mockData';
import { cartService } from '../services/cartService';

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

export const CartContext = createContext<CartContextType | undefined>(undefined);

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

  // Cross-tab synchronization via local window storage event
  // NOTE: This purely syncs localStorage across tabs in the same local browser; it is not Supabase Realtime.
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY && e.newValue) {
        try {
          setItems(JSON.parse(e.newValue));
        } catch (err) {
          console.error('Failed to sync cart from other tab', err);
        }
      }
      if (e.key === COUPON_STORAGE_KEY) {
        setAppliedCoupon(e.newValue || null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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
    const clean = code.trim();
    if (!clean) {
      setCouponMessage({ text: 'لطفاً کد تخفیف را وارد نمایید', isError: true });
      return false;
    }

    const { isValid, message, discountToman } = cartService.verifyCoupon(clean, subtotalAmount);
    if (isValid) {
      setAppliedCoupon(clean.toUpperCase());
      setCouponMessage({ text: message, isError: false });
      showToast(`کد تخفیف اعمال شد (${discountToman.toLocaleString('fa-IR')} تومان کسر گردید)`, 'success');
      return true;
    }

    setCouponMessage({ text: message, isError: true });
    return false;
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponMessage(null);
    showToast('کد تخفیف حذف گردید', 'info');
  };

  // Preview Calculations via centralized cartService
  const {
    totalItemsCount,
    subtotalAmount,
    totalDiscount,
    voucherDiscount,
    shippingCost,
    finalPayableAmount,
  } = cartService.calculateTotals(items, appliedCoupon);

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
