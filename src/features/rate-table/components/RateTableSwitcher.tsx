import { Pencil, Save, SaveAll, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLoanStore } from '@/stores/useLoanStore';

interface RateTableSwitcherProps {
  source: 'custom' | 'lpr' | 'gjj';
  basisPoints?: number;
  gjjAbove5Y?: boolean;
}

export function RateTableSwitcher({
  source,
  basisPoints,
  gjjAbove5Y,
}: RateTableSwitcherProps) {
  const {
    activeRateTableId,
    savedRateTables,
    rateTable,
    autoSave,
    rateTableDirty,
    saveRateTable,
    loadRateTable,
    deleteRateTable,
    renameRateTable,
    updateRateTable,
  } = useLoanStore();
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');

  const activeTable = savedRateTables.find((t) => t.id === activeRateTableId);
  const hasUnsavedChanges = rateTable.length > 0 && !activeTable;
  const isDirty = !autoSave && rateTableDirty;

  const handleSave = () => {
    if (activeTable) {
      saveRateTable(activeTable.name, source, basisPoints, gjjAbove5Y);
    } else {
      const name = `利率表 ${savedRateTables.length + 1}`;
      saveRateTable(name, source, basisPoints, gjjAbove5Y);
    }
  };

  const handleSaveAs = () => {
    const baseName = activeTable?.name ?? '利率表';
    const name = `${baseName} (副本)`;
    useLoanStore.setState({ activeRateTableId: null });
    saveRateTable(name, source, basisPoints, gjjAbove5Y);
  };

  const handleNew = () => {
    updateRateTable([]);
    useLoanStore.setState({ activeRateTableId: null });
  };

  const handleSelect = (value: string) => {
    if (isDirty) {
      if (!window.confirm('当前利率表有未保存的修改，是否放弃？')) return;
    }
    if (value === '__new__') {
      handleNew();
    } else {
      loadRateTable(value);
    }
  };

  const handleStartRename = () => {
    if (!activeTable) return;
    setRenameDraft(activeTable.name);
    setRenaming(true);
  };

  const handleFinishRename = () => {
    const newName = renameDraft.trim();
    if (!activeTable || !newName || newName === activeTable.name) {
      setRenaming(false);
      return;
    }
    const conflict = savedRateTables.find(
      (t) => t.id !== activeTable.id && t.name === newName,
    );
    if (conflict) {
      setRenaming(false);
      if (window.confirm(`已存在同名利率表「${newName}」，是否覆盖？`)) {
        deleteRateTable(conflict.id);
        renameRateTable(activeTable.id, newName);
      }
      return;
    }
    renameRateTable(activeTable.id, newName);
    setRenaming(false);
  };

  const handleDelete = () => {
    if (!activeTable) return;
    if (window.confirm(`确认删除利率表「${activeTable.name}」？`)) {
      deleteRateTable(activeTable.id);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
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
          value={activeRateTableId ?? '__unsaved__'}
          onChange={(e) => handleSelect(e.target.value)}
          className="text-sm border border-border rounded-md px-2 py-1.5 bg-card text-foreground max-w-[200px] truncate"
        >
          {hasUnsavedChanges && (
            <option value="__unsaved__">● 未保存的利率表</option>
          )}
          {!hasUnsavedChanges && !activeTable && (
            <option value="__unsaved__">选择利率表</option>
          )}
          {savedRateTables.map((t) => (
            <option key={t.id} value={t.id}>
              {t.id === activeRateTableId && isDirty ? `● ${t.name}` : t.name}
            </option>
          ))}
          <option value="__new__">＋ 新建利率表</option>
        </select>
      )}

      {activeTable && !renaming && (
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
            title="删除利率表"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </Button>
        </>
      )}

      {rateTable.length > 0 && (
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

      {rateTable.length > 0 && activeTable && (
        <Button variant="outline" size="sm" onClick={handleSaveAs}>
          <SaveAll className="w-3.5 h-3.5 mr-1" />
          另存为
        </Button>
      )}
    </div>
  );
}
