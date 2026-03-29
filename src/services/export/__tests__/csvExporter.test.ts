import { describe, expect, it } from 'vitest';
import { escapeCsvField, toCsv } from '../csvExporter';
import type { ExportTableData } from '../prepareData';

describe('escapeCsvField', () => {
  it('普通字符串不转义', () => {
    expect(escapeCsvField('hello')).toBe('hello');
  });

  it('包含逗号时用双引号包裹', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
  });

  it('包含双引号时转义并包裹', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('包含换行时用双引号包裹', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });

  it('空字符串不转义', () => {
    expect(escapeCsvField('')).toBe('');
  });
});

describe('toCsv', () => {
  const data: ExportTableData = {
    headers: ['期数', '日期', '金额'],
    rows: [
      ['1', '2025-02-15', '5307.27'],
      ['2', '2025-03-15', '5307.27'],
    ],
  };

  it('第一行是表头', () => {
    const csv = toCsv(data);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('期数,日期,金额');
  });

  it('数据行正确', () => {
    const csv = toCsv(data);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('1,2025-02-15,5307.27');
    expect(lines[2]).toBe('2,2025-03-15,5307.27');
  });

  it('总行数 = 表头 + 数据行', () => {
    const csv = toCsv(data);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
  });

  it('包含特殊字符的字段被正确转义', () => {
    const specialData: ExportTableData = {
      headers: ['说明'],
      rows: [['提前还款 10万, 缩短年限']],
    };
    const csv = toCsv(specialData);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('"提前还款 10万, 缩短年限"');
  });
});
