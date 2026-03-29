/** 公积金贷款利率历史数据（首套，中国人民银行公布） */
export interface GjjRecord {
  date: string; // 生效日期
  rate: number; // 年利率
}

/** 5年以上首套 */
export const gjj5YAboveHistory: GjjRecord[] = [
  { date: '2015-08-26', rate: 3.25 },
  { date: '2022-10-01', rate: 3.1 },
  { date: '2024-05-18', rate: 2.85 },
  { date: '2025-05-08', rate: 2.6 },
];

/** 5年以下（含5年）首套 */
export const gjj5YBelowHistory: GjjRecord[] = [
  { date: '2015-08-26', rate: 2.75 },
  { date: '2022-10-01', rate: 2.6 },
  { date: '2024-05-18', rate: 2.35 },
  { date: '2025-05-08', rate: 2.1 },
];

export function getGjjChangePoints(above5Y = true): GjjRecord[] {
  return above5Y ? [...gjj5YAboveHistory] : [...gjj5YBelowHistory];
}
