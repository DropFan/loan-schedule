import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  DownloadIcon,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CombinedScheduleItem } from '@/core/calculator/CombinedLoanHelper';
import { formatCurrency } from '@/core/utils/formatHelper';
import { exportToExcel } from '@/services/ExcelExporter';
import {
  copyToClipboard,
  exportToCsv,
  exportToMarkdown,
  prepareScheduleData,
} from '@/services/export';
import { useLoanStore } from '@/stores/useLoanStore';

const columns = [
  { key: 'period', label: '期数', width: 'w-14' },
  { key: 'paymentDate', label: '日期', width: 'w-24' },
  { key: 'monthlyPayment', label: '月供', width: 'w-24' },
  { key: 'principal', label: '本金', width: 'w-24' },
  { key: 'interest', label: '利息', width: 'w-20' },
  { key: 'remainingLoan', label: '剩余本金', width: 'w-28' },
  { key: 'cumulativePayment', label: '累计还款', width: 'w-28' },
  { key: 'cumulativeInterest', label: '累计利息', width: 'w-24' },
  { key: 'annualInterestRate', label: '利率', width: 'w-16' },
  { key: 'comment', label: '备注', width: 'w-60' },
] as const;

const combinedColumns = [
  { key: 'period', label: '期数', width: 'w-14' },
  { key: 'paymentDate', label: '还款日', width: 'w-36' },
  { key: 'monthlyPayment', label: '月供合计', width: 'w-24' },
  { key: 'principal', label: '本金合计', width: 'w-24' },
  { key: 'interest', label: '利息合计', width: 'w-20' },
  { key: 'remainingLoan', label: '剩余本金', width: 'w-28' },
  { key: 'cumulativePayment', label: '累计还款', width: 'w-28' },
  { key: 'cumulativeInterest', label: '累计利息', width: 'w-24' },
  { key: 'rate', label: '利率', width: 'w-28' },
] as const;

function formatDualDate(dateA: string, dateB: string): string {
  if (!dateA && !dateB) return '';
  if (!dateA) return dateB;
  if (!dateB) return dateA;
  // 只显示月-日部分
  const shortA = dateA.slice(5);
  const shortB = dateB.slice(5);
  if (shortA === shortB) return dateA;
  return `${shortA} / ${shortB}`;
}

function formatDualRate(rateA: number, rateB: number): string {
  if (rateA === 0 && rateB === 0) return '';
  if (rateA === 0) return `${rateB}%`;
  if (rateB === 0) return `${rateA}%`;
  if (rateA === rateB) return `${rateA}%`;
  return `${rateA}% / ${rateB}%`;
}

interface ScheduleTableProps {
  combinedSchedule?: CombinedScheduleItem[];
}

