import { Pencil, Save, SaveAll, Trash2, Unlink } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLoanStore } from '@/stores/useLoanStore';
import { CreateGroupDialog } from './CreateGroupDialog';

export function LoanSwitcher() {
  const {
    activeLoanId,
    activeGroupId,
    savedLoans,
    savedGroups,
    params,
    autoSave,
    loanDirty,
    saveLoan,
    loadLoan,
    deleteLoan,
    renameLoan,
    loadGroup,
    deleteGroup,
    renameGroup,
    clear,
  } = useLoanStore();
  const [saveName, setSaveName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);

  const activeLoan = savedLoans.find((l) => l.id === activeLoanId);
  const activeGroup = savedGroups.find((g) => g.id === activeGroupId);
  const hasUnsavedChanges = params && !activeLoan;
  const isDirty = !autoSave && loanDirty;

  // 计算当前 select 的 value
  const selectValue = activeGroupId
    ? `group:${activeGroupId}`
    : (activeLoanId ?? '__unsaved__');

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
    useLoanStore.setState({ activeLoanId: null, activeGroupId: null });
    saveLoan(name);
  };

  const handleNew = () => {
    clear();
    useLoanStore.setState({ activeLoanId: null, activeGroupId: null });
  };

  const handleSelect = (value: string) => {
    if (isDirty) {
      if (!window.confirm('当前方案有未保存的修改，是否放弃？')) return;
    }
    if (value === '__new__') {
      handleNew();
    } else if (value === '__create_group__') {
      setGroupDialogOpen(true);
    } else if (value.startsWith('group:')) {
      const groupId = value.slice(6);
      loadGroup(groupId);
    } else {
      loadLoan(value);
    }
  };

  const handleStartRename = () => {
    if (activeGroup) {
      setRenameDraft(activeGroup.name);
      setRenaming(true);
    } else if (activeLoan) {
      setRenameDraft(activeLoan.name);
      setRenaming(true);
    }
  };

  const handleFinishRename = () => {
    const newName = renameDraft.trim();
    if (!newName) {
      setRenaming(false);
      return;
    }

    if (activeGroup) {
      if (newName !== activeGroup.name) {
        renameGroup(activeGroup.id, newName);
      }
      setRenaming(false);
      return;
    }

    if (!activeLoan || newName === activeLoan.name) {
      setRenaming(false);
      return;
    }
    const conflict = savedLoans.find(
      (l) => l.id !== activeLoan.id && l.name === newName,
    );
    if (conflict) {
      setRenaming(false);
      if (window.confirm(`已存在同名方案「${newName}」，是否覆盖？`)) {
        deleteLoan(conflict.id);
        renameLoan(activeLoan.id, newName);
      }
      return;
    }
    renameLoan(activeLoan.id, newName);
    setRenaming(false);
  };

  const handleDelete = () => {
    if (activeGroup) {
      if (
        window.confirm(`确认取消组合「${activeGroup.name}」？子方案将保留。`)
      ) {
        deleteGroup(activeGroup.id);
      }
    } else if (activeLoan) {
      // 检查是否被组合引用
      const referencingGroups = savedGroups.filter((g) =>
        g.loanIds.includes(activeLoan.id),
      );
      const extra =
        referencingGroups.length > 0
          ? `\n该方案被组合「${referencingGroups.map((g) => g.name).join('、')}」引用，删除后组合将自动解散。`
          : '';
      if (window.confirm(`确认删除方案「${activeLoan.name}」？${extra}`)) {
        deleteLoan(activeLoan.id);
      }
    }
  };

  const hasActiveItem = !!(activeGroup || activeLoan);

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
          value={selectValue}
          onChange={(e) => handleSelect(e.target.value)}
          className="text-sm border border-border rounded-md px-2 py-1.5 bg-card text-foreground max-w-[200px] truncate"
        >
          {hasUnsavedChanges && !activeGroupId && (
            <option value="__unsaved__">● 未保存的方案</option>
          )}
          {!hasUnsavedChanges && !activeLoan && !activeGroupId && (
            <option value="__unsaved__">选择方案</option>
          )}

          {/* 独立方案 */}
          {savedLoans.length > 0 && (
            <optgroup label="独立方案">
              {savedLoans.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {loan.id === activeLoanId && !activeGroupId && isDirty
                    ? `● ${loan.name}`
                    : loan.name}
                </option>
              ))}
            </optgroup>
          )}

          {/* 组合方案 */}
          {savedGroups.length > 0 && (
            <optgroup label="组合方案">
              {savedGroups.map((group) => (
                <option key={group.id} value={`group:${group.id}`}>
                  [组合] {group.name}
                </option>
              ))}
            </optgroup>
          )}

          <option value="__new__">＋ 新建方案</option>
          <option value="__create_group__">⊕ 创建组合</option>
        </select>
      )}

      {/* 重命名 + 删除 */}
      {hasActiveItem && !renaming && (
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
            title={activeGroup ? '取消组合' : '删除方案'}
          >
            {activeGroup ? (
              <Unlink className="w-3.5 h-3.5 text-orange-500" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            )}
          </Button>
        </>
      )}

      {/* 保存（仅单方案模式） */}
      {params && !activeGroupId && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={!hasUnsavedChanges && !isDirty}
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          保存
        </Button>
      )}

      {/* 另存为（仅单方案模式） */}
      {params && activeLoan && !activeGroupId && (
        <Button variant="outline" size="sm" onClick={handleSaveAs}>
          <SaveAll className="w-3.5 h-3.5 mr-1" />
          另存为
        </Button>
      )}

      {/* 创建组合对话框 */}
      <CreateGroupDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
      />
    </div>
  );
}
