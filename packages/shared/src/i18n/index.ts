/**
 * Agahiram Persian i18n — single source of truth for digit/date/price formatting.
 * All formatting functions are deterministic across SSR and client (no Intl locale-list pitfalls).
 */
import { format as formatJalali, formatDistanceToNowStrict } from 'date-fns-jalali';
import { faIR } from 'date-fns-jalali/locale';

/* =========================================================================
   Digits
   ========================================================================= */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;
const ARABIC_DIGITS_RE = /[\u0660-\u0669]/g; // ٠..٩
const LATIN_DIGITS_RE = /[0-9]/g;

/**
 * Convert any Latin/Arabic digits in a string to Persian (۰..۹).
 */
export function toPersianDigits(input: string | number | bigint | null | undefined): string {
  if (input === null || input === undefined) return '';
  const str = typeof input === 'string' ? input : String(input);
  return str
    .replace(ARABIC_DIGITS_RE, (d) => PERSIAN_DIGITS[d.charCodeAt(0) - 0x0660]!)
    .replace(LATIN_DIGITS_RE, (d) => PERSIAN_DIGITS[Number(d)]!);
}

/**
 * Convert Persian / Arabic digits in a string back to Latin (for backend submission).
 */
export function toLatinDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d as (typeof PERSIAN_DIGITS)[number])))
    .replace(ARABIC_DIGITS_RE, (d) => String(d.charCodeAt(0) - 0x0660));
}

/**
 * Normalize Persian/Arabic text for tolerant search matching.
 *
 * Handles:
 * - Arabic vs Persian letters (ي/ى -> ی, ك -> ک)
 * - Arabic/Persian digits to Latin (for numeric tokens)
 * - Tatweel and Arabic diacritics removal
 * - ZWNJ normalization to a regular space
 * - Collapsing repeated whitespace
 */
export function normalizePersianText(input: string | null | undefined): string {
  if (!input) return '';
  const withLatinDigits = toLatinDigits(input);
  return withLatinDigits
    .normalize('NFKC')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ؤ/g, 'و')
    .replace(/إ|أ|ٱ/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u065F\u0670]/g, '') // Arabic diacritics
    .replace(/\u0640/g, '') // tatweel
    .replace(/[\u200C\u200D]/g, ' ') // ZWNJ/ZWJ
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/* =========================================================================
   Numbers
   ========================================================================= */

/**
 * Format a number/bigint/numeric-string with Persian digits and thousand separators (٬).
 */
export function formatPersianNumber(value: number | bigint | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'bigint' ? value : typeof value === 'string' ? value : value;
  // Use Intl for grouping but force Latin first, then convert digits (avoids platform Intl quirks).
  let formatted: string;
  if (typeof n === 'bigint') {
    formatted = n.toLocaleString('en-US');
  } else if (typeof n === 'string') {
    const num = Number(n);
    formatted = Number.isFinite(num) ? num.toLocaleString('en-US') : n;
  } else {
    formatted = n.toLocaleString('en-US');
  }
  return toPersianDigits(formatted).replace(/,/g, '٬');
}

/**
 * Compact number formatting: 12,000 -> "۱۲ هزار", 1,500,000 -> "۱٫۵ میلیون"
 */
export function formatPersianCompact(value: number | bigint | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'bigint' ? Number(value) : Number(value);
  if (!Number.isFinite(n)) return '';
  const abs = Math.abs(n);
  if (abs < 1_000) return formatPersianNumber(n);
  if (abs < 1_000_000)
    return toPersianDigits((n / 1_000).toFixed(abs < 10_000 ? 1 : 0).replace('.', '٫')) + ' هزار';
  if (abs < 1_000_000_000)
    return (
      toPersianDigits((n / 1_000_000).toFixed(abs < 10_000_000 ? 1 : 0).replace('.', '٫')) +
      ' میلیون'
    );
  return toPersianDigits((n / 1_000_000_000).toFixed(1).replace('.', '٫')) + ' میلیارد';
}

/* =========================================================================
   Prices
   ========================================================================= */

export type PriceInput = number | bigint | string | null | undefined;

/**
 * Format Iranian Toman price.
 *  - null/0      → "توافقی"
 *  - small       → "۱۲٬۵۰۰ تومان"
 *  - big         → "۱٫۲ میلیون تومان"
 *  - giant       → "۸٫۵ میلیارد تومان"
 *
 * options.compact: force compact form (default: auto from magnitude)
 * options.suffix: change unit suffix (default: "تومان", pass "" to omit)
 */
