import { StatusBar as FrameStatusBar, StatusHint, StatusSeparator } from '@lembaran/ui';

interface Props {
  page: number;
  numPages: number;
  zoom: number;
  notes: number;
  hint: string;
}

export function StatusBar({ page, numPages, zoom, notes, hint }: Props) {
  return (
    <FrameStatusBar>
      <span>
        Page {page} of {numPages}
      </span>
      <StatusSeparator />
      <span>{Math.round(zoom * 100)}%</span>
      {notes > 0 && (
        <>
          <StatusSeparator />
          <span>
            {notes} {notes === 1 ? 'note' : 'notes'}
          </span>
        </>
      )}
      <StatusHint>{hint}</StatusHint>
    </FrameStatusBar>
  );
}
