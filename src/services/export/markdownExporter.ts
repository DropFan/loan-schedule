import { downloadBlob, generateExportFilename } from './downloadFile';
import type { ExportTableData } from './prepareData';

function escapeMarkdownCell(cell: string): string {
  return cell.replace(/\|/g, '\\|');
}

export function toMarkdown(data: ExportTableData): string {
  const { headers, rows } = data;
  const headerLine = `| ${headers.map(escapeMarkdownCell).join(' | ')} |`;
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const dataLines = rows.map(
    (row) => `| ${row.map(escapeMarkdownCell).join(' | ')} |`,
  );
  return [headerLine, separatorLine, ...dataLines].join('\n');
}

export function exportToMarkdown(data: ExportTableData): void {
  const md = toMarkdown(data);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  downloadBlob(blob, generateExportFilename('md'));
}
