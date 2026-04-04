import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SavedLoan } from '@/stores/useLoanStore';

export type CombinedViewMode = 'combined' | 0 | 1;

interface CombinedViewTabsProps {
  loanA: SavedLoan;
  loanB: SavedLoan;
  value: CombinedViewMode;
  onChange: (mode: CombinedViewMode) => void;
}

export function CombinedViewTabs({
  loanA,
  loanB,
  value,
  onChange,
}: CombinedViewTabsProps) {
  return (
    <Tabs
      value={String(value)}
      onValueChange={(v) => {
        if (v === 'combined') onChange('combined');
        else onChange(Number(v) as 0 | 1);
      }}
    >
      <TabsList variant="line" className="text-sm">
        <TabsTrigger value="combined">合计</TabsTrigger>
        <TabsTrigger value="0">{loanA.name}</TabsTrigger>
        <TabsTrigger value="1">{loanB.name}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
