import type { PaymentScheduleItem } from '@/core/types/loan.types';
import type { SimulateInput } from '../useSimulation';

interface SimulateFormProps {
  input: SimulateInput;
  onChange: (input: SimulateInput) => void;
  schedule: PaymentScheduleItem[];
  currentMonthlyPayment: number;
  remainingLoan: number;
  defaultStartPeriod: number;
  defaultLumpSumPeriod: number;
}

const MODE_LABELS = {
  'adjust-monthly': '调整月供',
  'lump-sum': '一次性还款',
} as const;

const LUMP_SUM_QUICK = [
  { label: '5万', value: 50000 },
  { label: '10万', value: 100000 },
  { label: '20万', value: 200000 },
  { label: '50万', value: 500000 },
  { label: '100万', value: 1000000 },
];

const OBSERVATION_PRESETS: Array<{
  label: string;
  months: number | undefined;
}> = [
  { label: '1年', months: 12 },
  { label: '2年', months: 24 },
  { label: '3年', months: 36 },
  { label: '5年', months: 60 },
  { label: '10年', months: 120 },
  { label: '到期', months: undefined },
];

const INVESTMENT_RATE_OPTIONS = [
  { label: '1.5% 货基', value: 1.5 },
  { label: '2.5% 定存', value: 2.5 },
  { label: '5% 基金', value: 5 },
];

const inputClass =
  'mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30';

