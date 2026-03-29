import { Pencil, Save, SaveAll, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');

  const activeLoan = savedLoans.find((l) => l.id === activeLoanId);
  const hasUnsavedChanges = params && !activeLoan;

  const handleSave = () => {
    if (activeLoan) {
      saveLoan(activeLoan.name);
    } else {
      const name = saveName.trim() || `方案 ${savedLoans.length + 1}`;
      saveLoan(name);
      setSaveName('');
    }
  };

  const handleSaveAs = () => {
    const baseName = activeLoan?.name ?? '方案';
    const name = `${baseName} (副本)`;
    useLoanStore.setState({ activeLoanId: null });
    saveLoan(name);
  };

  const handleNew = () => {
    clear();
    useLoanStore.setState({ activeLoanId: null });
  };

  const handleSelect = (value: string) => {
    if (value === '__new__') {
      handleNew();
    } else {
      loadLoan(value);
    }
  };

  const handleStartRename = () => {
    if (!activeLoan) return;
    setRenameDraft(activeLoan.name);
    setRenaming(true);
  };

  const handleFinishRename = () => {
    if (
      activeLoan &&
      renameDraft.trim() &&
      renameDraft.trim() !== activeLoan.name
    ) {
      renameLoan(activeLoan.id, renameDraft.trim());
    }
    setRenaming(false);
  };

  const handleDelete = () => {
    if (!activeLoan) return;
    if (window.confirm(`确认删除方案「${activeLoan.name}」？`)) {
      deleteLoan(activeLoan.id);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 方案下拉选择 / 重命名输入框 */}
      {renaming ? (
        <Input
          value={renameDraft}
          onChange={(e) => setRenameDraft(e.target.value)}
          onBlur={handleFinishRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleFinishRename();
            if (e.key === 'Escape') setRenaming(false);
          }}
          className="h-8 text-sm w-44"
          autoFocus
        />
      ) : (
        <select
          value={activeLoanId ?? '__unsaved__'}
          onChange={(e) => handleSelect(e.target.value)}
          className="text-sm border border-border rounded-md px-2 py-1.5 bg-card text-foreground max-w-[200px] truncate"
        >
          {hasUnsavedChanges && (
            <option value="__unsaved__">● 未保存的方案</option>
          )}
          {!hasUnsavedChanges && !activeLoan && (
            <option value="__unsaved__">选择方案</option>
          )}
          {savedLoans.map((loan) => (
            <option key={loan.id} value={loan.id}>
              {loan.name}
            </option>
          ))}
          <option value="__new__">＋ 新建方案</option>
        </select>
      )}

      {/* 重命名 + 删除（有活跃方案时） */}
      {activeLoan && !renaming && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartRename}
            title="重命名"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            title="删除方案"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </Button>
        </>
      )}

      {/* 保存 */}
      {params && (
        <Button variant="outline" size="sm" onClick={handleSave}>
          <Save className="w-3.5 h-3.5 mr-1" />
          保存
        </Button>
      )}

      {/* 另存为 */}
      {params && activeLoan && (
        <Button variant="outline" size="sm" onClick={handleSaveAs}>
          <SaveAll className="w-3.5 h-3.5 mr-1" />
          另存为
        </Button>
      )}
    </div>
  );
}
