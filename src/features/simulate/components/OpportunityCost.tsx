import { InfoTip } from '@/components/ui/info-tip';
import type { SimulateResult } from '../useSimulation';

interface Props {
  result: SimulateResult;
}

function TipLabel({ text, tip }: { text: string; tip: string }) {
  return (
    <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
      {text}
      <InfoTip content={tip} />
    </p>
  );
}

function fmtMoney(v: number): string {
  return `¥${Math.abs(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtObservation(months: number): string {
  const years = Math.floor(months / 12);
  const wholeMonths = Math.floor(months % 12);
  const dayFraction = months - Math.floor(months);
  const days = Math.round(dayFraction * 30);

  const parts: string[] = [];
  if (years > 0) parts.push(`${years}年`);
  if (wholeMonths > 0) parts.push(`${wholeMonths}个月`);
  if (days > 0) parts.push(`${days}天`);
  return parts.join('') || '0天';
}

function fmtPayback(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y > 0 && m > 0) return `约${y}年${m}个月`;
  if (y > 0) return `约${y}年`;
  return `${m}个月`;
}

function EarlyPayoffNotice({ result }: Props) {
  if (!result.observationCapped) return null;
  return (
    <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded-md px-3 py-2">
      模拟方案将在观察期内提前结清（{result.newEndDate}
      ），之后原方案仍在还款，利息差额持续累积；理财资金则继续复利增长
    </div>
  );
}

export function OpportunityCost({ result }: Props) {
  if (!result.isValid) return null;

  if (result.totalInvestment === 0) {
    return <BaselineAnalysis result={result} />;
  }
  // monthlyExtraPayment < 0 说明用户在调整月供模式下减少了月供
  // （一次性还款+减少月供策略的 monthlyExtraPayment 为 null，走 IncreasedPaymentAnalysis）
  if (
    result.totalInvestment < 0 ||
    (result.monthlyExtraPayment != null && result.monthlyExtraPayment < 0)
  ) {
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
  const isMonthlyMode = result.monthlyExtraPayment != null;
  const actionLabel = isMonthlyMode ? '增加月供' : '提前还款';

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold">
        机会成本分析
        <span className="font-normal text-muted-foreground ml-1">
          （观察期 {fmtObservation(result.observationMonths)}）
        </span>
      </h3>

      <EarlyPayoffNotice result={result} />

      {/* 计算说明 */}
      <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 space-y-1">
        {isMonthlyMode && result.monthlyExtraPayment ? (
          <>
            <div>
              假设每月将额外多还的 {fmtMoney(result.monthlyExtraPayment)}{' '}
              拿去理财（年化 {result.investmentRate}%），观察期{' '}
              {fmtObservation(result.observationMonths)} 内逐月投入、按月复利：
            </div>
            <div className="font-mono text-[11px]">
              理财收益 = 每月 {fmtMoney(result.monthlyExtraPayment)} ×{' '}
              {Math.round(result.observationMonths)} 期复利 ={' '}
              {fmtMoney(result.investmentReturn)}
            </div>
          </>
        ) : (
          <>
            <div>
              假设将 {fmtMoney(result.totalInvestment)}{' '}
              不用于还贷而是拿去理财（年化 {result.investmentRate}%），观察期{' '}
              {fmtObservation(result.observationMonths)} 内按月复利：
            </div>
            <div className="font-mono text-[11px]">
              理财收益 = {fmtMoney(result.totalInvestment)} × (1 +{' '}
              {result.investmentRate}%/12)^
              {Math.round(result.observationMonths)} - 本金 ={' '}
              {fmtMoney(result.investmentReturn)}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
        <div>
          <TipLabel
            text={`理财预期收益（${result.investmentRate}%）`}
            tip={
              isMonthlyMode
                ? `将每月额外投入的资金按年化 ${result.investmentRate}% 定期定额复利计算（年金终值），在观察期内可获得的理财收益。`
                : `将一次性投入的 ${fmtMoney(result.totalInvestment)} 按年化 ${result.investmentRate}% 复利计算，在观察期内可获得的理财收益。`
            }
          />
          <p className="text-sm font-semibold text-foreground">
            {fmtMoney(result.investmentReturn)}
          </p>
        </div>
        <div>
          <TipLabel
            text={
              result.observationInterestSaved >= 0
                ? '观察期节省利息'
                : '观察期多付利息'
            }
            tip="观察期内原方案与模拟方案的利息差额。只计算观察期窗口内的利息，与理财收益在同一时间范围内对比。"
          />
          <p
            className={`text-sm font-semibold ${
              result.observationInterestSaved >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {fmtMoney(result.observationInterestSaved)}
          </p>
        </div>
        <div>
          <TipLabel
            text="净收益差"
            tip="观察期节省利息 - 理财预期收益。正值表示额外还款更划算，负值表示理财更划算。"
          />
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
        <div>
          <TipLabel
            text="回本周期"
            tip="累计利息节省达到投入金额所需的期数。即从第几期开始，提前还款的利息节省已覆盖全部投入成本。"
          />
          <p className="text-sm font-semibold text-foreground">
            {result.paybackMonths != null
              ? `第 ${result.paybackMonths} 期（${fmtPayback(result.paybackMonths)}）`
              : '观察期内未回本'}
          </p>
        </div>
      </div>

      {/* 流动性提示 */}
      {!isMonthlyMode && result.totalInvestment > 0 && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          提前还款的 {fmtMoney(result.totalInvestment)}{' '}
          将锁定在贷款中无法取回，请确保留有足够的应急资金
        </div>
      )}

      {/* 观察期截止对比 */}
      {result.observationEndDate && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 pt-2 border-t border-border/50">
          <div>
            <TipLabel
              text="观察期截止日"
              tip="机会成本对比的时间窗口终点，所有收益和利息差额都在此日期前计算。"
            />
            <p className="text-sm font-semibold text-foreground">
              {result.observationEndDate}
            </p>
          </div>
          <div>
            <TipLabel
              text="截止日剩余本金"
              tip="观察期截止时原方案 → 模拟方案的贷款余额对比。"
            />
            <p className="text-sm text-foreground">
              {fmtMoney(result.observationOriginalRemaining)}
              <span className="text-muted-foreground"> → </span>
              <span
                className={
                  result.observationSimulatedRemaining <
                  result.observationOriginalRemaining
                    ? 'font-semibold text-green-600 dark:text-green-400'
                    : 'font-semibold'
                }
              >
                {result.observationSimulatedRemaining <= 0
                  ? '已还清'
                  : fmtMoney(result.observationSimulatedRemaining)}
              </span>
            </p>
          </div>
          <div>
            <TipLabel
              text="观察期内总还款"
              tip="观察期窗口内原方案 → 模拟方案的累计还款额（本金+利息）对比。"
            />
            <p className="text-sm text-foreground">
              {fmtMoney(result.observationOriginalPayment)}
              <span className="text-muted-foreground"> → </span>
              <span className="font-semibold">
                {fmtMoney(result.observationSimulatedPayment)}
              </span>
            </p>
          </div>
        </div>
      )}
      <div
        className={`text-sm px-3 py-2 rounded-lg ${
          prepayBetter
            ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300'
            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
        }`}
      >
        {prepayBetter
          ? `观察期内${actionLabel}比 ${result.investmentRate}% 理财多省 ${fmtMoney(result.netBenefit)}`
          : `观察期内 ${result.investmentRate}% 理财比${actionLabel}多赚 ${fmtMoney(result.netBenefit)}`}
      </div>
    </div>
  );
}