export function SimulateForm({
  input,
  onChange,
  schedule,
  currentMonthlyPayment,
  remainingLoan,
  defaultStartPeriod,
  defaultLumpSumPeriod,
}: SimulateFormProps) {
  const regularItems = schedule.filter((s) => s.period > 0);
  const maxPeriod =
    regularItems.length > 0 ? regularItems[regularItems.length - 1].period : 0;

  const isCustomRate = !INVESTMENT_RATE_OPTIONS.some(
    (o) => o.value === input.investmentRate,
  );

  // 月供滑块范围：50% ~ 300% 当前月供
  const monthlyMin = Math.max(Math.round(currentMonthlyPayment * 0.5), 1);
  const monthlyMax = Math.round(currentMonthlyPayment * 3);
  const currentVal = input.newMonthly ?? currentMonthlyPayment;

  // 月供滑块关键刻度
  const monthlyRange = monthlyMax - monthlyMin;
  const monthlyTicks = [
    { value: monthlyMin, label: `${monthlyMin}`, pct: 0 },
    {
      value: Math.round(currentMonthlyPayment),
      label: `${Math.round(currentMonthlyPayment)}`,
      pct: ((currentMonthlyPayment - monthlyMin) / monthlyRange) * 100,
    },
    { value: monthlyMax, label: `${monthlyMax}`, pct: 100 },
  ];

  // 月供快捷按钮：基于当前月供的偏移
  const monthlyQuick = [
    { label: '-1000', value: Math.round(currentMonthlyPayment - 1000) },
    { label: '-500', value: Math.round(currentMonthlyPayment - 500) },
    {
      label: '当前',
      value: Math.round(currentMonthlyPayment),
    },
    { label: '+500', value: Math.round(currentMonthlyPayment + 500) },
    { label: '+1000', value: Math.round(currentMonthlyPayment + 1000) },
    { label: '+2000', value: Math.round(currentMonthlyPayment + 2000) },
  ].filter((q) => q.value >= monthlyMin && q.value <= monthlyMax);

  // 变化提示
  const monthlyDiff =
    input.newMonthly != null ? input.newMonthly - currentMonthlyPayment : 0;
  const monthlyDiffPct =
    currentMonthlyPayment > 0
      ? ((monthlyDiff / currentMonthlyPayment) * 100).toFixed(1)
      : '0';

  // 一次性还款滑块
  const periodMap = new Map(regularItems.map((s) => [s.period, s]));
  const lumpSumTargetPeriod = input.lumpSumPeriod ?? defaultLumpSumPeriod;
  const lumpSumMaxAmount =
    periodMap.get(lumpSumTargetPeriod)?.remainingLoan ?? remainingLoan;

  const lumpMax = Math.round(lumpSumMaxAmount);
  const lumpMid = Math.round(lumpMax / 2 / 10000) * 10000;
  const fmtLumpTick = (v: number) =>
    v >= 10000 ? `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}万` : `${v}`;
  const lumpSumTicks = [
    { value: 0, label: '0', pct: 0 },
    ...(lumpMid > 0 && lumpMid < lumpMax
      ? [
          {
            value: lumpMid,
            label: fmtLumpTick(lumpMid),
            pct: (lumpMid / lumpMax) * 100,
          },
        ]
      : []),
    { value: lumpMax, label: fmtLumpTick(lumpMax), pct: 100 },
  ];

  // 观察期截止日期
  const observationEndDate = input.observationMonths
    ? (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + input.observationMonths);
        return d.toISOString().split('T')[0];
      })()
    : '';

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4 h-fit lg:sticky lg:top-4">
      {/* 模式切换 */}
      <div className="flex gap-1">
        {(Object.keys(MODE_LABELS) as Array<keyof typeof MODE_LABELS>).map(
          (mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChange({ ...input, mode })}
              className={`flex-1 px-3 py-1.5 text-sm rounded-md border transition-colors ${
                input.mode === mode
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border text-muted-foreground hover:bg-muted/10'
              }`}
            >
              {MODE_LABELS[mode]}
            </button>
          ),
        )}
      </div>

      {/* 模式 A：调整月供 */}
      {input.mode === 'adjust-monthly' && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm text-muted-foreground">
              新月还款额（元）
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder={`当前 ${Math.round(currentMonthlyPayment)}`}
              value={input.newMonthly ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  ...input,
                  newMonthly: v === '' ? undefined : Number(v),
                });
              }}
              className={inputClass}
            />
            <input
              type="range"
              min={monthlyMin}
              max={monthlyMax}
              step={100}
              value={currentVal}
              onChange={(e) =>
                onChange({ ...input, newMonthly: Number(e.target.value) })
              }
              className="mt-2 w-full accent-primary"
            />
            <div className="relative text-[10px] mt-0.5 h-4">
              {monthlyTicks.map((tick) => (
                <button
                  key={tick.value}
                  type="button"
                  onClick={() => onChange({ ...input, newMonthly: tick.value })}
                  className={`absolute -translate-x-1/2 hover:text-primary transition-colors ${
                    input.newMonthly === tick.value
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground/60'
                  }`}
                  style={{ left: `${tick.pct}%` }}
                >
                  {tick.label}
                </button>
              ))}
            </div>
          </label>

          {/* 快捷按钮 */}
          <div className="flex flex-wrap gap-1.5">
            {monthlyQuick.map((q) => (
              <button
                key={q.value}
                type="button"
                onClick={() => onChange({ ...input, newMonthly: q.value })}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                  input.newMonthly === q.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted/30'
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
          {input.newMonthly != null && (
            <p className="text-xs text-muted-foreground">
              当前月供 {Math.round(currentMonthlyPayment)}，变化{' '}
              <span
                className={
                  monthlyDiff > 0
                    ? 'text-red-500'
                    : monthlyDiff < 0
                      ? 'text-green-500'
                      : ''
                }
              >
                {monthlyDiff > 0 ? '+' : ''}
                {Math.round(monthlyDiff)}（{monthlyDiff > 0 ? '+' : ''}
                {monthlyDiffPct}%）
              </span>
            </p>
          )}

          <label className="block">
            <span className="text-sm text-muted-foreground">从第几期开始</span>
            <input
              type="number"
              min={1}
              max={maxPeriod}
              placeholder={`默认第 ${defaultStartPeriod} 期（下一期）`}
              value={input.startPeriod ?? defaultStartPeriod}
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  ...input,
                  startPeriod: v === '' ? undefined : Number(v),
                });
              }}
              className={inputClass}
            />
          </label>
        </div>
      )}

      {/* 模式 B：一次性还款 */}
      {input.mode === 'lump-sum' && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm text-muted-foreground">
              提前还款金额（元）
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="如 100000"
              value={input.lumpSumAmount ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  ...input,
                  lumpSumAmount: v === '' ? undefined : Number(v),
                });
              }}
              className={inputClass}
            />
            <input
              type="range"
              min={0}
              max={Math.round(lumpSumMaxAmount)}
              step={10000}
              value={input.lumpSumAmount ?? 0}
              onChange={(e) =>
                onChange({ ...input, lumpSumAmount: Number(e.target.value) })
              }
              className="mt-2 w-full accent-primary"
            />
            <div className="relative text-[10px] mt-0.5 h-4">
              {lumpSumTicks.map((tick) => (
                <button
                  key={tick.value}
                  type="button"
                  onClick={() =>
                    onChange({ ...input, lumpSumAmount: tick.value })
                  }
                  className={`absolute -translate-x-1/2 hover:text-primary transition-colors ${
                    input.lumpSumAmount === tick.value
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground/60'
                  }`}
                  style={{ left: `${tick.pct}%` }}
                >
                  {tick.label}
                </button>
              ))}
            </div>
          </label>

          {/* 快捷金额 */}
          <div className="flex flex-wrap gap-1.5">
            {LUMP_SUM_QUICK.filter((q) => q.value < lumpSumMaxAmount).map(
              (q) => (
                <button
                  key={q.value}
                  type="button"
                  onClick={() => onChange({ ...input, lumpSumAmount: q.value })}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                    input.lumpSumAmount === q.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted/30'
                  }`}
                >
                  {q.label}
                </button>
              ),
            )}
          </div>

          <label className="block">
            <span className="text-sm text-muted-foreground">在第几期执行</span>
            <input
              type="number"
              min={1}
              max={maxPeriod}
              placeholder={`默认第 ${defaultLumpSumPeriod} 期（下一期）`}
              value={input.lumpSumPeriod ?? defaultLumpSumPeriod}
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  ...input,
                  lumpSumPeriod: v === '' ? undefined : Number(v),
                });
              }}
              className={inputClass}
            />
          </label>
          <div>
            <span className="text-sm text-muted-foreground">处理方式</span>
            <div className="mt-1 flex gap-2">
              {(
                [
                  ['reduce-payment', '减少月供'],
                  ['shorten-term', '缩短年限'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ ...input, lumpSumStrategy: value })}
                  className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors border ${
                    input.lumpSumStrategy === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 理财收益率 */}
      <div>
        <span className="text-sm text-muted-foreground">
          理财收益率（机会成本对比）
        </span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {INVESTMENT_RATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...input, investmentRate: opt.value })}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                input.investmentRate === opt.value && !isCustomRate
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted/30'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <div className="flex items-center gap-1">
            <input
              type="text"
              inputMode="decimal"
              placeholder="自定义"
              value={isCustomRate ? input.investmentRate : ''}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') return;
                onChange({ ...input, investmentRate: Number(v) });
              }}
              className={`w-16 px-2 py-1 text-xs border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                isCustomRate ? 'border-primary' : 'border-border'
              }`}
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        </div>
      </div>
      {/* 观察期 */}
      <div>
        <span className="text-sm text-muted-foreground">
          观察期（机会成本计算周期）
        </span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {OBSERVATION_PRESETS.map((opt) => {
            const isActive = input.observationMonths === opt.months;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() =>
                  onChange({ ...input, observationMonths: opt.months })
                }
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                  isActive
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted/30'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">
            截止日期
          </span>
          <input
            type="date"
            value={observationEndDate}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                onChange({ ...input, observationMonths: undefined });
                return;
              }
              const endDate = new Date(v);
              const today = new Date();
              const diffMonths =
                (endDate.getFullYear() - today.getFullYear()) * 12 +
                (endDate.getMonth() - today.getMonth());
              if (diffMonths > 0) {
                onChange({ ...input, observationMonths: diffMonths });
              }
            }}
            className="flex-1 px-2 py-1 text-xs border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
    </div>
  );
}
