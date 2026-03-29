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

const themeOptions: Array<{ value: Theme; label: string }> = [
  { value: 'light', label: '亮色' },
  { value: 'dark', label: '暗色' },
  { value: 'system', label: '跟随系统' },
];

export function SettingsPage() {
  const clear = useLoanStore((s) => s.clear);
  const { theme, setTheme } = useTheme();

  const handleClearData = () => {
    if (window.confirm('确认清除所有数据？此操作不可撤销。')) {
      clear();
      localStorage.removeItem('loan-app-state');
    }
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
          <CardTitle>数据管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            所有数据存储在浏览器本地，清除后无法恢复。
          </p>
          <Button variant="destructive" onClick={handleClearData}>
            清除所有数据
          </Button>
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
