import { ArrowDown, ArrowUp } from 'lucide-react';
import type { SimulateResult as SimulateResultType } from '../useSimulation';

interface Props {
  result: SimulateResultType;
}

function formatMoney(v: number): string {
  return `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatTermReduced(months: number): string {
  if (months <= 0) return '0 期';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years > 0 && rest > 0) return `${months} 期（${years}年${rest}个月）`;
  if (years > 0) return `${months} 期（${years}年）`;
  return `${months} 期`;
}

export function SimulateResult({ result }: Props) {
  if (result.error) {
    return (
      <div className="bg-card border border-red-300 dark:border-red-800 rounded-xl p-4">
        <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>
      </div>
    );
  }

  if (!result.isValid) return null;

  const items: Array<{
    label: string;
    value: string;
    color?: 'green' | 'red' | 'default';
    icon?: 'down' | 'up';
    show?: boolean;
  }> = [
    {
      label: '节省利息',
      value: formatMoney(Math.abs(result.interestSaved)),
      color: result.interestSaved >= 0 ? 'green' : 'red',
      icon: result.interestSaved >= 0 ? 'down' : 'up',
    },
    {
      label: '缩短期数',
      value: formatTermReduced(Math.abs(result.termReduced)),
      color: result.termReduced >= 0 ? 'green' : 'red',
      icon: result.termReduced >= 0 ? 'down' : 'up',
    },
    {
      label: '新月供',
      value:
        result.newMonthlyPayment != null
          ? formatMoney(result.newMonthlyPayment)
          : '-',
      show: result.newMonthlyPayment != null,
    },
    {
      label: '新还清日期',
      value: result.newEndDate,
    },
    {
      label: '总利息对比',
      value: `${formatMoney(result.originalSummary.totalInterest)} → ${formatMoney(result.simulatedSummary.totalInterest)}`,
    },
    {
      label: '总还款对比',
      value: `${formatMoney(result.originalSummary.totalPayment)} → ${formatMoney(result.simulatedSummary.totalPayment)}`,
    },
  ];

  const visibleItems = items.filter((item) => item.show !== false);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleItems.map((item) => (
          <div key={item.label}>
            <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
            <p
              className={`text-base font-semibold flex items-center gap-1 ${
                item.color === 'green'
                  ? 'text-green-600 dark:text-green-400'
                  : item.color === 'red'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-foreground'
              }`}
            >
              {item.icon === 'down' && (
                <ArrowDown className="w-3.5 h-3.5 shrink-0" />
              )}
              {item.icon === 'up' && (
                <ArrowUp className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="break-all">{item.value}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
