import type { PaymentScheduleItem } from '@/core/types/loan.types';
import type { SimulateInput } from '../useSimulation';

interface SimulateFormProps {
  input: SimulateInput;
  onChange: (input: SimulateInput) => void;
  schedule: PaymentScheduleItem[];
}

const MODE_LABELS = {
  'extra-monthly': '额外月供',
  'lump-sum': '一次性还款',
} as const;

export function SimulateForm({ input, onChange, schedule }: SimulateFormProps) {
  const regularItems = schedule.filter((s) => s.period > 0);
  const maxPeriod =
    regularItems.length > 0 ? regularItems[regularItems.length - 1].period : 0;

  const handleModeChange = (mode: SimulateInput['mode']) => {
    onChange({ ...input, mode });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4 h-fit">
      {/* 模式切换 */}
      <div className="flex gap-1">
        {(Object.keys(MODE_LABELS) as Array<keyof typeof MODE_LABELS>).map(
          (mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleModeChange(mode)}
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

      {/* 模式 A：额外月供 */}
      {input.mode === 'extra-monthly' && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm text-muted-foreground">
              每月额外还款（元）
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="如 2000"
              value={input.extraMonthly ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  ...input,
                  extraMonthly: v === '' ? undefined : Number(v),
                });
              }}
              className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
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
              className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
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
              className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
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
              className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
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
    </div>
  );
}
