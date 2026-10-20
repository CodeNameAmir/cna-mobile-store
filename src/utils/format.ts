const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

/**
 * Converts Latin digits inside a number or string to Persian digits.
 */
export function toPersianDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

/**
 * Formats a price in Toman with thousands separators and Persian digits,
 * e.g. 98500000 -> «۹۸٬۵۰۰٬۰۰۰».
 */
export function formatToman(price: number): string {
  return toPersianDigits(price.toLocaleString("en-US"));
}

/**
 * Returns the current year in the Persian (Jalali) calendar,
 * falling back to the Gregorian year when the locale is unsupported.
 */
export function getPersianYear(): string {
  try {
    const year = new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-latn", {
      year: "numeric",
    }).format(new Date());
    return toPersianDigits(year.trim());
  } catch {
    return toPersianDigits(new Date().getFullYear());
  }
}
