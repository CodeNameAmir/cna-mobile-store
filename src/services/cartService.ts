/**
 * Cart Domain Service
 * NOTE: All calculations here are strictly for temporary UI preview and immediate feedback to the shopper.
 * In production, authoritative pricing, coupon validity, and stock verification MUST be re-calculated
 * server-side or via database atomic procedures.
 * Currency: Strictly integer Toman (تومان) - no decimals.
 */

import { CartItem } from '../types';

export interface CartCalculationResult {
  totalItemsCount: number;
  subtotalAmount: number; // Toman (Sum of original prices * qty)
  itemLevelDiscount: number; // Toman (Product discounts)
  voucherDiscount: number; // Toman (Coupon discount)
  totalDiscount: number; // Toman
  shippingCost: number; // Toman
  finalPayableAmount: number; // Toman
}

export const FREE_SHIPPING_THRESHOLD_TOMAN = 1000000; // 1 Million Toman
export const STANDARD_SHIPPING_COST_TOMAN = 50000; // 50 Thousand Toman

export const VALID_COUPONS: Record<string, { discountToman: number; minOrderToman: number; description: string }> = {
  'CNA-OFF': { discountToman: 500000, minOrderToman: 2000000, description: 'تخفیف ۵۰۰,۰۰۰ تومانی خرید بالای ۲ میلیون' },
  'تخفیف': { discountToman: 500000, minOrderToman: 1500000, description: 'کد هدیه ۵۰۰,۰۰۰ تومانی' },
  'CNA2025': { discountToman: 500000, minOrderToman: 2000000, description: 'تخفیف ویژه کاربران CNA' },
};

export const cartService = {
  /**
   * Preview calculation of cart amounts
   */
  calculateTotals(items: CartItem[], appliedCouponCode: string | null): CartCalculationResult {
    const totalItemsCount = items.reduce((sum, item) => sum + Math.max(1, Math.round(item.quantity)), 0);

    // Subtotal based on base prices (or price if original not set)
    const subtotalAmount = items.reduce(
      (sum, item) => sum + Math.round((item.originalPrice || item.price) * item.quantity),
      0
    );

    // Product-level discounts
    const itemLevelDiscount = items.reduce(
      (sum, item) => sum + Math.round(((item.originalPrice || item.price) - item.price) * item.quantity),
      0
    );

    // Coupon calculation
    let voucherDiscount = 0;
    if (appliedCouponCode && items.length > 0) {
      const cleanCode = appliedCouponCode.trim().toUpperCase();
      const couponRule = VALID_COUPONS[cleanCode] || VALID_COUPONS[appliedCouponCode];
      if (couponRule && subtotalAmount >= couponRule.minOrderToman) {
        voucherDiscount = couponRule.discountToman;
      }
    }

    const totalDiscount = itemLevelDiscount + voucherDiscount;

    // Free shipping threshold check
    const currentTotalBeforeShipping = Math.max(0, subtotalAmount - itemLevelDiscount);
    const shippingCost =
      items.length === 0 ? 0 : currentTotalBeforeShipping >= FREE_SHIPPING_THRESHOLD_TOMAN ? 0 : STANDARD_SHIPPING_COST_TOMAN;

    const finalPayableAmount = Math.max(0, subtotalAmount - totalDiscount + shippingCost);

    return {
      totalItemsCount,
      subtotalAmount,
      itemLevelDiscount,
      voucherDiscount,
      totalDiscount,
      shippingCost,
      finalPayableAmount,
    };
  },

  /**
   * Verify coupon validity for preview
   */
  verifyCoupon(code: string, currentSubtotalToman: number): { isValid: boolean; message: string; discountToman: number } {
    const clean = code.trim().toUpperCase();
    const coupon = VALID_COUPONS[clean] || VALID_COUPONS[code];

    if (!coupon) {
      return { isValid: false, message: 'کد تخفیف وارد شده معتبر نمی‌باشد یا منقضی شده است.', discountToman: 0 };
    }

    if (currentSubtotalToman < coupon.minOrderToman) {
      return {
        isValid: false,
        message: `این کد تخفیف برای سفارش‌های بالای ${coupon.minOrderToman.toLocaleString('fa-IR')} تومان فعال است.`,
        discountToman: 0,
      };
    }

    return {
      isValid: true,
      message: `کد تخفیف معتبر اعمال شد (${coupon.discountToman.toLocaleString('fa-IR')} تومان کسر گردید).`,
      discountToman: coupon.discountToman,
    };
  },
};
