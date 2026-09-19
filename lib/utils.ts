import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function money(value: number | string) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '₦0.00';
  return `₦${num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const sleep = (ms: number = 600) => new Promise((resolve) => setTimeout(resolve, ms));
