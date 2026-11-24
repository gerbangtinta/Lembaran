import type { DocumentSource } from '@lembaran/framework';
import { readSource } from '@lembaran/framework';

export async function loadSourceBytes(source: DocumentSource): Promise<Uint8Array> {
  return source.kind === 'bytes' ? source.bytes : readSource(source.path);
}

const OPFS_HASH = /sources\/([a-f0-9]{64})\.bin$/i;

/**
 * A stable identity for "this document", used to attach annotations. The OPFS path
 * carries the content hash; a byte source has no path, so it falls back to a sample
 * of its own bytes, which is stable for the same file.
 */
export function documentKey(source: DocumentSource | null): string {
  if (!source) return '';
  if (source.kind === 'opfs') {
    const match = OPFS_HASH.exec(source.path);
    return match?.[1] ?? source.path;
  }
  let weight = 0;
  const sample = source.bytes.subarray(0, 4096);
  for (let index = 0; index < sample.length; index += 97) {
    weight = (weight * 31 + (sample[index] ?? 0)) >>> 0;
  }
  return `${source.name}:${source.bytes.byteLength}:${weight.toString(16)}`;
}
