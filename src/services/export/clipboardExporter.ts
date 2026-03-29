import type { ExportTableData } from './prepareData';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function toHtml(data: ExportTableData): string {
  const { headers, rows } = data;
  return [
    '<table>',
    `<thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`,
    '<tbody>',
    ...rows.map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`,
    ),
    '</tbody>',
    '</table>',
  ].join('');
}

export function toTsv(data: ExportTableData): string {
  return [data.headers, ...data.rows].map((row) => row.join('\t')).join('\n');
}

export async function copyToClipboard(data: ExportTableData): Promise<boolean> {
  const html = toHtml(data);
  const text = toTsv(data);

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ]);
    return true;
  } catch {
    // Fallback：不支持 ClipboardItem 的浏览器退回纯文本
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}
