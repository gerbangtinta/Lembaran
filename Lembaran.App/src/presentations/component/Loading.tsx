interface Props {
  title: string;
  hint?: string;
  /** offered while waiting on something the person can still abandon */
  onCancel?(): void;
}

/**
 * A wait that looks like a wait. Connecting a drive loads a sign-in library, leaves for Microsoft and comes back,
 * so the section can be busy for a few seconds on a slow connection — long enough that a bare sentence reads as
 * "nothing happened".
 */
export function Loading({ title, hint, onCancel }: Props) {
  return (
    <div className="hub-loading" role="status" aria-live="polite">
      <span className="hub-spinner" aria-hidden="true" />
      <div className="hub-loading-text">
        <strong>{title}</strong>
        {hint !== undefined && <span className="hub-note hub-note-tight">{hint}</span>}
      </div>
      {onCancel !== undefined && (
        <button type="button" className="lb-ghost" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  );
}
