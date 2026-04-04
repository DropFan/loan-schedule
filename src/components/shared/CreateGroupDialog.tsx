import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLoanStore } from '@/stores/useLoanStore';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
}: CreateGroupDialogProps) {
  const { savedLoans, createGroup } = useLoanStore();
  const [name, setName] = useState('');
  const [loanIdA, setLoanIdA] = useState('');
  const [loanIdB, setLoanIdB] = useState('');

  // 只显示已初始化（有 schedule）的方案
  const availableLoans = savedLoans.filter((l) => l.schedule.length > 0);

  const canCreate =
    loanIdA && loanIdB && loanIdA !== loanIdB && availableLoans.length >= 2;

  const handleCreate = () => {
    if (!canCreate) return;
    const groupName =
      name.trim() ||
      `${availableLoans.find((l) => l.id === loanIdA)?.name} + ${availableLoans.find((l) => l.id === loanIdB)?.name}`;
    createGroup(groupName, [loanIdA, loanIdB]);
    // 重置状态并关闭
    setName('');
    setLoanIdA('');
    setLoanIdB('');
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setName('');
      setLoanIdA('');
      setLoanIdB('');
    }
    onOpenChange(nextOpen);
  };

  if (availableLoans.length < 2) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建组合方案</DialogTitle>
            <DialogDescription>
              请先保存至少两个方案后再创建组合。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              关闭
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建组合方案</DialogTitle>
          <DialogDescription>
            选择两个已保存方案组合为一个，支持合计展示和子方案切换。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>方案 A</Label>
            <select
              value={loanIdA}
              onChange={(e) => setLoanIdA(e.target.value)}
              className="w-full text-sm border border-border rounded-md px-2 py-1.5 bg-card text-foreground"
            >
              <option value="">请选择</option>
              {availableLoans.map((loan) => (
                <option
                  key={loan.id}
                  value={loan.id}
                  disabled={loan.id === loanIdB}
                >
                  {loan.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>方案 B</Label>
            <select
              value={loanIdB}
              onChange={(e) => setLoanIdB(e.target.value)}
              className="w-full text-sm border border-border rounded-md px-2 py-1.5 bg-card text-foreground"
            >
              <option value="">请选择</option>
              {availableLoans.map((loan) => (
                <option
                  key={loan.id}
                  value={loan.id}
                  disabled={loan.id === loanIdA}
                >
                  {loan.name}
                </option>
              ))}
            </select>
          </div>

          {loanIdA && loanIdB && loanIdA === loanIdB && (
            <p className="text-xs text-destructive">不能选择相同的方案</p>
          )}

          <div className="space-y-1.5">
            <Label>组合名称（可选）</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="留空则自动生成"
              className="h-8 text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>取消</DialogClose>
          <Button onClick={handleCreate} disabled={!canCreate}>
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
