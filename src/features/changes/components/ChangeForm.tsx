import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChangeType,
  PrepaymentMode,
  PrepaymentModeName,
} from '@/core/types/loan.types';
import { formatDate } from '@/core/utils/formatHelper';
import { Validator } from '@/core/utils/validator';
import { useLoanStore } from '@/stores/useLoanStore';

export function ChangeForm() {
  const {
    applyChange,
    undo,
    canUndo,
    schedule,
    changes,
    params,
    savedRateTables,
    rateTable,
  } = useLoanStore();
  const hasSchedule = schedule.length > 0;
  const currentMethod = changes[changes.length - 1]?.loanMethod;
  const remainingLoan = changes[changes.length - 1]?.loanAmount ?? 0;

  // 利率变更
  const [newRate, setNewRate] = useState('');
  const [rateDate, setRateDate] = useState('');
  const [rateError, setRateError] = useState('');
  const [selectedRateTableId, setSelectedRateTableId] = useState('');
  const [applyResult, setApplyResult] = useState('');

  // 提前还款
  const [prepayAmount, setPrepayAmount] = useState('');
  const [prepayDate, setPrepayDate] = useState('');
  const [prepayMode, setPrepayMode] = useState<PrepaymentMode>(
    PrepaymentMode.ReducePayment,
  );
  const [prepayError, setPrepayError] = useState('');

  const handleApplyRateTable = () => {
    if (!params || !currentMethod) return;
    setApplyResult('');

    // 获取利率表条目：从选中的已保存利率表或当前利率表
    const entries = selectedRateTableId
      ? (savedRateTables.find((t) => t.id === selectedRateTableId)?.entries ??
        [])
      : rateTable;

    if (entries.length === 0) {
      setApplyResult('利率表为空');
      return;
    }

    const startDateStr = formatDate(params.startDate);
    // 获取已应用的利率变更日期集合
    const appliedDates = new Set(
      changes
        .filter((c) => c.comment.includes('利率变更'))
        .map((c) => formatDate(c.date)),
    );

    // 筛选：贷款开始后、未重复应用的条目
    const toApply = entries
      .filter((e) => e.date > startDateStr && !appliedDates.has(e.date))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (toApply.length === 0) {
      setApplyResult('没有需要应用的利率变更');
      return;
    }

    for (const entry of toApply) {
      applyChange({
        type: ChangeType.RateChange,
        date: new Date(entry.date),
        loanMethod: currentMethod,
        newAnnualRate: entry.annualRate,
      });
    }

    setApplyResult(`已应用 ${toApply.length} 条利率变更`);
  };

  if (!hasSchedule || !currentMethod) return null;

  const handleRateChange = (e: React.FormEvent) => {
    e.preventDefault();
    setRateError('');

    const rateNum = Number(newRate);
    const rateCheck = Validator.annualInterestRate(rateNum);
    if (!rateCheck.valid) {
      setRateError(rateCheck.message);
      return;
    }

    const dateCheck = Validator.date(rateDate);
    if (!dateCheck.valid) {
      setRateError(dateCheck.message);
      return;
    }

    applyChange({
      type: ChangeType.RateChange,
      date: new Date(rateDate),
      loanMethod: currentMethod,
      newAnnualRate: rateNum,
    });

    setNewRate('');
    setRateDate('');
  };

  const handlePrepay = (e: React.FormEvent) => {
    e.preventDefault();
    setPrepayError('');

    const amountNum = Number(prepayAmount);
    const amountCheck = Validator.prepayAmount(amountNum, remainingLoan);
    if (!amountCheck.valid) {
      setPrepayError(amountCheck.message);
      return;
    }

    const dateCheck = Validator.date(prepayDate);
    if (!dateCheck.valid) {
      setPrepayError(dateCheck.message);
      return;
    }

    applyChange({
      type: ChangeType.Prepayment,
      date: new Date(prepayDate),
      loanMethod: currentMethod,
      prepayAmount: amountNum,
      prepaymentMode: prepayMode,
    });

    setPrepayAmount('');
    setPrepayDate('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>变更操作</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="rate">
          <TabsList className="w-full">
            <TabsTrigger value="rate" className="flex-1">
              利率变更
            </TabsTrigger>
            <TabsTrigger value="prepay" className="flex-1">
              提前还款
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rate">
            <form onSubmit={handleRateChange} className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label htmlFor="new-rate">新的年利率 (%)</Label>
                <Input
                  id="new-rate"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rate-date">生效日期</Label>
                <Input
                  id="rate-date"
                  type="date"
                  value={rateDate}
                  onChange={(e) => setRateDate(e.target.value)}
                />
              </div>
              {rateError && <p className="text-sm text-red-500">{rateError}</p>}
              <Button type="submit" className="w-full">
                更新利率
              </Button>
            </form>

            {(savedRateTables.length > 0 || rateTable.length > 0) && (
              <div className="mt-4 pt-4 border-t space-y-2">
                <Label>从利率表导入</Label>
                <select
                  value={selectedRateTableId}
                  onChange={(e) => {
                    setSelectedRateTableId(e.target.value);
                    setApplyResult('');
                  }}
                  className="w-full text-sm border border-border rounded-md px-2 py-1.5 bg-card text-foreground"
                >
                  {rateTable.length > 0 && <option value="">当前利率表</option>}
                  {savedRateTables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleApplyRateTable}
                >
                  一键应用利率变更
                </Button>
                {applyResult && (
                  <p className="text-sm text-muted-foreground">{applyResult}</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="prepay">
            <form onSubmit={handlePrepay} className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label htmlFor="prepay-amount">还款金额 (元)</Label>
                <Input
                  id="prepay-amount"
                  type="number"
                  inputMode="decimal"
                  value={prepayAmount}
                  onChange={(e) => setPrepayAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prepay-date">还款日期</Label>
                <Input
                  id="prepay-date"
                  type="date"
                  value={prepayDate}
                  onChange={(e) => setPrepayDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prepay-mode">变更方式</Label>
                <Select
                  value={prepayMode}
                  onValueChange={(v) => setPrepayMode(v as PrepaymentMode)}
                >
                  <SelectTrigger>
                    {PrepaymentModeName[prepayMode]}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PrepaymentMode.ReducePayment}>
                      减少月供（期限不变）
                    </SelectItem>
                    <SelectItem value={PrepaymentMode.ShortenTerm}>
                      缩短年限（月供不变）
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {prepayError && (
                <p className="text-sm text-red-500">{prepayError}</p>
              )}
              <Button type="submit" className="w-full">
                提前还款
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <Button
          variant="outline"
          className="w-full mt-4"
          disabled={!canUndo}
          onClick={undo}
        >
          撤销上一步变更
        </Button>
      </CardContent>
    </Card>
  );
}
