import { IconButton } from '../library/IconButton';

export interface PageSwitchProps {
  page: number;
  numPages: number;
  onGoTo(page: number): void;
  /** sized for the rail's 168 px footer */
  compact?: boolean;
}

/**
 * Previous, the page to jump to, next. It lives under the thumbnails, next to the pages it moves through,
 * rather than on the top bar — and returns to the bar only while the rail is hidden.
 */
export function PageSwitch({ page, numPages, onGoTo, compact }: PageSwitchProps) {
  return (
    <div className={`pdf-seg${compact ? ' is-compact' : ''}`} aria-label="Navigation">
      <IconButton
        icon="prev"
        label="Previous page"
        onClick={() => onGoTo(page - 1)}
        disabled={page <= 1}
      />
      <PageBox page={page} numPages={numPages} onGoTo={onGoTo} />
      <IconButton
        icon="next"
        label="Next page"
        onClick={() => onGoTo(page + 1)}
        disabled={page >= numPages}
      />
    </div>
  );
}

export function PageBox({
  page,
  numPages,
  onGoTo,
}: {
  page: number;
  numPages: number;
  onGoTo(page: number): void;
}) {
  return (
    <label className="pdf-pagebox">
      <span className="pdf-visually-hidden">Page</span>
      <input
        type="number"
        min={1}
        max={numPages}
        value={page}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next) && next >= 1 && next <= numPages) onGoTo(next);
        }}
        className="pdf-pageinput"
        aria-label="Page"
      />
      <span className="pdf-pagecount">of {numPages}</span>
    </label>
  );
}
