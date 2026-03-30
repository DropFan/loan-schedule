import { useMemo } from 'react';
import type { PaymentScheduleItem } from '@/core/types/loan.types';

interface Props {
  schedule: PaymentScheduleItem[];
}

const fmtAmt = (v: number) =>
  `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatRemainingTerm(periods: number): string {
  const years = Math.floor(periods / 12);
  const months = periods % 12;
  if (years > 0 && months > 0) return `${years} 年 ${months} 个月`;
  if (years > 0) return `${years} 年`;
  return `${months} 个月`;
}

interface MilestoneData {
  paidRatio: number;
  paidPrincipal: number;
  paidInterest: number;
  crossoverPeriod: number | null;
  estimatedEndDate: string;
  remainingPeriods: number;
}

function calcMilestones(schedule: PaymentScheduleItem[]): MilestoneData {
  const regularItems = schedule.filter((item) => item.period > 0);
  const today = new Date().toISOString().split('T')[0];

  const loanAmount =
    regularItems.length > 0
      ? regularItems[0].remainingLoan + regularItems[0].principal
      : 0;

  let paidPrincipal = 0;
  let paidInterest = 0;
  for (const row of schedule) {
    if (row.paymentDate > today) break;
    paidPrincipal += row.principal;
    paidInterest += row.interest;
  }

  // 本息交叉期：首个 principal >= interest 的常规期
  let crossoverPeriod: number | null = null;
  for (const item of regularItems) {
    if (item.principal >= item.interest) {
      crossoverPeriod = item.period;
      break;
    }
  }

  // 当前期：最后一个 paymentDate <= today 的常规期
  let currentPeriod = 0;
  for (const item of regularItems) {
    if (item.paymentDate <= today) currentPeriod = item.period;
    else break;
  }

  const lastItem = regularItems[regularItems.length - 1];
  const estimatedEndDate = lastItem?.paymentDate ?? '-';
  const totalPeriods = lastItem?.period ?? 0;
  const remainingPeriods = Math.max(0, totalPeriods - currentPeriod);

  const paidRatio = loanAmount > 0 ? (paidPrincipal / loanAmount) * 100 : 0;

  return {
    paidRatio: Math.min(100, Math.round(paidRatio * 100) / 100),
    paidPrincipal: Math.round(paidPrincipal * 100) / 100,
    paidInterest: Math.round(paidInterest * 100) / 100,
    crossoverPeriod,
    estimatedEndDate,
    remainingPeriods,
  };
}

function ProgressBar({ value }: { value: number }) {
  const color =
    value > 70 ? 'bg-amber-500' : value > 30 ? 'bg-emerald-500' : 'bg-blue-500';

  return (
    <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

interface CardItemProps {
  label: string;
  value: string;
  sub?: string;
  progress?: number;
}

function CardItem({ label, value, sub, progress }: CardItemProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold leading-tight text-foreground">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      {progress !== undefined && <ProgressBar value={progress} />}
    </div>
  );
}

export function MilestoneCards({ schedule }: Props) {
  const data = useMemo(() => calcMilestones(schedule), [schedule]);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <CardItem
        label="已还比例"
        value={`${data.paidRatio}%`}
        progress={data.paidRatio}
      />
      <CardItem label="已还本金" value={fmtAmt(data.paidPrincipal)} />
      <CardItem label="已还利息" value={fmtAmt(data.paidInterest)} />
      <CardItem
        label="本息交叉期"
        value={
          data.crossoverPeriod !== null ? `第 ${data.crossoverPeriod} 期` : '-'
        }
        sub={data.crossoverPeriod !== null ? '本金开始超过利息' : '暂无交叉'}
      />
      <CardItem label="预计还清日期" value={data.estimatedEndDate} />
      <CardItem
        label="剩余期数"
        value={`${data.remainingPeriods} 期`}
        sub={formatRemainingTerm(data.remainingPeriods)}
      />
    </div>
  );
}
