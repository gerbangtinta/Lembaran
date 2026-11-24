import { describe, expect, it } from 'vitest';
import {
  eligiblePaths,
  folderCounts,
  folderView,
  pathSegments,
  searchFolder,
  shouldListPath,
  sortFolderFiles,
  type FolderFile,
} from './entries';

const file = (path: string): FolderFile => ({
  name: path.slice(path.lastIndexOf('/') + 1),
  path,
  extension: path.slice(path.lastIndexOf('.') + 1),
  size: 1,
  modifiedAt: 1,
});

describe('bound folder listing', () => {
  it('offers only the extensions a reader can open, at any depth', () => {
    const paths = ['Notes.txt', 'report.PDF', 'reports/2024/q1.xlsx', 'deck.pptx', 'scan'];
    expect(eligiblePaths(paths, ['pdf'])).toEqual(['report.PDF']);
    expect(eligiblePaths(paths, ['xlsx'])).toEqual(['reports/2024/q1.xlsx']);
    expect(eligiblePaths(paths, ['pdf', 'pptx'])).toEqual(['deck.pptx', 'report.PDF']);
  });

  it('skips dot-files, hidden folders and Office lock files wherever they sit', () => {
    expect(shouldListPath('.hidden.pdf', ['pdf'])).toBe(false);
    expect(shouldListPath('drafts/.cache/page.pdf', ['pdf'])).toBe(false);
    expect(shouldListPath('~$budget.docx', ['docx'])).toBe(false);
    expect(shouldListPath('drafts/budget.docx', ['docx'])).toBe(true);
  });

  it('sorts like a file manager, so a folder keeps its files together', () => {
    const paths = ['Chapter 10.pdf', 'chapter 2.pdf', 'annex/Chapter 1.pdf'];
    expect(eligiblePaths(paths, ['pdf'])).toEqual([
      'annex/Chapter 1.pdf',
      'chapter 2.pdf',
      'Chapter 10.pdf',
    ]);
  });

  it('stops at the limit instead of listing a whole disk', () => {
    const paths = Array.from({ length: 12 }, (_, index) => `page-${index + 1}.pdf`);
    expect(eligiblePaths(paths, ['pdf'], 5)).toHaveLength(5);
    expect(eligiblePaths(paths, ['pdf'], 5)[0]).toBe('page-1.pdf');
  });
});

describe('browsing one level', () => {
  const files = [
    file('zeta.pdf'),
    file('Reports/2024/q1.pdf'),
    file('Reports/2024/q2.pdf'),
    file('Reports/summary.pdf'),
    file('Photos/cover.pdf'),
  ];

  it('shows the bound folder as subfolders plus the files sitting directly in it', () => {
    const view = folderView(files, '');
    expect(view.folders).toEqual(['Photos', 'Reports']);
    expect(view.files.map((entry) => entry.name)).toEqual(['zeta.pdf']);
  });

  it('steps into a subfolder without touching the other branches', () => {
    const view = folderView(files, 'Reports');
    expect(view.folders).toEqual(['2024']);
    expect(view.files.map((entry) => entry.name)).toEqual(['summary.pdf']);
    expect(folderView(files, 'Reports/2024').files.map((entry) => entry.name)).toEqual([
      'q1.pdf',
      'q2.pdf',
    ]);
  });

  it('turns a path into breadcrumb segments', () => {
    expect(pathSegments('')).toEqual([]);
    expect(pathSegments('Reports/2024')).toEqual(['Reports', '2024']);
  });

  it('counts the folders that hold documents, and the documents by extension', () => {
    const counts = folderCounts(files);
    // Reports, Reports/2024 and Photos each hold at least one document
    expect(counts.folders).toBe(3);
    expect(counts.byExtension).toEqual({ pdf: 5 });
  });

  it('searches names anywhere in the tree, folders included', () => {
    const found = searchFolder(files, '2024');
    expect(found.folders.map((folder) => folder.path)).toEqual(['Reports/2024']);
    expect(found.files.map((entry) => entry.path)).toEqual(['Reports/2024/q1.pdf', 'Reports/2024/q2.pdf']);
    expect(searchFolder(files, 'report').folders.map((folder) => folder.name)).toEqual(['Reports']);
    expect(searchFolder(files, 'nothing')).toEqual({ folders: [], files: [] });
    expect(searchFolder(files, '   ')).toEqual({ folders: [], files: [] });
  });
});

describe('folder file rows', () => {
  it('keeps the caller’s array untouched when sorting rows by path', () => {
    const rows: FolderFile[] = [
      { name: 'a.pdf', path: 'nested/a.pdf', extension: 'pdf', size: 1, modifiedAt: 1 },
      { name: 'b.pdf', path: 'b.pdf', extension: 'pdf', size: 2, modifiedAt: 2 },
    ];
    const sorted = sortFolderFiles(rows);
    expect(sorted.map((row) => row.path)).toEqual(['b.pdf', 'nested/a.pdf']);
    expect(rows.map((row) => row.path)).toEqual(['nested/a.pdf', 'b.pdf']);
  });
});
