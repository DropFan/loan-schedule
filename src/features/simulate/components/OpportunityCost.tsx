import type { SimulateResult } from '../useSimulation';

interface Props {
  result: SimulateResult;
}

function fmtMoney(v: number): string {
  return `¥${Math.abs(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtObservation(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (rest === 0) return `${years}年`;
  if (years === 0) return `${rest}个月`;
  return `${years}年${rest}个月`;
}

export function OpportunityCost({ result }: Props) {
  if (!result.isValid) return null;

  if (result.totalInvestment === 0) {
    return <BaselineAnalysis result={result} />;
  }
  if (result.totalInvestment < 0) {
    return <ReducedPaymentAnalysis result={result} />;
  }
  return <IncreasedPaymentAnalysis result={result} />;
}

/** 尚未调整：展示观察期和理财利率，提示用户调整参数 */
function BaselineAnalysis({ result }: Props) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold">
        机会成本分析
        <span className="font-normal text-muted-foreground ml-1">
          （观察期 {fmtObservation(result.observationMonths)}）
        </span>
      </h3>
      <p className="text-sm text-muted-foreground">
        调整月供或输入提前还款金额后，将对比提前还贷与 {result.investmentRate}%
        理财的收益差异
      </p>
    </div>
  );
}

/** 增加月供 / 一次性还款：投入资金提前还贷 vs 理财 */
function IncreasedPaymentAnalysis({ result }: Props) {
  const prepayBetter = result.netBenefit >= 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold">
        机会成本分析
        <span className="font-normal text-muted-foreground ml-1">
          （观察期 {fmtObservation(result.observationMonths)}）
        </span>
      </h3>
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

/** 减少月供：省下的现金流拿去理财 vs 多付的利息 */
function ReducedPaymentAnalysis({ result }: Props) {
  // 减少月供时：totalInvestment 为负（少付的总额），interestSaved 为负（多付的利息）
  const savedCash = Math.abs(result.totalInvestment); // 省下的现金流总额
  const extraInterest = Math.abs(result.interestSaved); // 多付的利息
  const investReturn = result.investmentReturn; // 省下的钱拿去理财的收益（基于 |totalInvestment| 计算）
  const netGain = investReturn - extraInterest; // 理财收益 - 多付利息
  const worthIt = netGain >= 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold">
        机会成本分析
        <span className="font-normal text-muted-foreground ml-1">
          （观察期 {fmtObservation(result.observationMonths)}）
        </span>
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">省下现金流总额</p>
          <p className="text-sm font-semibold text-foreground">
            {fmtMoney(savedCash)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">多付利息</p>
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            {fmtMoney(extraInterest)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">
            理财预期收益（{result.investmentRate}%）
          </p>
          <p className="text-sm font-semibold text-foreground">
            {fmtMoney(investReturn)}
          </p>
        </div>
      </div>
      <div
        className={`text-sm px-3 py-2 rounded-lg ${
          worthIt
            ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300'
            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
        }`}
      >
        {worthIt
          ? `减少月供后理财净赚 ${fmtMoney(netGain)}（理财收益 ${fmtMoney(investReturn)} - 多付利息 ${fmtMoney(extraInterest)}）`
          : `减少月供不划算，多付利息 ${fmtMoney(extraInterest)} 超过理财收益 ${fmtMoney(investReturn)}`}
      </div>
    </div>
  );
}
