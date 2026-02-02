import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Currency, StructuredLog } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getCookie = (key: string): string | null => {
  // Guard for SSR - document doesn't exist on server
  if (typeof document === 'undefined') {
    return null;
  }
  
  const cookies = Object. fromEntries(
    document. cookie.split('; ').map((v) => v.split(/=(.*)/s).map(decodeURIComponent)),
  );
  return cookies?.[key] ?? null;
};
export function formatCurrency(amount: number, currency: Currency): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function calculateInvoiceTotals(
  items: Array<{ quantity: number; unit_price: number; tax_rate?: number | null }>,
  discountType?: 'fixed' | 'percentage' | null,
  discountValue?: number | null
): {
  subtotal: number;
  tax_total: number;
  discount_amount: number;
  total: number;
  item_amounts: number[];
} {
  let subtotal = 0;
  let tax_total = 0;
  const item_amounts: number[] = [];

  for (const item of items) {
    const itemAmount = item.quantity * item.unit_price;
    item_amounts.push(itemAmount);
    subtotal += itemAmount;

    if (item.tax_rate) {
      tax_total += itemAmount * (item.tax_rate / 100);
    }
  }

  let discount_amount = 0;
  if (discountType && discountValue && discountValue > 0) {
    if (discountType === 'fixed') {
      discount_amount = Math.min(discountValue, subtotal);
    } else if (discountType === 'percentage') {
      discount_amount = subtotal * (discountValue / 100);
    }
  }

  const total = Math.max(0, subtotal + tax_total - discount_amount);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax_total: Math.round(tax_total * 100) / 100,
    discount_amount: Math.round(discount_amount * 100) / 100,
    total: Math.round(total * 100) / 100,
    item_amounts: item_amounts.map((a) => Math.round(a * 100) / 100),
  };
}

export function formatDateForTimezone(date: Date | string, timezone: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function generateToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}