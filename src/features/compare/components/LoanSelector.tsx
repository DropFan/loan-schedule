import { COMPARE_COLORS, type LoanOption } from '../ComparePage';

const MAX_SELECTED = 4;

interface Props {
  loans: LoanOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

export function LoanSelector({ loans, selected, onChange }: Props) {
  const atLimit = selected.length >= MAX_SELECTED;

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else if (!atLimit) {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      {loans.map((loan) => {
        const isChecked = selected.includes(loan.id);
        const colorIndex = isChecked ? selected.indexOf(loan.id) : -1;
        const color =
          colorIndex >= 0
            ? COMPARE_COLORS[colorIndex % COMPARE_COLORS.length]
            : undefined;
        const disabled = !isChecked && atLimit;

        return (
          <label
            key={loan.id}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer select-none transition-colors ${
              isChecked
                ? 'border-primary/40 bg-primary/5'
                : disabled
                  ? 'border-border opacity-40 cursor-not-allowed'
                  : 'border-border hover:border-primary/30'
            }`}
          >
            <input
              type="checkbox"
              checked={isChecked}
              disabled={disabled}
              onChange={() => toggle(loan.id)}
              className="sr-only"
            />
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: color ?? '#ccc' }}
            />
            <span className="truncate max-w-[160px]">
              {loan.name}
              {loan.isActive && (
                <span className="ml-1 text-xs text-muted-foreground">
                  (当前)
                </span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}
