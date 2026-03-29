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
import { LoanMethod, LoanMethodName } from '@/core/types/loan.types';
import { Validator } from '@/core/utils/validator';
import { useLoanStore } from '@/stores/useLoanStore';

export function LoanForm() {
  const { params, initialize } = useLoanStore();
  const hasSchedule = useLoanStore((s) => s.schedule.length > 0);

  const [amount, setAmount] = useState(params?.loanAmount?.toString() ?? '');
  const [termYears, setTermYears] = useState(
    params ? String(params.loanTermMonths / 12) : '',
  );
  const [rate, setRate] = useState(
    params?.annualInterestRate?.toString() ?? '',
  );
  const [method, setMethod] = useState<LoanMethod>(
    params?.loanMethod ?? LoanMethod.EqualPrincipalInterest,
  );
  const [startDate, setStartDate] = useState(
    params?.startDate
      ? new Date(params.startDate).toISOString().split('T')[0]
      : '',
  );
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amountNum = Number(amount);
    const termNum = Number(termYears);
    const rateNum = Number(rate);

    const amountCheck = Validator.loanAmount(amountNum);
    if (!amountCheck.valid) {
      setError(amountCheck.message);
      return;
    }

    const termCheck = Validator.loanTermYears(termNum);
    if (!termCheck.valid) {
      setError(termCheck.message);
      return;
    }

    const rateCheck = Validator.annualInterestRate(rateNum);
    if (!rateCheck.valid) {
      setError(rateCheck.message);
      return;
    }

    const dateCheck = Validator.date(startDate);
    if (!dateCheck.valid) {
      setError(dateCheck.message);
      return;
    }

    initialize({
      loanAmount: amountNum,
      loanTermMonths: termNum * 12,
      annualInterestRate: rateNum,
      loanMethod: method,
      startDate: new Date(startDate),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>贷款参数</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="loan-amount">贷款金额 (元)</Label>
            <Input
              id="loan-amount"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="例如 1000000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loan-term">贷款期限 (年)</Label>
            <Input
              id="loan-term"
              type="number"
              value={termYears}
              onChange={(e) => setTermYears(e.target.value)}
              placeholder="例如 30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interest-rate">年利率 (%)</Label>
            <Input
              id="interest-rate"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="例如 3.5"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loan-method">还贷方式</Label>
            <Select
              value={method}
              onValueChange={(v) => setMethod(v as LoanMethod)}
            >
              <SelectTrigger>{LoanMethodName[method]}</SelectTrigger>
              <SelectContent>
                <SelectItem value={LoanMethod.EqualPrincipalInterest}>
                  等额本息
                </SelectItem>
                <SelectItem value={LoanMethod.EqualPrincipal}>
                  等额本金
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-date">贷款开始日期</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full">
            {hasSchedule ? '重新计算' : '计算还款计划'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
