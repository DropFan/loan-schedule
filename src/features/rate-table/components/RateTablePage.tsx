import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RateEntry } from '@/stores/useLoanStore';
import { useLoanStore } from '@/stores/useLoanStore';
import { RateEntryDialog } from './RateEntryDialog';

export function RateTablePage() {
  const { rateTable, updateRateTable, params } = useLoanStore();

  const sorted = [...rateTable].sort((a, b) => a.date.localeCompare(b.date));

  const handleAdd = (entry: RateEntry) => {
    updateRateTable([...rateTable, entry]);
  };

  const handleEdit = (index: number, entry: RateEntry) => {
    const updated = [...rateTable];
    updated[index] = entry;
    updateRateTable(updated);
  };

  const handleDelete = (index: number) => {
    const updated = rateTable.filter((_, i) => i !== index);
    updateRateTable(updated);
  };

  return (
    <div className="p-4 lg:p-6 max-w-2xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>利率表</CardTitle>
          <RateEntryDialog
            onSave={handleAdd}
            trigger={
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" /> 添加利率
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          {params && (
            <div className="flex items-center justify-between py-2 px-3 mb-2 rounded bg-muted/20 text-sm">
              <span>{params.startDate instanceof Date ? params.startDate.toISOString().split('T')[0] : String(params.startDate).split('T')[0]}</span>
              <span className="font-medium">{params.annualInterestRate}%</span>
              <span className="text-xs text-muted">初始利率（自动同步）</span>
            </div>
          )}

          {sorted.length === 0 && !params && (
            <p className="text-sm text-muted py-4 text-center">
              暂无利率数据。请先在贷款计算页面设置贷款参数。
            </p>
          )}

          <div className="space-y-1">
            {sorted.map((entry, i) => (
              <div
                key={`${entry.date}-${i}`}
                className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted/10"
              >
                <span className="text-sm">{entry.date}</span>
                <span className="text-sm font-medium">{entry.annualRate}%</span>
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
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(i)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted mt-4">
            利率表中的变更会自动应用到还款计划。首条利率与贷款参数中的利率同步。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
