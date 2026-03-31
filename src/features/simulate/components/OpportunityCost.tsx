import type { SimulateResult } from '../useSimulation';

interface Props {
  result: SimulateResult;
}

function fmtMoney(v: number): string {
  return `¥${Math.abs(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function OpportunityCost({ result }: Props) {
  if (!result.isValid || result.totalInvestment <= 0) return null;

  const prepayBetter = result.netBenefit >= 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold">机会成本分析</h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">
            理财预期收益（{result.investmentRate}%）
          </p>
          <p className="text-sm font-semibold text-foreground">
            {fmtMoney(result.investmentReturn)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">
            提前还贷节省利息
          </p>
          <p className="text-sm font-semibold text-green-600 dark:text-green-400">
            {fmtMoney(result.interestSaved)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">净收益差</p>
          <p
            className={`text-sm font-semibold ${
              prepayBetter
                ? 'text-green-600 dark:text-green-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {prepayBetter ? '+' : '-'}
            {fmtMoney(result.netBenefit)}
          </p>
        </div>
      </div>
      <div
        className={`text-sm px-3 py-2 rounded-lg ${
          prepayBetter
            ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300'
            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
        }`}
      >
        {prepayBetter
          ? `提前还贷比 ${result.investmentRate}% 理财多省 ${fmtMoney(result.netBenefit)}`
          : `${result.investmentRate}% 理财比提前还贷多赚 ${fmtMoney(result.netBenefit)}`}
      </div>
    </div>
  );
}
