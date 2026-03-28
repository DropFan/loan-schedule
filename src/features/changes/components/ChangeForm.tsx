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
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChangeType, PrepaymentMode } from '@/core/types/loan.types';
import { Validator } from '@/core/utils/validator';
import { useLoanStore } from '@/stores/useLoanStore';

export function ChangeForm() {
  const { applyChange, undo, canUndo, schedule, changes } = useLoanStore();
  const hasSchedule = schedule.length > 0;
  const currentMethod = changes[changes.length - 1]?.loanMethod;
  const remainingLoan = schedule[schedule.length - 1]?.remainingLoan ?? 0;

  // 利率变更
  const [newRate, setNewRate] = useState('');
  const [rateDate, setRateDate] = useState('');
  const [rateError, setRateError] = useState('');

  // 提前还款
  const [prepayAmount, setPrepayAmount] = useState('');
  const [prepayDate, setPrepayDate] = useState('');
  const [prepayMode, setPrepayMode] = useState<PrepaymentMode>(
    PrepaymentMode.ReducePayment,
  );
  const [prepayError, setPrepayError] = useState('');

  if (!hasSchedule) return null;

  const handleRateChange = (e: React.FormEvent) => {
    e.preventDefault();
    setRateError('');

    const rateNum = Number(newRate);
    const rateCheck = Validator.annualInterestRate(rateNum);
    if (!rateCheck.valid) { setRateError(rateCheck.message); return; }

    const dateCheck = Validator.date(rateDate);
    if (!dateCheck.valid) { setRateError(dateCheck.message); return; }

    applyChange({
      type: ChangeType.RateChange,
      date: new Date(rateDate),
      loanMethod: currentMethod!,
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
    if (!amountCheck.valid) { setPrepayError(amountCheck.message); return; }

    const dateCheck = Validator.date(prepayDate);
    if (!dateCheck.valid) { setPrepayError(dateCheck.message); return; }

    applyChange({
      type: ChangeType.Prepayment,
      date: new Date(prepayDate),
      loanMethod: currentMethod!,
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
            <TabsTrigger value="rate" className="flex-1">利率变更</TabsTrigger>
            <TabsTrigger value="prepay" className="flex-1">提前还款</TabsTrigger>
          </TabsList>

          <TabsContent value="rate">
            <form onSubmit={handleRateChange} className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label htmlFor="new-rate">新的年利率 (%)</Label>
                <Input id="new-rate" type="number" step="0.01" inputMode="decimal" value={newRate} onChange={(e) => setNewRate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rate-date">生效日期</Label>
                <Input id="rate-date" type="date" value={rateDate} onChange={(e) => setRateDate(e.target.value)} />
              </div>
              {rateError && <p className="text-sm text-red-500">{rateError}</p>}
              <Button type="submit" className="w-full">更新利率</Button>
            </form>
          </TabsContent>

          <TabsContent value="prepay">
            <form onSubmit={handlePrepay} className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label htmlFor="prepay-amount">还款金额 (元)</Label>
                <Input id="prepay-amount" type="number" inputMode="decimal" value={prepayAmount} onChange={(e) => setPrepayAmount(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prepay-date">还款日期</Label>
                <Input id="prepay-date" type="date" value={prepayDate} onChange={(e) => setPrepayDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prepay-mode">变更方式</Label>
                <Select value={prepayMode} onValueChange={(v) => setPrepayMode(v as PrepaymentMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PrepaymentMode.ReducePayment}>减少月供（期限不变）</SelectItem>
                    <SelectItem value={PrepaymentMode.ShortenTerm}>缩短年限（月供不变）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {prepayError && <p className="text-sm text-red-500">{prepayError}</p>}
              <Button type="submit" className="w-full">提前还款</Button>
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
