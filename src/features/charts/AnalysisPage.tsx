import { EmptyState } from '@/components/shared/EmptyState';
import { LoanSwitcher } from '@/components/shared/LoanSwitcher';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLoanStore } from '@/stores/useLoanStore';
import { ComparisonChart } from './components/ComparisonChart';
import { DetailedTrendChart } from './components/DetailedTrendChart';
import { InterestSavingsChart } from './components/InterestSavingsChart';
import { RepaymentPieChart } from './components/RepaymentPieChart';

export function AnalysisPage() {
  const params = useLoanStore((s) => s.params);
  const schedule = useLoanStore((s) => s.schedule);
  const changes = useLoanStore((s) => s.changes);
  const history = useLoanStore((s) => s.history);
  const summary = useLoanStore((s) => s.summary);

  if (!params || !summary || schedule.length === 0) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <LoanSwitcher />
        <Card>
          <CardContent className="pt-6">
            <EmptyState message="请先在贷款计算页面设置贷款参数并生成还款计划" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <LoanSwitcher />
      <div className="grid grid-cols-1 min-[1900px]:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>还款概览</CardTitle>
          </CardHeader>
          <CardContent>
            <RepaymentPieChart schedule={schedule} summary={summary} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>变更前后对比</CardTitle>
          </CardHeader>
          <CardContent>
            <ComparisonChart
              schedule={schedule}
              changes={changes}
              history={history}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>利息对比</CardTitle>
          </CardHeader>
          <CardContent>
            <InterestSavingsChart
              schedule={schedule}
              changes={changes}
              history={history}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>月供构成详情</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailedTrendChart schedule={schedule} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
