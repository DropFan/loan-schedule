import type { RateEntry } from '@/stores/useLoanStore';
import { getLprChangePoints } from './data/lpr-history';

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
    const sorted = [...this.entries].sort((a, b) =>
      a.date.localeCompare(b.date),
    );

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

/**
 * LPR + 基点模式的利率提供者
 * @param basisPoints 基点偏移（如 -20 表示 LPR - 0.20%）
 */
export class LprRateProvider implements RateProvider {
  type = 'lpr' as const;

  constructor(private basisPoints: number = 0) {}

  getRate(date: Date): number {
    const dateStr = date.toISOString().split('T')[0];
    const points = getLprChangePoints();
    let rate = points[0]?.rate ?? 0;
    for (const p of points) {
      if (p.date <= dateStr) {
        rate = p.rate;
      } else {
        break;
      }
    }
    return Math.round((rate + this.basisPoints / 100) * 100) / 100;
  }

  getRateTimeline(): RateEntry[] {
    const points = getLprChangePoints();
    return points.map((p) => ({
      date: p.date,
      annualRate: Math.round((p.rate + this.basisPoints / 100) * 100) / 100,
      source: 'lpr',
    }));
  }
}