export function formatPersianPrice(
  value: PriceInput,
  options: { compact?: 'auto' | 'always' | 'never'; suffix?: string } = {},
): string {
  const { compact = 'auto', suffix = 'تومان' } = options;
  if (value === null || value === undefined || value === '') return 'توافقی';

  let n: number;
  if (typeof value === 'bigint') {
    n = Number(value);
  } else if (typeof value === 'string') {
    n = Number(value);
  } else {
    n = value;
  }

  if (!Number.isFinite(n) || n === 0) return 'توافقی';

  const useCompact = compact === 'always' || (compact === 'auto' && Math.abs(n) >= 1_000_000);
  const formatted = useCompact ? formatPersianCompact(n) : formatPersianNumber(n);
  return suffix ? `${formatted} ${suffix}` : formatted;
}

/* =========================================================================
   Dates (Jalali)
   ========================================================================= */

export type DateInput = Date | string | number | null | undefined;

const toDate = (d: DateInput): Date | null => {
  if (d === null || d === undefined || d === '') return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Format date in Jalali calendar with Persian digits.
 *   style "short"  → "۱۴۰۴/۰۳/۰۲"
 *   style "medium" → "۲ خرداد ۱۴۰۴"
 *   style "long"   → "جمعه، ۲ خرداد ۱۴۰۴"
 *   style "time"   → "۱۴:۲۳"
 *   style "dateTime"→ "۲ خرداد ۱۴۰۴ ۱۴:۲۳"
 */
export function formatJalaliDate(
  input: DateInput,
  style: 'short' | 'medium' | 'long' | 'time' | 'dateTime' = 'medium',
): string {
  const date = toDate(input);
  if (!date) return '';
  const pattern =
    style === 'short'
      ? 'yyyy/MM/dd'
      : style === 'medium'
        ? 'd MMMM yyyy'
        : style === 'long'
          ? 'EEEE، d MMMM yyyy'
          : style === 'time'
            ? 'HH:mm'
            : /* dateTime */ 'd MMMM yyyy ، HH:mm';
  return toPersianDigits(formatJalali(date, pattern, { locale: faIR }));
}

/**
 * Persian relative time, soft thresholds, no platform Intl quirks.
 *   <60s   → "همین الان"
 *   <60m   → "X دقیقه پیش"
 *   <24h   → "X ساعت پیش"
 *   <2d    → "دیروز"
 *   <7d    → "X روز پیش"
 *   else   → "Y خرداد ۱۴۰۴"
 */
export function formatRelativeTimeFa(input: DateInput): string {
  const date = toDate(input);
  if (!date) return '';
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'همین الان';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${toPersianDigits(minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${toPersianDigits(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'دیروز';
  if (days < 7) return `${toPersianDigits(days)} روز پیش`;
  return formatJalaliDate(date, 'medium');
}

/**
 * Direct wrapper around date-fns-jalali for cases needing fine control.
 * Always returns Persian digits.
 */
export function formatJalaliCustom(input: DateInput, pattern: string): string {
  const date = toDate(input);
  if (!date) return '';
  return toPersianDigits(formatJalali(date, pattern, { locale: faIR }));
}

/* =========================================================================
   Misc helpers
   ========================================================================= */

/**
 * Strict distance (no "about", "almost") — useful for live indicators (typing, last seen).
 */
export function formatDistanceStrictFa(input: DateInput): string {
  const date = toDate(input);
  if (!date) return '';
  return toPersianDigits(formatDistanceToNowStrict(date, { locale: faIR, addSuffix: true }));
}

/**
 * Pluralize a Persian count: ("پست", 5) -> "۵ پست"  ((Persian has no plural form))
 */
export function plural(noun: string, count: number | bigint): string {
  return `${formatPersianNumber(count)} ${noun}`;
}

/**
 * Phone number prettifier: "09123456789" -> "۰۹۱۲ ۳۴۵ ۶۷۸۹"
 */
export function formatPhoneFa(phone: string | null | undefined): string {
  if (!phone) return '';
  const clean = toLatinDigits(phone).replace(/\D/g, '');
  const grouped =
    clean.length === 11 && clean.startsWith('09')
      ? `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7, 11)}`
      : clean;
  return toPersianDigits(grouped);
}
