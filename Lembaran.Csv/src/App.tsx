import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { readSource, type DocumentSource } from '@lembaran/framework';
import { EmptyState, useFullscreen, useIsMobile } from '@lembaran/ui';
import { decodeText, openFromDisk } from './feature/open';
import { defaultDelimiter, parseCsv } from './feature/grid';
import { CsvShell, type CsvShellProps } from './presentations/layout/CsvShell';
import { CsvMobileShell } from './presentations/mobile/CsvMobileShell';
import type { SelectedCell } from './presentations/layout/viewport/CsvGrid';

interface Props {
  source?: DocumentSource | null;
}

export function CsvApp({ source = null }: Props) {
  const [current, setCurrent] = useState<DocumentSource | null>(source);
  const [text, setText] = useState('');
  const [delimiter, setDelimiter] = useState(() => defaultDelimiter(source?.name ?? ''));
  const [selected, setSelected] = useState<SelectedCell | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const mobile = useIsMobile();
  const fullscreen = useFullscreen(rootRef);

  useEffect(() => {
    if (!current) {
      setText('');
      return;
    }
    let cancelled = false;
    const load = async () => {
      const bytes =
        current.kind === 'bytes' ? current.bytes : await readSource(current.path);
      if (!cancelled) setText(decodeText(bytes));
    };
    void load().catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
    });
    return () => {
      cancelled = true;
    };
  }, [current]);

  const open = useCallback(async () => {
    setOpening(true);
    setError(null);
    try {
      const opened = await openFromDisk();
      if (!opened) return;
      setDelimiter(defaultDelimiter(opened.name));
      setSelected(null);
      setCurrent({ kind: 'bytes', bytes: opened.bytes, name: opened.name, mime: opened.mime });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setOpening(false);
    }
  }, []);

  const table = useMemo(() => parseCsv(text, delimiter), [text, delimiter]);

  if (!current || error !== null) {
    return (
      <div className="lb-root" ref={rootRef}>
        <EmptyState
          tone={error !== null ? 'error' : 'prompt'}
          title={error !== null ? 'Could not read this file' : 'Open a CSV'}
          body={
            error ?? (
              <>
                A <code>.csv</code> or <code>.tsv</code> file. It is read here, on this device — nothing
                is uploaded, and a large file is rendered a screen at a time.
              </>
            )
          }
          action={{
            label: error !== null ? 'Try another file' : 'Choose a file',
            onClick: () => void open(),
            busy: opening,
          }}
        />
      </div>
    );
  }

  const shellProps: CsvShellProps = {
    table,
    name: current.name,
    delimiter,
    selected,
    fullscreen,
    rootRef,
    onSelect: setSelected,
    onDelimiter: setDelimiter,
    onOpen: () => void open(),
  };

  return mobile ? <CsvMobileShell {...shellProps} /> : <CsvShell {...shellProps} />;
}
