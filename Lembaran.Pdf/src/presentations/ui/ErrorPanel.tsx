interface Props {
  message: string;
  onRetry(): void;
}

export function ErrorPanel({ message, onRetry }: Props) {
  return (
    <div className="pdf-prompt">
      <div className="pdf-prompt-card">
        <h1>Could not open this document</h1>
        <p className="pdf-error-text">{message}</p>
        <button type="button" onClick={onRetry}>
          Try another file
        </button>
      </div>
    </div>
  );
}
