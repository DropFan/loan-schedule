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
import { DEFAULT_REPAYMENT_DAY } from '@/constants/app.constants';
import {
  annualToMonthlyRate,
  calcFreeRepaymentMinPayment,
} from '@/core/calculator/LoanCalculator';
import {
  LoanMethod,
  LoanMethodName,
  LoanType,
  LoanTypeName,
} from '@/core/types/loan.types';
import { Validator } from '@/core/utils/validator';
import { useLoanStore } from '@/stores/useLoanStore';

export function LoanForm() {
  const { params, initialize } = useLoanStore();
  const hasSchedule = useLoanStore((s) => s.schedule.length > 0);

  const [loanType, setLoanType] = useState<LoanType>(
    params?.loanType ?? LoanType.Commercial,
  );
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
  const [repaymentDay, setRepaymentDay] = useState(
    params?.repaymentDay?.toString() ?? String(DEFAULT_REPAYMENT_DAY),
  );
  const [monthlyPayment, setMonthlyPayment] = useState(
    params?.monthlyPaymentAmount?.toString() ?? '',
  );
  const [error, setError] = useState('');

  const suggestedMin = useMemo(() => {
    const a = Number(amount);
    const t = Number(termYears);
    const r = Number(rate);
    if (a > 0 && t > 0 && r > 0) {
      return calcFreeRepaymentMinPayment(a, t * 12, annualToMonthlyRate(r));
    }
    return 0;
  }, [amount, termYears, rate]);

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

    const repaymentDayNum = Number(repaymentDay);
    const repaymentDayCheck = Validator.repaymentDay(repaymentDayNum);
    if (!repaymentDayCheck.valid) {
      setError(repaymentDayCheck.message);
      return;
    }

    let monthlyPaymentAmount: number | undefined;
    if (method === LoanMethod.FreeRepayment) {
      const mpNum = Number(monthlyPayment);
      if (!mpNum || mpNum <= 0) {
        setError('请输入每月还款额');
        return;
      }
      monthlyPaymentAmount = mpNum;
    }

    initialize({
      loanType,
      loanAmount: amountNum,
      loanTermMonths: termNum * 12,
      annualInterestRate: rateNum,
      loanMethod: method,
      startDate: new Date(startDate),
      repaymentDay: repaymentDayNum,
      monthlyPaymentAmount,
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
            <Label htmlFor="loan-type">贷款类型</Label>
            <Select
              value={loanType}
              onValueChange={(v) => setLoanType(v as LoanType)}
            >
              <SelectTrigger>{LoanTypeName[loanType]}</SelectTrigger>
              <SelectContent>
                <SelectItem value={LoanType.Commercial}>商业贷款</SelectItem>
                <SelectItem value={LoanType.ProvidentFund}>
                  公积金贷款
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

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
                <SelectItem value={LoanMethod.FreeRepayment}>
                  自由还款
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {method === LoanMethod.FreeRepayment && (
            <div className="space-y-2">
              <Label htmlFor="monthly-payment">每月还款额 (元)</Label>
              <Input
                id="monthly-payment"
                type="number"
                inputMode="decimal"
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(e.target.value)}
                placeholder={
                  suggestedMin > 0
                    ? `建议不低于 ${suggestedMin.toFixed(2)}`
                    : '请先填写贷款金额、期限和利率'
                }
              />
              {suggestedMin > 0 && (
                <p className="text-xs text-muted-foreground">
                  建议最低还款额：{suggestedMin.toFixed(2)} 元（等额本息月供的
                  85%）
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="start-date">贷款开始日期</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="repayment-day">每月还款日</Label>
            <Input
              id="repayment-day"
              type="number"
              inputMode="numeric"
              min={1}
              max={28}
              value={repaymentDay}
              onChange={(e) => setRepaymentDay(e.target.value)}
              placeholder="1-28，默认 15"
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
