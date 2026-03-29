import { useVirtualizer } from '@tanstack/react-virtual';
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  DownloadIcon,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
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
  { key: 'annualInterestRate', label: '利率', width: 'w-16' },
  { key: 'comment', label: '备注', width: 'w-60' },
] as const;

export function ScheduleTable() {
  const schedule = useLoanStore((s) => s.schedule);
  const changes = useLoanStore((s) => s.changes);
  const parentRef = useRef<HTMLDivElement>(null);
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'fail'>(
    'idle',
  );

  const virtualizer = useVirtualizer({
    count: schedule.length,
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

  if (schedule.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState message="暂无还款计划" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>还款计划表</CardTitle>
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
      </CardHeader>
      <CardContent>
        <div ref={parentRef} className="max-h-[500px] overflow-auto">
          {/* 内层定宽容器，表头和数据一起横向滚动 */}
          <div className="min-w-[840px]">
            {/* 表头 — sticky top 让纵向滚动时固定 */}
            <div className="flex border-b border-border bg-background text-xs font-medium text-muted-foreground sticky top-0 z-10">
              {columns.map((col) => (
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
