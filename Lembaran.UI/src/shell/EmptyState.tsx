import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  body: ReactNode;
  action: { label: string; onClick(): void; busy?: boolean };
  /** `error` renders the action as a retry and the body as a technical message */
  tone?: 'prompt' | 'error';
}

/** The "nothing open yet" and "could not read this file" card, identical in every reader. */
export function EmptyState({ title, body, action, tone = 'prompt' }: EmptyStateProps) {
  return (
    <div className="lb-empty">
      <div className="lb-empty-card">
        <h1>{title}</h1>
        <p className={tone === 'error' ? 'lb-empty-error' : undefined}>{body}</p>
        <button
          type="button"
          className="lb-control lb-control-outline"
          onClick={action.onClick}
          disabled={action.busy}
        >
          {action.busy ? 'Opening…' : action.label}
        </button>
      </div>
    </div>
  );
}
