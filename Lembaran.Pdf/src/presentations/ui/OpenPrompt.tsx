interface Props {
  title: string;
  onOpen(): void;
  busy: boolean;
  hint: string;
}

export function OpenPrompt({ title, onOpen, busy, hint }: Props) {
  return (
    <div className="pdf-prompt">
      <div className="pdf-prompt-card">
        <h1>{title}</h1>
        <p>{hint}</p>
        <button type="button" onClick={onOpen} disabled={busy}>
          {busy ? 'Opening…' : 'Open a PDF'}
        </button>
      </div>
    </div>
  );
}
