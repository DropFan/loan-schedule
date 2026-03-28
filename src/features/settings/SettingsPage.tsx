import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_AUTHOR, APP_LINK, APP_RELEASE, APP_VERSION } from '@/constants/app.constants';
import { useLoanStore } from '@/stores/useLoanStore';

export function SettingsPage() {
  const clear = useLoanStore((s) => s.clear);

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
          <CardTitle>数据管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted">
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
          <p className="text-muted">版本 v{APP_VERSION} (Release {APP_RELEASE})</p>
          <p className="text-muted">作者：{APP_AUTHOR}</p>
          <p>
            <a href={APP_LINK} className="text-primary hover:underline" target="_blank" rel="noreferrer">
              {APP_LINK}
            </a>
          </p>
          <p>
            <a href="https://github.com/DropFan/loan-schedule" className="text-primary hover:underline" target="_blank" rel="noreferrer">
              GitHub 源码
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
