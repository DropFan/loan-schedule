import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Validator } from '@/core/utils/validator';
import type { RateEntry } from '@/stores/useLoanStore';

interface Props {
  entry?: RateEntry;
  onSave: (entry: RateEntry) => void;
  trigger: React.ReactNode;
}

export function RateEntryDialog({ entry, onSave, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(entry?.date ?? '');
  const [rate, setRate] = useState(entry?.annualRate?.toString() ?? '');
  const [error, setError] = useState('');

  const handleSave = () => {
    setError('');

    const dateCheck = Validator.date(date);
    if (!dateCheck.valid) { setError(dateCheck.message); return; }

    const rateNum = Number(rate);
    const rateCheck = Validator.annualInterestRate(rateNum);
    if (!rateCheck.valid) { setError(rateCheck.message); return; }

    onSave({ date, annualRate: rateNum, source: 'custom' });
    setOpen(false);
    setDate('');
    setRate('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry ? '编辑利率' : '添加利率'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>生效日期</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>年利率 (%)</Label>
            <Input type="number" step="0.01" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button onClick={handleSave} className="w-full">保存</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
