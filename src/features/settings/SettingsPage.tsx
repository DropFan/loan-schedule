import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  APP_AUTHOR,
  APP_LINK,
  APP_RELEASE,
  APP_VERSION,
} from '@/constants/app.constants';
import { type Theme, useTheme } from '@/hooks/useTheme';
import { useLoanStore } from '@/stores/useLoanStore';
import { exportData, importData } from './data-transfer';

const themeOptions: Array<{ value: Theme; label: string }> = [
  { value: 'light', label: '亮色' },
  { value: 'dark', label: '暗色' },
  { value: 'system', label: '跟随系统' },
];

export function SettingsPage() {
  const clear = useLoanStore((s) => s.clear);
  const autoSave = useLoanStore((s) => s.autoSave);
  const setAutoSave = useLoanStore((s) => s.setAutoSave);
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState('');

  const handleClearData = () => {
    if (window.confirm('确认清除所有数据？此操作不可撤销。')) {
      clear();
      localStorage.removeItem('loan-app-state');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult('');
    try {
      const result = await importData(file);
      setImportResult(result);
    } catch (err) {
      setImportResult(err instanceof Error ? err.message : '导入失败');
    }
    // 清空 input 以便重复选择同一文件
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-4 lg:p-6 max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>外观</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={`flex-1 px-3 py-2 rounded-md text-sm border transition-colors ${
                  theme === opt.value
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:bg-muted/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>通用</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">自动保存</p>
              <p className="text-xs text-muted-foreground">
                开启后，每次操作自动保存当前方案和利率表
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoSave}
              onClick={() => setAutoSave(!autoSave)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                autoSave ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                  autoSave ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>数据管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              导出数据到 JSON
              文件，可在其他设备导入恢复。包含贷款方案（参数+变更记录）和利率表，导入时自动重放计算。
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportData}>
                导出数据
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                导入数据
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </div>
            {importResult && (
              <p className="text-sm text-muted-foreground">{importResult}</p>
            )}
          </div>
          <div className="border-t pt-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              清除所有本地数据，此操作不可撤销。
            </p>
            <Button variant="destructive" onClick={handleClearData}>
              清除所有数据
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>关于</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>贷款计算器 & 还贷模拟器</p>
          <p className="text-muted-foreground">
            版本 v{APP_VERSION} (Release {APP_RELEASE})
          </p>
          <p className="text-muted-foreground">作者：{APP_AUTHOR}</p>
          <p>
            <a
              href={APP_LINK}
              className="text-primary hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {APP_LINK}
            </a>
          </p>
          <p>
            <a
              href="https://github.com/DropFan/loan-schedule"
              className="text-primary hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              GitHub 源码
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
