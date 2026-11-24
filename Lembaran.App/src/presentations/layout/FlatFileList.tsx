import type { FolderFile } from '@lembaran/framework';
import { FileIcon } from '../component/icons';

interface Props {
  files: readonly FolderFile[];
  onOpen(entry: FolderFile): void;
}

function bytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function when(time: number): string {
  return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function dirOf(file: FolderFile): string {
  const cut = file.path.length - file.name.length;
  return cut > 0 ? file.path.slice(0, cut) : '';
}

/**
 * Every readable document in the bound folder, subfolders included, in one flat list — the view for "I
 * know the file, I do not care where it lives". The meta line keeps the folder's path visible.
 */
export function FlatFileList({ files, onOpen }: Props) {
  if (files.length === 0) {
    return <p className="hub-note">No readable files in this folder.</p>;
  }

  return (
    <ul className="hub-browse" tabIndex={0}>
      {files.map((file) => {
        const dir = dirOf(file);
        return (
          <li key={file.path}>
            <button type="button" className="hub-row" onClick={() => onOpen(file)} title={file.path}>
              <span className="hub-row-icon" aria-hidden="true">
                <FileIcon />
              </span>
              <span className="hub-row-text">
                <span className="hub-row-label">{file.name}</span>
                <span className="hub-row-meta">
                  {dir.length > 0 ? `${dir} · ` : ''}.{file.extension} · {bytes(file.size)} ·{' '}
                  {when(file.modifiedAt)}
                </span>
              </span>
              <span className="hub-row-action">Open</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
