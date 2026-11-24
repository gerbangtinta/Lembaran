import { describe, expect, it } from 'vitest';
import { cloudFiles, cloudFolders, readableCloudEntries } from './entries';
import type { CloudEntry } from './types';

const entries: CloudEntry[] = [
  { id: 'f1', name: 'Reports', folder: true, size: 0, modifiedAt: 0, etag: '' },
  { id: 'i1', name: 'report.pdf', folder: false, size: 2048, modifiedAt: 1_700_000_000_000, etag: 'v3' },
  { id: 'i2', name: 'notes.txt', folder: false, size: 10, modifiedAt: 1_700_000_000_000, etag: 'v1' },
  { id: 'i3', name: '~$draft.docx', folder: false, size: 10, modifiedAt: 1_700_000_000_000, etag: 'v1' },
  { id: 'i4', name: '.hidden.pdf', folder: false, size: 10, modifiedAt: 1_700_000_000_000, etag: 'v1' },
];

const EXTENSIONS = ['pdf', 'docx', 'pptx', 'xlsx', 'csv'];

describe('a drive folder as hub rows', () => {
  it('keeps folders out of the file rows and carries the reference a save needs', () => {
    const rows = cloudFiles(entries, 'drive-1');
    expect(rows.map((row) => row.name)).toEqual(['report.pdf', 'notes.txt', '~$draft.docx', '.hidden.pdf']);
    expect(rows[0]?.cloud).toEqual({
      provider: 'onedrive',
      driveId: 'drive-1',
      itemId: 'i1',
      etag: 'v3',
      name: 'report.pdf',
    });
    expect(rows[0]?.extension).toBe('pdf');
    expect(rows[0]?.size).toBe(2048);
  });

  it('lists the folders of the level on their own', () => {
    expect(cloudFolders(entries).map((entry) => entry.name)).toEqual(['Reports']);
  });

  it('applies the same rules a local folder follows: a known extension, no lock files, no dot-files', () => {
    expect(readableCloudEntries(entries, EXTENSIONS).map((entry) => entry.name)).toEqual([
      'Reports',
      'report.pdf',
    ]);
  });
});
