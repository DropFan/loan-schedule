import { Pencil, Plus, Save, SaveAll, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const activeLoan = savedLoans.find((l) => l.id === activeLoanId);

  useEffect(() => {
    setTitleDraft(activeLoan?.name ?? '');
  }, [activeLoan?.name]);

  // 保存当前方案（已有则覆盖，没有则新建）
  const handleSave = () => {
    if (activeLoan) {
      saveLoan(activeLoan.name);
    } else {
      const name = saveName.trim() || `方案 ${savedLoans.length + 1}`;
      saveLoan(name);
      setSaveName('');
    }
  };

  // 另存为新方案
  const handleSaveAs = () => {
    const baseName = activeLoan?.name ?? '方案';
    const name = `${baseName} (副本)`;
    useLoanStore.setState({ activeLoanId: null });
    saveLoan(name);
  };

  // 新建空白方案
  const handleNew = () => {
    clear();
    useLoanStore.setState({ activeLoanId: null });
    setOpen(false);
  };

  const handleLoad = (id: string) => {
    loadLoan(id);
    setOpen(false);
  };

  // 列表中重命名
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

  // 顶部方案名编辑 — 只在按 Enter 时保存，Esc 取消
  const handleTitleEdit = () => {
    if (!activeLoan) return;
    setEditingTitle(true);
    setTitleDraft(activeLoan.name);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (activeLoan && titleDraft.trim()) {
        renameLoan(activeLoan.id, titleDraft.trim());
      }
      setEditingTitle(false);
    } else if (e.key === 'Escape') {
      setTitleDraft(activeLoan?.name ?? '');
      setEditingTitle(false);
    }
  };

  const handleTitleBlur = () => {
    // blur 时保存修改（如果有变化）
    if (
      activeLoan &&
      titleDraft.trim() &&
      titleDraft.trim() !== activeLoan.name
    ) {
      renameLoan(activeLoan.id, titleDraft.trim());
    }
    setEditingTitle(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确认删除此方案？')) {
      deleteLoan(id);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 方案名（可编辑） */}
      <div className="flex items-center gap-1 min-w-0">
        {editingTitle && activeLoan ? (
          <Input
            ref={titleInputRef}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="h-7 text-sm w-40"
            autoFocus
          />
        ) : (
          <>
            <span
              className={`text-sm font-medium truncate ${activeLoan ? 'cursor-pointer hover:text-primary' : ''}`}
              onClick={activeLoan ? handleTitleEdit : undefined}
              title={activeLoan ? '点击编辑方案名' : undefined}
            >
              {activeLoan ? activeLoan.name : '未保存的方案'}
            </span>
            {activeLoan && (
              <Pencil
                className="w-3 h-3 text-muted-foreground shrink-0 cursor-pointer hover:text-primary"
                onClick={handleTitleEdit}
              />
            )}
          </>
        )}
      </div>

      {/* 保存按钮：始终可用（有数据时） */}
      {params && (
        <Button variant="outline" size="sm" onClick={handleSave}>
          <Save className="w-3.5 h-3.5 mr-1" />
          保存
        </Button>
      )}

      {/* 另存为按钮：已有方案时可用 */}
      {params && activeLoan && (
        <Button variant="outline" size="sm" onClick={handleSaveAs}>
          <SaveAll className="w-3.5 h-3.5 mr-1" />
          另存为
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
            <Button variant="outline" className="w-full" onClick={handleNew}>
              <Plus className="w-4 h-4 mr-1" /> 新建空白方案
            </Button>

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
                        {loan.id === activeLoanId && (
                          <span className="text-xs text-muted-foreground ml-1">
                            (当前)
                          </span>
                        )}
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
