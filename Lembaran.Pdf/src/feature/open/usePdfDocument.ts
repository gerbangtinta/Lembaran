import { useEffect, useState } from 'react';
import type { OpenedPdf, PDFDocumentProxy } from './engine';
import { openPdf } from './engine';

export interface DocumentState {
  doc: PDFDocumentProxy | null;
  loading: boolean;
  error: string | null;
}

const IDLE: DocumentState = { doc: null, loading: false, error: null };

export function usePdfDocument(bytes: Uint8Array | null, assetBase: string): DocumentState {
  const [state, setState] = useState<DocumentState>(IDLE);

  useEffect(() => {
    if (!bytes) {
      setState(IDLE);
      return;
    }

    let cancelled = false;
    let opened: OpenedPdf | null = null;
    setState({ doc: null, loading: true, error: null });

    openPdf(bytes, { assetBase })
      .then((handle) => {
        if (cancelled) {
          void handle.destroy();
          return;
        }
        opened = handle;
        setState({ doc: handle.doc, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          doc: null,
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      cancelled = true;
      if (opened) void opened.destroy();
    };
  }, [bytes, assetBase]);

  return state;
}
