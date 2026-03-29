import { describe, expect, it } from 'vitest';
import { toMarkdown } from '../markdownExporter';
import type { ExportTableData } from '../prepareData';

describe('toMarkdown', () => {
  const data: ExportTableData = {
    headers: ['期数', '日期', '金额'],
    rows: [
      ['1', '2025-02-15', '5307.27'],
      ['2', '2025-03-15', '5307.27'],
    ],
  };

  it('第一行是表头', () => {
    const md = toMarkdown(data);
    const lines = md.split('\n');
    expect(lines[0]).toBe('| 期数 | 日期 | 金额 |');
  });

  it('第二行是分隔符', () => {
    const md = toMarkdown(data);
    const lines = md.split('\n');
    expect(lines[1]).toBe('| --- | --- | --- |');
  });

  it('数据行格式正确', () => {
    const md = toMarkdown(data);
    const lines = md.split('\n');
    expect(lines[2]).toBe('| 1 | 2025-02-15 | 5307.27 |');
    expect(lines[3]).toBe('| 2 | 2025-03-15 | 5307.27 |');
  });

  it('总行数 = 表头 + 分隔 + 数据行', () => {
    const md = toMarkdown(data);
    const lines = md.split('\n');
    expect(lines).toHaveLength(4);
  });

  it('管道符被转义', () => {
    const specialData: ExportTableData = {
      headers: ['说明'],
      rows: [['A|B']],
    };
    const md = toMarkdown(specialData);
    const lines = md.split('\n');
    expect(lines[2]).toBe('| A\\|B |');
  });
});
