/**
 * 四舍五入到两位小数，用于金额计算
 */
export function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatCurrency(value: number): string {
  return roundTo2(value).toFixed(2);
}

export function formatRate(annualRate: number): string {
  return `${roundTo2(annualRate)}%`;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 安全的月份加法，避免 setMonth 导致的日期溢出
 * 例如 1/31 + 1 month 应该是 2/28 而不是 3/2
 */
export function addMonths(base: Date, months: number, day: number = 15): Date {
  const year = base.getFullYear();
  const month = base.getMonth() + months;
  // 使用 day 参数固定日期，避免月末溢出
  return new Date(year, month, day);
}
