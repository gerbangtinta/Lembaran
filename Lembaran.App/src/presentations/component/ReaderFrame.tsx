import { useCallback, useRef, useState } from 'react';

interface Props {
  url: string;
  title: string;
  onClose(): void;
}

/** The production and development path to a reader: an iframe, always. */
export function ReaderFrame({ url, title, onClose }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [missing, setMissing] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Two ways a reader starts empty: the dev server is not serving it, or the reader threw
  // while loading. Either way the fix is a fresh document, not a fresh server.
  const check = useCallback(() => {
    const content = frameRef.current?.contentDocument;
    const root = content?.querySelector('#root');
    setMissing(!root || root.childElementCount === 0);
  }, []);

  return (
    <div className="hub-frame-wrap">
      <div className="hub-frame-bar">
        <button
          type="button"
          className="hub-frame-back"
          onClick={onClose}
          title="All readers"
          aria-label="All readers"
        >
          ‹
        </button>
        <span className="hub-frame-title" title={title}>
          {title}
        </span>
      </div>

      {missing && (
        <div className="hub-missing" role="alert">
          <strong>This reader did not start.</strong>
          <span>
            Either the server is not serving the reader, or it threw while loading — the terminal shows
            which. Reloading the reader is enough unless the server itself is down.
          </span>
          <button
            type="button"
            onClick={() => {
              setMissing(false);
              setAttempt((value) => value + 1);
            }}
          >
            Reload reader
          </button>
        </div>
      )}

      <iframe
        key={attempt}
        ref={frameRef}
        className="hub-frame"
        src={url}
        title={title}
        onLoad={() => {
          window.setTimeout(check, 350);
          window.setTimeout(check, 1500);
        }}
      />
    </div>
  );
}
