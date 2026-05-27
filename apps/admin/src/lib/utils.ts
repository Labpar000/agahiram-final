import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

export function formatPrice(n: number): string {
  return formatNumber(n) + ' تومان';
}
