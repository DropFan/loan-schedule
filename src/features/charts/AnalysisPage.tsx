import { EmptyState } from '@/components/shared/EmptyState';
import { LoanSwitcher } from '@/components/shared/LoanSwitcher';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLoanStore } from '@/stores/useLoanStore';
import { AnalysisSection } from './components/AnalysisSection';
import { AnnualSummaryChart } from './components/AnnualSummaryChart';
import { ComparisonChart } from './components/ComparisonChart';
import { DetailedTrendChart } from './components/DetailedTrendChart';
import { InterestSavingsChart } from './components/InterestSavingsChart';
import { MilestoneCards } from './components/MilestoneCards';
import { PrincipalRatioChart } from './components/PrincipalRatioChart';
import { RateTimelineChart } from './components/RateTimelineChart';
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

  const hasChanges = changes.length > 0;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <LoanSwitcher />

      {/* 还款进度 */}
      <AnalysisSection title="还款进度" storageKey="progress" defaultOpen>
        <div className="space-y-4">
          <MilestoneCards schedule={schedule} />
          <div className="grid grid-cols-1 min-[1900px]:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>还款概览</CardTitle>
              </CardHeader>
              <CardContent>
                <RepaymentPieChart schedule={schedule} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>年度还款汇总</CardTitle>
              </CardHeader>
              <CardContent>
                <AnnualSummaryChart schedule={schedule} />
              </CardContent>
            </Card>
          </div>
        </div>
      </AnalysisSection>

      {/* 趋势分析 */}
      <AnalysisSection title="趋势分析" storageKey="trend" defaultOpen>
        <div className="grid grid-cols-1 min-[1900px]:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>月供构成详情</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailedTrendChart schedule={schedule} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>本息比变化趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <PrincipalRatioChart schedule={schedule} />
            </CardContent>
          </Card>
        </div>
      </AnalysisSection>

      {/* 变更影响 */}
      <AnalysisSection title="变更影响" storageKey="changes" defaultOpen>
        {hasChanges ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 min-[1900px]:grid-cols-2 gap-4">
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
            </div>
            <Card>
              <CardHeader>
                <CardTitle>利率变化时间线</CardTitle>
              </CardHeader>
              <CardContent>
                <RateTimelineChart
                  params={params}
                  schedule={schedule}
                  changes={changes}
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <EmptyState message="暂无变更记录，在贷款计算页面添加利率变更或提前还款后可查看变更影响分析" />
            </CardContent>
          </Card>
        )}
      </AnalysisSection>
    </div>
  );
}
