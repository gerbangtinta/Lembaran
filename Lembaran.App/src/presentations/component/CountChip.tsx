import { useEffect, useRef, useState } from 'react';
import { folderCounts, type FolderFile } from '@lembaran/framework';
import { READERS } from '../../feature/choose';

/** A tile is a fixed 62 px square, so a name that does not fit one word of five needs a shorter word. */
const SHORT_LABELS: Record<string, string> = { PowerPoint: 'Slides' };

/** `pdf: 12` → `12 PDF`, using the reader that owns the extension. */
function kinds(byExtension: Record<string, number>): Array<{ label: string; count: number }> {
  return Object.entries(byExtension)
    .map(([extension, count]) => {
      const reader = READERS.find((entry) => entry.extensions.includes(extension));
      const name = reader?.name ?? extension.toUpperCase();
      return { label: SHORT_LABELS[name] ?? name, count };
    })
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

/**
 * The count beside the folder name, and the tile board behind it. A desk gets it on hover; a touch screen
 * has no hover to leave, so there a tap opens it and the next tap anywhere else closes it — otherwise the
 * helper stays stuck over the list.
 */
export function CountChip({ files }: { files: readonly FolderFile[] }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const counts = folderCounts(files);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span className="hub-count-wrap" ref={wrap}>
      <button
        type="button"
        className="hub-count"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-describedby="hub-folder-breakdown"
      >
        {files.length} files
      </button>
      <span
        className={`hub-tip${open ? ' is-open' : ''}`}
        role="tooltip"
        id="hub-folder-breakdown"
      >
        <span className="hub-tip-tile">
          <span className="hub-tip-value">{counts.folders}</span>
          <span className="hub-tip-label">{counts.folders === 1 ? 'folder' : 'folders'}</span>
        </span>
        {kinds(counts.byExtension).map((kind) => (
          <span className="hub-tip-tile" key={kind.label}>
            <span className="hub-tip-value">{kind.count}</span>
            <span className="hub-tip-label">{kind.label}</span>
          </span>
        ))}
      </span>
    </span>
  );
}
