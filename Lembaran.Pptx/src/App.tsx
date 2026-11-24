import { useCallback, useEffect, useRef, useState } from 'react';
import { readSource, type DocumentSource } from '@lembaran/framework';
import { EmptyState, onZoomRequest, useFullscreen, useIsMobile } from '@lembaran/ui';
import { openDeck, type Deck } from './feature/deck';
import { openFromDisk } from './feature/open';
import { fitScale, stepScale, stepSlide } from './feature/view';
import { SlideShell, type SlideShellProps } from './presentations/layout/SlideShell';
import { SlideMobileShell } from './presentations/mobile/SlideMobileShell';

interface Props {
  source?: DocumentSource | null;
}

export function SlideApp({ source = null }: Props) {
  const [current, setCurrent] = useState<DocumentSource | null>(source);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [fit, setFit] = useState(true);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState({ width: 0, height: 0 });

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const loadToken = useRef(0);

  const mobile = useIsMobile();
  const fullscreen = useFullscreen(rootRef);

  useEffect(() => {
    if (!current) return;
    const element = stageRef.current;
    if (!element) return;
    const update = () => setStage({ width: element.clientWidth, height: element.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [current]);

  useEffect(() => {
    if (!current) return;
    const token = (loadToken.current += 1);
    setBusy(true);
    setError(null);
    setDeck(null);
    setIndex(0);

    const run = async () => {
      const bytes = current.kind === 'bytes' ? current.bytes : await readSource(current.path);
      const opened = await openDeck(bytes);
      if (token !== loadToken.current) return;
      setDeck(opened);
      setBusy(false);
    };

    void run().catch((reason: unknown) => {
      if (token !== loadToken.current) return;
      setBusy(false);
      setError(reason instanceof Error ? reason.message : String(reason));
    });
  }, [current]);

  useEffect(() => {
    if (!fit || !deck || stage.width <= 0 || stage.height <= 0) return;
    setScale(fitScale(stage.width, stage.height, deck.width, deck.height));
  }, [deck, fit, stage.height, stage.width]);

  const open = useCallback(async () => {
    setOpening(true);
    setError(null);
    try {
      const opened = await openFromDisk();
      if (!opened) return;
      setCurrent({ kind: 'bytes', bytes: opened.bytes, name: opened.name, mime: opened.mime });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setOpening(false);
    }
  }, []);

  const goTo = useCallback((next: number) => setIndex(next), []);

  const move = useCallback(
    (delta: number) => {
      setIndex((value) => stepSlide(value, deck?.slides ?? 0, delta));
    },
    [deck],
  );

  const scaleIn = useCallback(() => {
    setFit(false);
    setScale((value) => stepScale(value, 1));
  }, []);

  const scaleOut = useCallback(() => {
    setFit(false);
    setScale((value) => stepScale(value, -1));
  }, []);

  // Ctrl + wheel re-renders the slide at the new scale instead of scaling the app around it
  useEffect(() => onZoomRequest((direction) => (direction === 1 ? scaleIn() : scaleOut())), [scaleIn, scaleOut]);

  const fitNow = useCallback(() => setFit(true), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.ctrlKey || event.metaKey) return;
      switch (event.key) {
        case '+':
        case '=':
          event.preventDefault();
          scaleIn();
          break;
        case '-':
          event.preventDefault();
          scaleOut();
          break;
        case '0':
          event.preventDefault();
          fitNow();
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          fullscreen.toggle();
          break;
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          event.preventDefault();
          move(1);
          break;
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault();
          move(-1);
          break;
        case 'Home':
          event.preventDefault();
          goTo(0);
          break;
        case 'End':
          event.preventDefault();
          goTo(Math.max(0, (deck?.slides ?? 1) - 1));
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deck, fitNow, fullscreen, goTo, move, scaleIn, scaleOut]);

  if (!current) {
    return (
      <div className="lb-root" ref={rootRef}>
        <EmptyState
          tone={error !== null ? 'error' : 'prompt'}
          title={error !== null ? 'Could not read this file' : 'Open a presentation'}
          body={
            error ?? (
              <>
                A <code>.pptx</code> file. Slides are painted on this device by a WASM layout engine —
                nothing is uploaded, and the file is never modified.
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

  const shellProps: SlideShellProps = {
    name: current.name,
    deck,
    index,
    scale,
    busy: busy || opening,
    error,
    fullscreen,
    rootRef,
    stageRef,
    onSlide: move,
    onScaleIn: scaleIn,
    onScaleOut: scaleOut,
    onFit: fitNow,
    onSelect: goTo,
  };

  return mobile ? <SlideMobileShell {...shellProps} /> : <SlideShell {...shellProps} />;
}
