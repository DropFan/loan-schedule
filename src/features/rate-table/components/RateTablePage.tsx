import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RateEntry } from '@/stores/useLoanStore';
import { useLoanStore } from '@/stores/useLoanStore';
import { getLprChangePoints } from '../data/lpr-history';
import { LprRateProvider } from '../rate-provider';
import { RateEntryDialog } from './RateEntryDialog';

type RateSource = 'custom' | 'lpr';

export function RateTablePage() {
  const { rateTable, updateRateTable, params } = useLoanStore();
  const [source, setSource] = useState<RateSource>(
    rateTable.some((e) => e.source === 'lpr') ? 'lpr' : 'custom',
  );
  const [basisPoints, setBasisPoints] = useState(() => {
    if (rateTable.length > 0 && rateTable[0].source === 'lpr') {
      const lprPoints = getLprChangePoints();
      const firstLpr = lprPoints[0]?.rate ?? 0;
      return Math.round((rateTable[0].annualRate - firstLpr) * 100);
    }
    return 0;
  });

  const lprTimeline = useMemo(() => {
    const provider = new LprRateProvider(basisPoints);
    return provider.getRateTimeline();
  }, [basisPoints]);

  const sorted = [...rateTable].sort((a, b) => a.date.localeCompare(b.date));

  const handleSourceChange = (newSource: RateSource) => {
    setSource(newSource);
    if (newSource === 'lpr') {
      updateRateTable(lprTimeline);
    }
  };

  const handleBpChange = (bp: number) => {
    setBasisPoints(bp);
    const provider = new LprRateProvider(bp);
    updateRateTable(provider.getRateTimeline());
  };

  const handleAdd = (entry: RateEntry) => {
    updateRateTable([...rateTable, entry]);
  };

  const handleEdit = (index: number, entry: RateEntry) => {
    const updated = [...rateTable];
    updated[index] = entry;
    updateRateTable(updated);
  };

  const handleDelete = (index: number) => {
    updateRateTable(rateTable.filter((_, i) => i !== index));
  };

  return (
    <div className="p-4 lg:p-6 max-w-2xl space-y-4">
      {/* 数据源切换 */}
      <Card>
        <CardHeader>
          <CardTitle>数据源</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSourceChange('custom')}
              className={`flex-1 px-3 py-2 rounded-md text-sm border transition-colors ${
                source === 'custom'
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border text-muted-foreground hover:bg-muted/10'
              }`}
            >
              自定义
            </button>
            <button
              type="button"
              onClick={() => handleSourceChange('lpr')}
              className={`flex-1 px-3 py-2 rounded-md text-sm border transition-colors ${
                source === 'lpr'
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border text-muted-foreground hover:bg-muted/10'
              }`}
            >
              LPR + 基点
            </button>
          </div>

          {source === 'lpr' && (
            <div className="space-y-1">
              <Label>基点偏移 (bp)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={basisPoints}
                  onChange={(e) => handleBpChange(Number(e.target.value))}
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">
                  1bp = 0.01%，如 -20bp 表示 LPR 下浮 0.20%
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 利率表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>利率表</CardTitle>
          {source === 'custom' && (
            <RateEntryDialog
              onSave={handleAdd}
              trigger={
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" /> 添加利率
                </Button>
              }
            />
          )}
        </CardHeader>
        <CardContent>
          {params && (
            <div className="flex items-center justify-between py-2 px-3 mb-2 rounded bg-muted/20 text-sm">
              <span>
                {params.startDate instanceof Date
                  ? params.startDate.toISOString().split('T')[0]
                  : String(params.startDate).split('T')[0]}
              </span>
              <span className="font-medium">{params.annualInterestRate}%</span>
              <span className="text-xs text-muted-foreground">
                初始利率（自动同步）
              </span>
            </div>
          )}

          {sorted.length === 0 && !params && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              暂无利率数据。请先在贷款计算页面设置贷款参数。
            </p>
          )}

          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {sorted.map((entry, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: 利率条目无稳定唯一 ID
                key={`${entry.date}-${i}`}
                className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted/10"
              >
                <span className="text-sm">{entry.date}</span>
                <span className="text-sm font-medium">{entry.annualRate}%</span>
                {source === 'lpr' && (
                  <span className="text-xs text-muted-foreground">LPR</span>
                )}
                {source === 'custom' && (
                  <div className="flex gap-1">
                    <RateEntryDialog
                      entry={entry}
                      onSave={(updated) => handleEdit(i, updated)}
                      trigger={
                        <Button variant="ghost" size="sm">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(i)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            {source === 'lpr'
              ? `基于 LPR 5年期 ${basisPoints >= 0 ? '+' : ''}${basisPoints}bp 自动生成。数据来源：中国人民银行。`
              : '利率表中的变更会自动应用到还款计划。'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
