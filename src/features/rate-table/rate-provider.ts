import type { RateEntry } from '@/stores/useLoanStore';

export interface RateProvider {
  type: 'custom' | 'lpr' | string;
  getRate(date: Date): number;
  getRateTimeline(): RateEntry[];
}

export class CustomRateProvider implements RateProvider {
  type = 'custom' as const;

  constructor(private entries: RateEntry[]) {}

  getRate(date: Date): number {
    const dateStr = date.toISOString().split('T')[0];
    const sorted = [...this.entries].sort((a, b) => a.date.localeCompare(b.date));

    let rate = sorted[0]?.annualRate ?? 0;
    for (const entry of sorted) {
      if (entry.date <= dateStr) {
        rate = entry.annualRate;
      } else {
        break;
      }
    }
    return rate;
  }

  getRateTimeline(): RateEntry[] {
    return [...this.entries].sort((a, b) => a.date.localeCompare(b.date));
  }
}
