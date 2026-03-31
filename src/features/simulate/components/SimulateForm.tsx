import type { PaymentScheduleItem } from '@/core/types/loan.types';
import type { SimulateInput } from '../useSimulation';

interface SimulateFormProps {
  input: SimulateInput;
  onChange: (input: SimulateInput) => void;
  schedule: PaymentScheduleItem[];
  currentMonthlyPayment: number;
  remainingLoan: number;
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

const ADJUST_MONTHLY_QUICK = [
  { label: '-1000', value: -1000 },
  { label: '-500', value: -500 },
  { label: '+500', value: 500 },
  { label: '+1000', value: 1000 },
  { label: '+2000', value: 2000 },
  { label: '+5000', value: 5000 },
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
}: SimulateFormProps) {
  const regularItems = schedule.filter((s) => s.period > 0);
  const maxPeriod =
    regularItems.length > 0 ? regularItems[regularItems.length - 1].period : 0;

  const isCustomRate = !INVESTMENT_RATE_OPTIONS.some(
    (o) => o.value === input.investmentRate,
  );

  const sliderMin = -Math.round(currentMonthlyPayment * 0.5);
  const sliderMax = Math.round(currentMonthlyPayment * 2);

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
              className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                input.mode === mode
                  ? 'bg-primary text-white'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
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
              月供调整额（元）
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="正数增加、负数减少"
              value={input.monthlyAdjust ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  ...input,
                  monthlyAdjust: v === '' || v === '-' ? undefined : Number(v),
                });
              }}
              className={inputClass}
            />
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={100}
              value={input.monthlyAdjust ?? 0}
              onChange={(e) =>
                onChange({ ...input, monthlyAdjust: Number(e.target.value) })
              }
              className="mt-2 w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-0.5">
              <span>-{Math.abs(sliderMin)}</span>
              <span>0</span>
              <span>+{sliderMax}</span>
            </div>
          </label>

          {/* 快捷按钮 */}
          <div className="flex flex-wrap gap-1.5">
            {ADJUST_MONTHLY_QUICK.map((q) => (
              <button
                key={q.value}
                type="button"
                onClick={() => onChange({ ...input, monthlyAdjust: q.value })}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                  input.monthlyAdjust === q.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted/30'
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
          {currentMonthlyPayment > 0 && (
            <p className="text-xs text-muted-foreground">
              当前月供 {currentMonthlyPayment.toFixed(0)}，调整后{' '}
              {input.monthlyAdjust != null
                ? (currentMonthlyPayment + input.monthlyAdjust).toFixed(0)
                : '-'}
            </p>
          )}

          <label className="block">
            <span className="text-sm text-muted-foreground">从第几期开始</span>
            <input
              type="number"
              min={1}
              max={maxPeriod}
              placeholder={`1 ~ ${maxPeriod}`}
              value={input.startPeriod ?? ''}
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
              max={Math.round(remainingLoan)}
              step={10000}
              value={input.lumpSumAmount ?? 0}
              onChange={(e) =>
                onChange({ ...input, lumpSumAmount: Number(e.target.value) })
              }
              className="mt-2 w-full accent-primary"
            />
          </label>

          {/* 快捷金额 */}
          <div className="flex flex-wrap gap-1.5">
            {LUMP_SUM_QUICK.filter((q) => q.value < remainingLoan).map((q) => (
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
            ))}
          </div>

          <label className="block">
            <span className="text-sm text-muted-foreground">在第几期执行</span>
            <input
              type="number"
              min={1}
              max={maxPeriod}
              placeholder={`1 ~ ${maxPeriod}`}
              value={input.lumpSumPeriod ?? ''}
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
    </div>
  );
}
