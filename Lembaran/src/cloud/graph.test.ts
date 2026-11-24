import { describe, expect, it } from 'vitest';
import { cloudErrorFor, collectPage, primaryDrives, toEntry, uploadChunks } from './graph';

const item = (id: string, name: string, extra: Record<string, unknown> = {}) => ({ id, name, ...extra });

describe('a drive listing', () => {
  it('maps an item to the row shape, keeping the version the write will need', () => {
    const entry = toEntry({
      id: 'item-1',
      name: 'report.pdf',
      size: 1024,
      eTag: '"abc,1"',
      lastModifiedDateTime: '2026-11-24T10:00:00Z',
      file: { mimeType: 'application/pdf' },
    });
    expect(entry).toEqual({
      id: 'item-1',
      name: 'report.pdf',
      folder: false,
      size: 1024,
      modifiedAt: Date.parse('2026-11-24T10:00:00Z'),
      etag: '"abc,1"',
    });
  });

  it('tells a folder from a file, and copes with a missing size or date', () => {
    expect(toEntry(item('f1', 'Reports', { folder: { childCount: 2 } })).folder).toBe(true);
    const bare = toEntry(item('f2', 'x.pdf'));
    expect(bare.size).toBe(0);
    expect(bare.modifiedAt).toBe(0);
    expect(bare.etag).toBe('');
  });

  it('collapses a repeated id and stops at the cap', () => {
    const first = collectPage([], [item('a', 'a.pdf'), item('b', 'b.pdf')], 10);
    expect(first.map((entry) => entry.id)).toEqual(['a', 'b']);

    // a second page that repeats what the first already had, plus one new item
    const second = collectPage(first, [item('b', 'b.pdf'), item('c', 'c.pdf')], 10);
    expect(second.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);

    const capped = collectPage([], [item('a', 'a.pdf'), item('b', 'b.pdf'), item('c', 'c.pdf')], 2);
    expect(capped.map((entry) => entry.id)).toEqual(['a', 'b']);
  });
});

describe('upload chunks', () => {
  it('splits at the chunk size, with the last chunk carrying the remainder', () => {
    const size = 320 * 1024;
    const chunks = uploadChunks(size * 2 + 5, size);
    expect(chunks).toEqual([
      { start: 0, end: size - 1 },
      { start: size, end: size * 2 - 1 },
      { start: size * 2, end: size * 2 + 4 },
    ]);
  });

  it('never asks for a chunk below the 320 KiB the API requires', () => {
    const chunks = uploadChunks(1024 * 1024, 1);
    expect(chunks[0]?.start).toBe(0);
    expect((chunks[0]?.end ?? 0) + 1).toBe(320 * 1024);
  });

  it('refuses to make a chunk above the 60 MiB ceiling', () => {
    const chunks = uploadChunks(200 * 1024 * 1024, 100 * 1024 * 1024);
    expect((chunks[0]?.end ?? 0) + 1).toBe(60 * 1024 * 1024);
    expect(chunks.length).toBe(4);
  });
});

describe('the drives a person should see', () => {
  it('keeps the default drive and drops the auxiliary personal ones a personal account reports', () => {
    const drives = primaryDrives({ id: 'main', name: 'OneDrive', driveType: 'personal' }, [
      { id: 'main', name: 'OneDrive', driveType: 'personal' },
      { id: '2974e5ed', name: '2974e5ed-d5e3-4e02', driveType: 'personal' },
      { id: 'bundles', name: 'Bundles_b896e2bb', driveType: 'personal' },
      { id: 'odc', name: 'ODCMetadataArchive', driveType: 'personal' },
    ]);
    expect(drives.map((drive) => drive.id)).toEqual(['main']);
  });

  it('keeps document libraries and business drives, default first and without duplicates', () => {
    const drives = primaryDrives({ id: 'main', name: 'OneDrive', driveType: 'business' }, [
      { id: 'site', name: 'Reports', driveType: 'documentLibrary' },
      { id: 'main', name: 'OneDrive', driveType: 'business' },
      { id: 'shared', name: 'Shared', driveType: 'business' },
    ]);
    expect(drives.map((drive) => drive.name)).toEqual(['OneDrive', 'Reports', 'Shared']);
  });

  it('still answers when the default drive could not be read', () => {
    expect(primaryDrives(null, [{ id: 'site', name: 'Reports', driveType: 'documentLibrary' }])).toHaveLength(1);
    expect(primaryDrives(null, [])).toEqual([]);
  });
});

describe('what a status means', () => {
  it('reads a refused request as a sign-in problem', () => {
    expect(cloudErrorFor(401).kind).toBe('unauthorised');
    expect(cloudErrorFor(403).kind).toBe('unauthorised');
  });

  it('names the missing permission for a 403, because that is what it usually is', () => {
    expect(cloudErrorFor(403).message).toContain('Files.ReadWrite');
    expect(cloudErrorFor(401).message).toContain('sign in again');
  });

  it('reads a version mismatch as a conflict, never as a retry', () => {
    expect(cloudErrorFor(409).kind).toBe('conflict');
    expect(cloudErrorFor(412).kind).toBe('conflict');
  });

  it('carries the wait a throttle asked for', () => {
    const headers = new Headers({ 'Retry-After': '7' });
    const error = cloudErrorFor(429, headers);
    expect(error.kind).toBe('throttled');
    expect(error.retryAfterMs).toBe(7000);
    expect(cloudErrorFor(429).retryAfterMs).toBe(2000);
  });

  it('treats anything else as a plain failure, with the status in the message', () => {
    const error = cloudErrorFor(500);
    expect(error.kind).toBe('unsupported');
    expect(error.message).toContain('500');
  });
});
