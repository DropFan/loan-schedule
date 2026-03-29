/** LPR 5年期以上历史数据（中国人民银行公布） */
export interface LprRecord {
  date: string; // YYYY-MM-DD（每月20日公布）
  rate: number; // 年利率，如 4.85
}

export const lpr5YHistory: LprRecord[] = [
  { date: '2019-08-20', rate: 4.85 },
  { date: '2019-09-20', rate: 4.85 },
  { date: '2019-10-20', rate: 4.85 },
  { date: '2019-11-20', rate: 4.8 },
  { date: '2019-12-20', rate: 4.8 },
  { date: '2020-01-20', rate: 4.8 },
  { date: '2020-02-20', rate: 4.75 },
  { date: '2020-03-20', rate: 4.75 },
  { date: '2020-04-20', rate: 4.65 },
  { date: '2020-05-20', rate: 4.65 },
  { date: '2020-06-20', rate: 4.65 },
  { date: '2020-07-20', rate: 4.65 },
  { date: '2020-08-20', rate: 4.65 },
  { date: '2020-09-20', rate: 4.65 },
  { date: '2020-10-20', rate: 4.65 },
  { date: '2020-11-20', rate: 4.65 },
  { date: '2020-12-20', rate: 4.65 },
  { date: '2021-01-20', rate: 4.65 },
  { date: '2021-02-20', rate: 4.65 },
  { date: '2021-03-20', rate: 4.65 },
  { date: '2021-04-20', rate: 4.65 },
  { date: '2021-05-20', rate: 4.65 },
  { date: '2021-06-20', rate: 4.65 },
  { date: '2021-07-20', rate: 4.65 },
  { date: '2021-08-20', rate: 4.65 },
  { date: '2021-09-20', rate: 4.65 },
  { date: '2021-10-20', rate: 4.65 },
  { date: '2021-11-20', rate: 4.65 },
  { date: '2021-12-20', rate: 4.65 },
  { date: '2022-01-20', rate: 4.6 },
  { date: '2022-02-20', rate: 4.6 },
  { date: '2022-03-20', rate: 4.6 },
  { date: '2022-04-20', rate: 4.6 },
  { date: '2022-05-20', rate: 4.45 },
  { date: '2022-06-20', rate: 4.45 },
  { date: '2022-07-20', rate: 4.45 },
  { date: '2022-08-20', rate: 4.3 },
  { date: '2022-09-20', rate: 4.3 },
  { date: '2022-10-20', rate: 4.3 },
  { date: '2022-11-20', rate: 4.3 },
  { date: '2022-12-20', rate: 4.3 },
  { date: '2023-01-20', rate: 4.3 },
  { date: '2023-02-20', rate: 4.3 },
  { date: '2023-03-20', rate: 4.3 },
  { date: '2023-04-20', rate: 4.3 },
  { date: '2023-05-20', rate: 4.3 },
  { date: '2023-06-20', rate: 4.2 },
  { date: '2023-07-20', rate: 4.2 },
  { date: '2023-08-20', rate: 4.2 },
  { date: '2023-09-20', rate: 4.2 },
  { date: '2023-10-20', rate: 4.2 },
  { date: '2023-11-20', rate: 4.2 },
  { date: '2023-12-20', rate: 4.2 },
  { date: '2024-01-20', rate: 4.2 },
  { date: '2024-02-20', rate: 3.95 },
  { date: '2024-03-20', rate: 3.95 },
  { date: '2024-04-20', rate: 3.95 },
  { date: '2024-05-20', rate: 3.95 },
  { date: '2024-06-20', rate: 3.95 },
  { date: '2024-07-20', rate: 3.85 },
  { date: '2024-08-20', rate: 3.85 },
  { date: '2024-09-20', rate: 3.85 },
  { date: '2024-10-20', rate: 3.6 },
  { date: '2024-11-20', rate: 3.6 },
  { date: '2024-12-20', rate: 3.6 },
  { date: '2025-01-20', rate: 3.6 },
  { date: '2025-02-20', rate: 3.6 },
  { date: '2025-03-20', rate: 3.6 },
  { date: '2025-04-20', rate: 3.6 },
  { date: '2025-05-20', rate: 3.5 },
  { date: '2025-06-20', rate: 3.5 },
  { date: '2025-07-20', rate: 3.5 },
  { date: '2025-08-20', rate: 3.5 },
  { date: '2025-09-20', rate: 3.5 },
  { date: '2025-10-20', rate: 3.5 },
  { date: '2025-11-20', rate: 3.5 },
  { date: '2025-12-22', rate: 3.5 },
  { date: '2026-01-20', rate: 3.5 },
  { date: '2026-02-24', rate: 3.5 },
  { date: '2026-03-20', rate: 3.5 },
];

/** 去重：只保留利率发生变化的点 */
export function getLprChangePoints(): LprRecord[] {
  const result: LprRecord[] = [];
  let lastRate = -1;
  for (const record of lpr5YHistory) {
    if (record.rate !== lastRate) {
      result.push(record);
      lastRate = record.rate;
    }
  }
  return result;
}
