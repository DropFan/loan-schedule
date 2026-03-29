import { downloadBlob, generateExportFilename } from './downloadFile';
import type { ExportTableData } from './prepareData';

export function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function toCsv(data: ExportTableData): string {
  const lines = [data.headers, ...data.rows];
  return lines.map((row) => row.map(escapeCsvField).join(',')).join('\n');
}

export function exportToCsv(data: ExportTableData): void {
  const csv = toCsv(data);
  const bom = '\uFEFF'; // UTF-8 BOM，确保 Excel 正确识别中文
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, generateExportFilename('csv'));
}
