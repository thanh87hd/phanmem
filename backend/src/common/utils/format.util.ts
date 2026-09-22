/**
 * Utility functions for formatting banking and audit data
 */

/**
 * Format number/string to VND currency display
 */
export function formatCurrencyVND(
  amount: number | string | null | undefined,
): string {
  if (amount === null || amount === undefined || amount === '') return '0 ₫';
  const num =
    typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
  if (isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(num);
}

/**
 * Format string or Date to DD/MM/YYYY
 */
export function formatDateVN(
  dateInput: string | Date | null | undefined,
): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
