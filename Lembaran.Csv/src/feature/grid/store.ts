import Papa from 'papaparse';

export interface CsvTable {
  rows: string[][];
  columns: number;
  /** the delimiter that was used, detected or chosen */
  delimiter: string;
  /** first few parse problems, for the status bar */
  problems: string[];
}

export const DELIMITERS = [
  { value: '', label: 'Detect' },
  { value: ',', label: 'Comma' },
  { value: ';', label: 'Semicolon' },
  { value: '\t', label: 'Tab' },
  { value: '|', label: 'Pipe' },
] as const;

/**
 * A `.csv` is comma separated and a `.tsv` is tab separated — that is what the extensions mean, so neither
 * starts on "Detect". Detection stays one choice away for the file that lies about itself.
 */
export function defaultDelimiter(name: string): string {
  return /\.tsv$/i.test(name) ? '\t' : ',';
}

export function parseCsv(text: string, delimiter = ''): CsvTable {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const result = Papa.parse<string[]>(source, {
    delimiter,
    skipEmptyLines: 'greedy',
    // both false selects papaparse's synchronous "parse a string" overload
    worker: false,
    download: false,
  });

  const rows = (result.data ?? []).filter((row): row is string[] => Array.isArray(row));
  const columns = rows.reduce((widest, row) => Math.max(widest, row.length), 0);

  return {
    rows,
    columns,
    delimiter: result.meta.delimiter || delimiter || ',',
    problems: result.errors.slice(0, 3).map((problem) => problem.message),
  };
}
