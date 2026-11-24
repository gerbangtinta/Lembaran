import { describe, expect, it } from 'vitest';
import { defaultDelimiter, parseCsv } from './store';

describe('parseCsv', () => {
  it('detects the delimiter', () => {
    expect(parseCsv('a;b;c\n1;2;3').delimiter).toBe(';');
    expect(parseCsv('a\tb\n1\t2').delimiter).toBe('\t');
    expect(parseCsv('a,b\n1,2').delimiter).toBe(',');
  });

  it('keeps quoted fields intact', () => {
    const table = parseCsv('name,note\n"Smith, J.","said ""hi"""');
    expect(table.rows[1]).toEqual(['Smith, J.', 'said "hi"']);
  });

  it('drops a byte-order mark', () => {
    const table = parseCsv('\uFEFFa,b\n1,2');
    expect(table.rows[0]).toEqual(['a', 'b']);
  });

  it('pads ragged rows in the reported width, not the data', () => {
    const table = parseCsv('a,b,c\n1,2');
    expect(table.columns).toBe(3);
    expect(table.rows).toHaveLength(2);
  });

  it('honours an explicit delimiter', () => {
    expect(parseCsv('a|b\n1|2', '|').rows[1]).toEqual(['1', '2']);
  });
});

describe('defaultDelimiter', () => {
  it('trusts the extension: a csv is comma separated, a tsv is tab separated', () => {
    expect(defaultDelimiter('cities.csv')).toBe(',');
    expect(defaultDelimiter('CITIES.CSV')).toBe(',');
    expect(defaultDelimiter('export.tsv')).toBe('\t');
    expect(defaultDelimiter('pasted')).toBe(',');
  });
});
