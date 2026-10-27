/**
 * Persian Currency & Number Formatting Utilities
 * CNA Mobile Store
 */

const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Converts English digits (0-9) to Persian digits (۰-۹)
 */
export function toPersianDigits(input: number | string | undefined | null): string {
  if (input === undefined || input === null) return '';
  return input
    .toString()
    .replace(/[0-9]/g, (digit) => persianDigits[parseInt(digit, 10)] || digit);
}

/**
 * Formats an integer into Persian digits with thousand separators:
 * e.g., 95800000 -> "۹۵٬۸۰۰٬۰۰۰"
 */
export function formatPersianNumber(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '۰';
  // Enforce integer math for currency
  const integerAmount = Math.round(amount);
  return new Intl.NumberFormat('fa-IR', {
    useGrouping: true,
  }).format(integerAmount);
}

/**
 * Formats integer amount to Persian currency string with "تومان":
 * e.g., 95800000 -> "۹۵٬۸۰۰٬۰۰۰ تومان"
 */
export function formatToman(amount: number | undefined | null): string {
  return `${formatPersianNumber(amount)} تومان`;
}

/**
 * Calculates discount percentage between two integer amounts
 */
export function calculateDiscountPercent(originalPrice: number, currentPrice: number): number {
  if (!originalPrice || originalPrice <= currentPrice) return 0;
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

/**
 * Pad leading zero in Persian digits for counters (e.g. 9 -> "۰۹")
 */
export function padPersianZero(num: number): string {
  const padded = num < 10 ? `0${num}` : `${num}`;
  return toPersianDigits(padded);
}
