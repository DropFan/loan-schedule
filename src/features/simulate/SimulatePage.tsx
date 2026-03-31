import { FlaskConical } from 'lucide-react';

export function SimulatePage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
      <FlaskConical className="w-12 h-12 opacity-30" />
      <p className="text-lg font-medium">还款模拟功能即将上线</p>
      <p className="text-sm">
        支持额外月供和一次性提前还款模拟，帮助您找到最优还款策略
      </p>
    </div>
  );
}