/** 减少月供：省下的现金流拿去理财 vs 多付的利息 */
function ReducedPaymentAnalysis({ result }: Props) {
  // 减少月供时：totalInvestment 为负（少付的总额），interestSaved 为负（多付的利息）
  const savedCash = Math.abs(result.totalInvestment); // 省下的现金流总额
  const investReturn = result.investmentReturn; // 省下的钱拿去理财的收益
  // 观察期内多付的利息（与理财收益在同一时间窗口对比）
  const obsExtraInterest = Math.abs(result.observationInterestSaved);
  const netGain = investReturn - obsExtraInterest; // 理财收益 - 观察期多付利息
  const worthIt = netGain >= 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold">
        机会成本分析
        <span className="font-normal text-muted-foreground ml-1">
          （观察期 {fmtObservation(result.observationMonths)}）
        </span>
      </h3>

      <EarlyPayoffNotice result={result} />

      {/* 计算说明 */}
      <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 space-y-1">
        <div>
          减少月供后每月省下{' '}
          {fmtMoney(Math.abs(result.monthlyExtraPayment ?? 0))}
          ，假设拿去理财（年化 {result.investmentRate}%），观察期{' '}
          {fmtObservation(result.observationMonths)} 内逐月投入、按月复利：
        </div>
        <div className="font-mono text-[11px]">
          理财收益 = 每月 {fmtMoney(Math.abs(result.monthlyExtraPayment ?? 0))}{' '}
          × {Math.round(result.observationMonths)} 期复利 ={' '}
          {fmtMoney(investReturn)}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
        <div>
          <TipLabel
            text="省下现金流总额"
            tip="减少月供后，整个贷款周期累计少还的金额。这笔钱可以用于理财。"
          />
          <p className="text-sm font-semibold text-foreground">
            {fmtMoney(savedCash)}
          </p>
        </div>
        <div>
          <TipLabel
            text="观察期多付利息"
            tip="观察期内因月供减少导致还款变慢，多付的利息。与理财收益在同一时间窗口内对比。"
          />
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            {fmtMoney(obsExtraInterest)}
          </p>
        </div>
        <div>
          <TipLabel
            text={`理财预期收益（${result.investmentRate}%）`}
            tip={`将省下的现金流按年化 ${result.investmentRate}% 定期定额复利计算，在观察期内可获得的理财收益。`}
          />
          <p className="text-sm font-semibold text-foreground">
            {fmtMoney(investReturn)}
          </p>
        </div>
      </div>
      {/* 观察期截止对比 */}
      {result.observationEndDate && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 pt-2 border-t border-border/50">
          <div>
            <TipLabel
              text="观察期截止日"
              tip="机会成本对比的时间窗口终点，所有收益和利息差额都在此日期前计算。"
            />
            <p className="text-sm font-semibold text-foreground">
              {result.observationEndDate}
            </p>
          </div>
          <div>
            <TipLabel
              text="截止日剩余本金"
              tip="观察期截止时原方案 → 模拟方案的贷款余额对比。"
            />
            <p className="text-sm text-foreground">
              {fmtMoney(result.observationOriginalRemaining)}
              <span className="text-muted-foreground"> → </span>
              <span className="font-semibold">
                {fmtMoney(result.observationSimulatedRemaining)}
              </span>
            </p>
          </div>
          <div>
            <TipLabel
              text="观察期内总还款"
              tip="观察期窗口内原方案 → 模拟方案的累计还款额（本金+利息）对比。"
            />
            <p className="text-sm text-foreground">
              {fmtMoney(result.observationOriginalPayment)}
              <span className="text-muted-foreground"> → </span>
              <span className="font-semibold">
                {fmtMoney(result.observationSimulatedPayment)}
              </span>
            </p>
          </div>
        </div>
      )}
      <div
        className={`text-sm px-3 py-2 rounded-lg ${
          worthIt
            ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300'
            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
        }`}
      >
        {worthIt
          ? `观察期内减少月供后理财净赚 ${fmtMoney(netGain)}（理财收益 ${fmtMoney(investReturn)} - 多付利息 ${fmtMoney(obsExtraInterest)}）`
          : `观察期内减少月供不划算，多付利息 ${fmtMoney(obsExtraInterest)} 超过理财收益 ${fmtMoney(investReturn)}，净亏 ${fmtMoney(netGain)}`}
      </div>
    </div>
  );
}
