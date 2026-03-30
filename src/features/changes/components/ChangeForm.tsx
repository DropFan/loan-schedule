import { useMemo, useState } from 'react';
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
  annualToMonthlyRate,
  calcFreeRepaymentMinPayment,
  findRemainingInfo,
} from '@/core/calculator/LoanCalculator';
import {
  ChangeType,
  LoanMethod,
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

  // 调整月供（自由还款）
  const [newPayment, setNewPayment] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentError, setPaymentError] = useState('');

  // 变更还款日
  const [newRepayDay, setNewRepayDay] = useState('');
  const [repayDayDate, setRepayDayDate] = useState('');
  const [repayDayError, setRepayDayError] = useState('');

  // 按提前还款日期从计划表中查出实际剩余本金（未填日期则用今天）
  const prepayRemainingLoan = useMemo(() => {
    if (schedule.length === 0) return remainingLoan;
    const date = prepayDate ? new Date(prepayDate) : new Date();
    return findRemainingInfo(schedule, date)?.remainingLoan ?? remainingLoan;
  }, [schedule, prepayDate, remainingLoan]);

  const isFreeRepayment = currentMethod === LoanMethod.FreeRepayment;
  const currentMinPayment =
    isFreeRepayment && remainingLoan > 0
      ? calcFreeRepaymentMinPayment(
          remainingLoan,
          changes[changes.length - 1]?.remainingTerm ?? 0,
          annualToMonthlyRate(
            changes[changes.length - 1]?.annualInterestRate ?? 0,
          ),
        )
      : 0;

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

  const handlePaymentChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');

    const paymentNum = Number(newPayment);
    if (!paymentNum || paymentNum <= 0) {
      setPaymentError('请输入有效的月供金额');
      return;
    }

    const dateCheck = Validator.date(paymentDate);
    if (!dateCheck.valid) {
      setPaymentError(dateCheck.message);
      return;
    }

    applyChange({
      type: ChangeType.PaymentChange,
      date: new Date(paymentDate),
      loanMethod: currentMethod,
      newMonthlyPayment: paymentNum,
    });

    setNewPayment('');
    setPaymentDate('');
  };

  const handleRepayDayChange = (e: React.FormEvent) => {
    e.preventDefault();
    setRepayDayError('');

    const dayNum = Number(newRepayDay);
    const dayCheck = Validator.repaymentDay(dayNum);
    if (!dayCheck.valid) {
      setRepayDayError(dayCheck.message);
      return;
    }

    if (dayNum === params?.repaymentDay) {
      setRepayDayError('新还款日与当前还款日相同');
      return;
    }

    const dateCheck = Validator.date(repayDayDate);
    if (!dateCheck.valid) {
      setRepayDayError(dateCheck.message);
      return;
    }

    applyChange({
      type: ChangeType.RepaymentDayChange,
      date: new Date(repayDayDate),
      loanMethod: currentMethod,
      newRepaymentDay: dayNum,
    });

    setNewRepayDay('');
    setRepayDayDate('');
  };

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
    const amountCheck = Validator.prepayAmount(amountNum, prepayRemainingLoan);
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
            {isFreeRepayment ? (
              <TabsTrigger value="payment" className="flex-1">
                调整月供
              </TabsTrigger>
            ) : (
              <TabsTrigger value="prepay" className="flex-1">
                提前还款
              </TabsTrigger>
            )}
            <TabsTrigger value="repayDay" className="flex-1">
              变更还款日
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

          {!isFreeRepayment && (
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
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      setPrepayAmount(String(prepayRemainingLoan));
                      if (!prepayDate) {
                        setPrepayDate(new Date().toISOString().split('T')[0]);
                      }
                    }}
                  >
                    全部还清（剩余本金 {prepayRemainingLoan.toFixed(2)} 元）
                  </button>
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
          )}

          {isFreeRepayment && (
            <TabsContent value="payment">
              <form onSubmit={handlePaymentChange} className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="new-payment">新月供金额 (元)</Label>
                  <Input
                    id="new-payment"
                    type="number"
                    inputMode="decimal"
                    value={newPayment}
                    onChange={(e) => setNewPayment(e.target.value)}
                    placeholder={
                      currentMinPayment > 0
                        ? `不低于 ${currentMinPayment.toFixed(2)}`
                        : ''
                    }
                  />
                  {currentMinPayment > 0 && (
                    <p className="text-xs text-muted-foreground">
                      当前最低还款额：{currentMinPayment.toFixed(2)} 元
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="payment-date">生效日期</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
                {paymentError && (
                  <p className="text-sm text-red-500">{paymentError}</p>
                )}
                <Button type="submit" className="w-full">
                  调整月供
                </Button>
              </form>
            </TabsContent>
          )}
          <TabsContent value="repayDay">
            <form onSubmit={handleRepayDayChange} className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label htmlFor="new-repay-day">新还款日（1-28 日）</Label>
                <Input
                  id="new-repay-day"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={28}
                  value={newRepayDay}
                  onChange={(e) => setNewRepayDay(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  当前还款日：每月 {params?.repaymentDay} 日
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="repay-day-date">生效日期</Label>
                <Input
                  id="repay-day-date"
                  type="date"
                  value={repayDayDate}
                  onChange={(e) => setRepayDayDate(e.target.value)}
                />
              </div>
              {repayDayError && (
                <p className="text-sm text-red-500">{repayDayError}</p>
              )}
              <Button type="submit" className="w-full">
                变更还款日
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
