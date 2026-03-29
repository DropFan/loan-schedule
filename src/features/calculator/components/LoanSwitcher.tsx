import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useLoanStore } from '@/stores/useLoanStore';

export function LoanSwitcher() {
  const {
    activeLoanId,
    savedLoans,
    params,
    saveLoan,
    loadLoan,
    deleteLoan,
    renameLoan,
    clear,
  } = useLoanStore();
  const [saveName, setSaveName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [open, setOpen] = useState(false);

  const activeLoan = savedLoans.find((l) => l.id === activeLoanId);

  const handleSave = () => {
    const name = saveName.trim() || `方案 ${savedLoans.length + 1}`;
    saveLoan(name);
    setSaveName('');
  };

  const handleNew = () => {
    clear();
    setOpen(false);
  };

  const handleLoad = (id: string) => {
    loadLoan(id);
    setOpen(false);
  };

  const handleStartRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const handleFinishRename = () => {
    if (editingId && editName.trim()) {
      renameLoan(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确认删除此方案？')) {
      deleteLoan(id);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate">
          {activeLoan ? activeLoan.name : '未保存的方案'}
        </span>
      </div>

      {params && (
        <Button variant="outline" size="sm" onClick={handleSave}>
          <Save className="w-3.5 h-3.5 mr-1" />
          {activeLoan ? '保存' : '另存为'}
        </Button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="outline" size="sm" />}>
          方案列表
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>贷款方案</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* 保存当前 */}
            {params && !activeLoan && (
              <div className="flex gap-2">
                <Input
                  placeholder="方案名称"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
                <Button size="sm" onClick={handleSave}>
                  <Save className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {/* 新建方案 */}
            <Button variant="outline" className="w-full" onClick={handleNew}>
              <Plus className="w-4 h-4 mr-1" /> 新建方案
            </Button>

            {/* 方案列表 */}
            {savedLoans.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                暂无保存的方案
              </p>
            ) : (
              <div className="space-y-2">
                {savedLoans.map((loan) => (
                  <div
                    key={loan.id}
                    className={`flex items-center gap-2 p-2 rounded-md border ${
                      loan.id === activeLoanId
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                  >
                    {editingId === loan.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={handleFinishRename}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && handleFinishRename()
                        }
                        className="h-7 text-sm"
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        className="flex-1 text-left text-sm truncate hover:text-primary"
                        onClick={() => handleLoad(loan.id)}
                      >
                        {loan.name}
                      </button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartRename(loan.id, loan.name)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(loan.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