export function ScheduleTable({ combinedSchedule }: ScheduleTableProps = {}) {
  const schedule = useLoanStore((s) => s.schedule);
  const changes = useLoanStore((s) => s.changes);
  const parentRef = useRef<HTMLDivElement>(null);
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'fail'>(
    'idle',
  );

  const isCombinedView = combinedSchedule && combinedSchedule.length > 0;
  const rowCount = isCombinedView ? combinedSchedule.length : schedule.length;

  const cumulative = useMemo(() => {
    if (isCombinedView) {
      let totalPayment = 0;
      let totalInterest = 0;
      return combinedSchedule.map((item) => {
        totalPayment += item.monthlyPayment;
        totalInterest += item.interest;
        return {
          cumulativePayment: totalPayment,
          cumulativeInterest: totalInterest,
        };
      });
    }
    let totalPayment = 0;
    let totalInterest = 0;
    return schedule.map((item) => {
      totalPayment += item.monthlyPayment;
      totalInterest += item.interest;
      return {
        cumulativePayment: totalPayment,
        cumulativeInterest: totalInterest,
      };
    });
  }, [isCombinedView, combinedSchedule, schedule]);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 20,
  });

  const handleExportExcel = useCallback(() => {
    exportToExcel(schedule, changes);
  }, [schedule, changes]);

  const handleExportCsv = useCallback(() => {
    exportToCsv(prepareScheduleData(schedule));
  }, [schedule]);

  const handleExportMarkdown = useCallback(() => {
    exportToMarkdown(prepareScheduleData(schedule));
  }, [schedule]);

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(prepareScheduleData(schedule));
    setCopyState(ok ? 'success' : 'fail');
    setTimeout(() => setCopyState('idle'), 2000);
  }, [schedule]);

  if (rowCount === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState message="暂无还款计划" />
        </CardContent>
      </Card>
    );
  }

  const activeColumns = isCombinedView ? combinedColumns : columns;
  const minWidth = isCombinedView ? '1000px' : '1050px';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>
          {isCombinedView ? '合并还款计划表' : '还款计划表'}
        </CardTitle>
        {/* 合计模式暂不支持导出（Phase 4 实现） */}
        {!isCombinedView && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm">
                  导出 <ChevronDownIcon />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportExcel}>
                <DownloadIcon /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCsv}>
                <DownloadIcon /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportMarkdown}>
                <DownloadIcon /> Markdown
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCopy}>
                {copyState === 'success' ? <CheckIcon /> : <CopyIcon />}
                {copyState === 'success' ? '已复制!' : '复制到剪贴板'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent>
        <div ref={parentRef} className="max-h-[500px] overflow-auto">
          <div style={{ minWidth }}>
            {/* 表头 */}
            <div className="flex border-b border-border bg-background text-xs font-medium text-muted-foreground sticky top-0 z-10">
              {activeColumns.map((col) => (
                <div
                  key={col.key}
                  className={`${col.width} shrink-0 px-2 py-2`}
                >
                  {col.label}
                </div>
              ))}
            </div>

            {/* 虚拟滚动区域 */}
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                if (isCombinedView) {
                  return (
                    <CombinedRow
                      key={virtualRow.key}
                      virtualRow={virtualRow}
                      item={combinedSchedule[virtualRow.index]}
                      cumulative={cumulative[virtualRow.index]}
                      measureElement={virtualizer.measureElement}
                    />
                  );
                }

                const row = schedule[virtualRow.index];
                const isChange = row.period === 0 || row.comment !== '';

                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    className={`flex text-xs border-b border-border/50 ${
                      isChange ? 'bg-primary/5' : ''
                    }`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="w-14 shrink-0 px-2 py-2">
                      {row.period === 0 ? '提前' : row.period}
                    </div>
                    <div className="w-24 shrink-0 px-2 py-2">
                      {row.paymentDate}
                    </div>
                    <div className="w-24 shrink-0 px-2 py-2">
                      {formatCurrency(row.monthlyPayment)}
                    </div>
                    <div className="w-24 shrink-0 px-2 py-2">
                      {formatCurrency(row.principal)}
                    </div>
                    <div className="w-20 shrink-0 px-2 py-2">
                      {formatCurrency(row.interest)}
                    </div>
                    <div className="w-28 shrink-0 px-2 py-2">
                      {formatCurrency(row.remainingLoan)}
                    </div>
                    <div className="w-28 shrink-0 px-2 py-2">
                      {formatCurrency(
                        cumulative[virtualRow.index].cumulativePayment,
                      )}
                    </div>
                    <div className="w-24 shrink-0 px-2 py-2">
                      {formatCurrency(
                        cumulative[virtualRow.index].cumulativeInterest,
                      )}
                    </div>
                    <div className="w-16 shrink-0 px-2 py-2">
                      {row.annualInterestRate}%
                    </div>
                    <div className="w-60 shrink-0 px-2 py-2 text-muted-foreground break-words">
                      {row.comment}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CombinedRow({
  virtualRow,
  item,
  cumulative,
  measureElement,
}: {
  virtualRow: VirtualItem;
  item: CombinedScheduleItem;
  cumulative: { cumulativePayment: number; cumulativeInterest: number };
  measureElement: (el: HTMLElement | null) => void;
}) {
  const isChange = item.period === 0;

  return (
    <div
      data-index={virtualRow.index}
      ref={measureElement}
      className={`flex text-xs border-b border-border/50 ${
        isChange ? 'bg-primary/5' : ''
      }`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        transform: `translateY(${virtualRow.start}px)`,
      }}
    >
      <div className="w-14 shrink-0 px-2 py-2">
        {item.period === 0 ? '提前' : item.period}
      </div>
      <div className="w-36 shrink-0 px-2 py-2">
        {formatDualDate(item.paymentDateA, item.paymentDateB)}
      </div>
      <div className="w-24 shrink-0 px-2 py-2">
        {formatCurrency(item.monthlyPayment)}
      </div>
      <div className="w-24 shrink-0 px-2 py-2">
        {formatCurrency(item.principal)}
      </div>
      <div className="w-20 shrink-0 px-2 py-2">
        {formatCurrency(item.interest)}
      </div>
      <div className="w-28 shrink-0 px-2 py-2">
        {formatCurrency(item.remainingLoan)}
      </div>
      <div className="w-28 shrink-0 px-2 py-2">
        {formatCurrency(cumulative.cumulativePayment)}
      </div>
      <div className="w-24 shrink-0 px-2 py-2">
        {formatCurrency(cumulative.cumulativeInterest)}
      </div>
      <div className="w-28 shrink-0 px-2 py-2">
        {formatDualRate(
          item.detailA.annualInterestRate,
          item.detailB.annualInterestRate,
        )}
      </div>
    </div>
  );
}
