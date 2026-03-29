import { describe, expect, it } from 'vitest';
import { toHtml, toTsv } from '../clipboardExporter';
import type { ExportTableData } from '../prepareData';

const data: ExportTableData = {
  headers: ['期数', '金额'],
  rows: [
    ['1', '5307.27'],
    ['2', '5307.27'],
  ],
};

describe('toHtml', () => {
  it('生成完整 HTML 表格', () => {
    const html = toHtml(data);
    expect(html).toContain('<table>');
    expect(html).toContain('</table>');
    expect(html).toContain('<thead>');
    expect(html).toContain('<tbody>');
  });

  it('表头在 th 中', () => {
    const html = toHtml(data);
    expect(html).toContain('<th>期数</th>');
    expect(html).toContain('<th>金额</th>');
  });

  it('数据在 td 中', () => {
    const html = toHtml(data);
    expect(html).toContain('<td>1</td>');
    expect(html).toContain('<td>5307.27</td>');
  });

  it('转义 HTML 特殊字符', () => {
    const specialData: ExportTableData = {
      headers: ['说明'],
      rows: [['<script>alert("xss")</script>']],
    };
    const html = toHtml(specialData);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('toTsv', () => {
  it('用制表符分隔字段', () => {
    const tsv = toTsv(data);
    const lines = tsv.split('\n');
    expect(lines[0]).toBe('期数\t金额');
    expect(lines[1]).toBe('1\t5307.27');
  });

  it('总行数 = 表头 + 数据行', () => {
    const tsv = toTsv(data);
    const lines = tsv.split('\n');
    expect(lines).toHaveLength(3);
  });
});
