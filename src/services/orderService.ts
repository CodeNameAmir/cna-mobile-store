/**
 * Order Domain Service
 * NOTE: In Phase 3, this service prepares checkout validation and format verification.
 * No false success or fabricated order insertion is committed as final.
 * Authoritative atomic order creation with transactional inventory decrement is deferred to server integration.
 */

import { ShippingAddress } from '../types';

export interface CheckoutValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const orderService = {
  /**
   * Validates standard Iranian recipient details and shipping address
   */
  validateAddress(address: ShippingAddress): CheckoutValidationResult {
    const errors: Record<string, string> = {};

    if (!address.name || address.name.trim().length < 3) {
      errors.name = 'نام و نام خانوادگی تحویل‌گیرنده باید حداقل ۳ حرف باشد.';
    }

    const iranMobileRegex = /^09[0-9]{9}$/;
    const cleanPhone = address.phone.replace(/[\s-]/g, '');
    if (!iranMobileRegex.test(cleanPhone)) {
      errors.phone = 'شماره موبایل باید ۱۱ رقم و با ۰۹ آغاز شود (مانند ۰۹۱۲۳۴۵۶۷۸۹).';
    }

    if (!address.city || address.city.trim().length < 2) {
      errors.city = 'لطفاً نام شهر را مشخص نمایید.';
    }

    if (!address.address || address.address.trim().length < 10) {
      errors.address = 'نشانی پستی باید حداقل ۱۰ حرف و شامل پلاک و واحد باشد.';
    }

    const cleanPostal = address.postalCode.replace(/[\s-]/g, '');
    if (!/^[0-9]{10}$/.test(cleanPostal)) {
      errors.postalCode = 'کد پستی باید دقیقاً یک عدد ۱۰ رقمی باشد.';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },
};
