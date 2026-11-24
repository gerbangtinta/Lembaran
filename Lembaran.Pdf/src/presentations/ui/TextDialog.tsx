import { useEffect, useRef, useState } from 'react';

export interface TextSubmission {
  text: string;
  size: number;
  align: 'left' | 'center' | 'right';
  color: string;
  /** paint the box's own white patch, so the page beneath does not show through */
  background: boolean;
}

/** New box, an existing box, or a run already in the page that is about to be covered and rewritten. */
export type TextMode = 'new' | 'placed' | 'run';

interface Props {
  mode: TextMode;
  /** the text being edited, when a box or a run was picked; empty for a new one */
  initial: string;
  size: number;
  align: 'left' | 'center' | 'right';
  color: string;
  /** whether the box starts with a white patch; a replacement always has one */
  background: boolean;
  onCancel(): void;
  onSubmit(value: TextSubmission): void;
}

const SIZES = [10, 12, 14, 18, 24, 32];

const HEADINGS: Record<TextMode, string> = {
  new: 'Add text',
  placed: 'Edit the text box',
  run: 'Replace the text in the page',
};

const NOTES: Record<TextMode, string> = {
  new: 'The box lands where you clicked. Drag it afterwards to move it, or a corner to resize it.',
  placed: 'Change the words, the size, the alignment or the colour of this box.',
  run: 'The run is covered, not rewritten: a white patch hides it and the new words are written on top in a standard face, so characters outside Latin-1 become ?.',
};

/** The text window: one field, a size, an alignment and a colour, over the page it belongs to. */
export function TextDialog({ mode, initial, size, align, color, background, onCancel, onSubmit }: Props) {
  const [text, setText] = useState(initial);
  const [currentSize, setCurrentSize] = useState(size);
  const [currentAlign, setCurrentAlign] = useState(align);
  const [currentColor, setCurrentColor] = useState(color);
  const [white, setWhite] = useState(background || mode === 'run');
  const field = useRef<HTMLTextAreaElement>(null);

  const submit = () =>
    onSubmit({ text, size: currentSize, align: currentAlign, color: currentColor, background: white || mode === 'run' });

  // focus once: selecting on every change turned each typed character into a replacement for the whole run
  useEffect(() => {
    field.current?.focus();
    field.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (text.trim().length > 0 || mode === 'run') {
          onSubmit({
            text,
            size: currentSize,
            align: currentAlign,
            color: currentColor,
            background: white || mode === 'run',
          });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentAlign, currentColor, currentSize, mode, onCancel, onSubmit, text, white]);

  // a run's own size may not be one of the offered steps: keep it as a choice instead of silently changing it
  const sizes = SIZES.includes(currentSize) ? SIZES : [...SIZES, currentSize].sort((left, right) => left - right);
  const canSubmit = text.trim().length > 0 || mode === 'run';
  const label = mode === 'placed' ? 'Update' : mode === 'run' ? (text.trim().length > 0 ? 'Replace' : 'Cover it') : 'Place';

  return (
    <div className="pdf-modal" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <div className="pdf-modal-panel" role="dialog" aria-modal="true" aria-label={HEADINGS[mode]}>
        <header className="pdf-modal-head">
          <h2>{HEADINGS[mode]}</h2>
          <button type="button" className="pdf-ghost" onClick={onCancel}>
            Close
          </button>
        </header>

        <p className="pdf-modal-note">{NOTES[mode]}</p>

        <textarea
          ref={field}
          className="pdf-text-input"
          value={text}
          rows={4}
          placeholder={mode === 'run' ? 'Leave empty to only cover the run' : 'Type the text to place on the page'}
          onChange={(event) => setText(event.target.value)}
        />

        <div className="pdf-text-row">
          <label className="pdf-check pdf-check-sub">
            <span>Size</span>
            <select value={currentSize} onChange={(event) => setCurrentSize(Number(event.target.value))}>
              {sizes.map((value) => (
                <option key={value} value={value}>
                  {value} px
                </option>
              ))}
            </select>
          </label>
          <label className="pdf-check pdf-check-sub">
            <span>Align</span>
            <select
              value={currentAlign}
              onChange={(event) => setCurrentAlign(event.target.value as 'left' | 'center' | 'right')}
            >
              <option value="left">Left</option>
              <option value="center">Centre</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label className="pdf-check pdf-check-sub">
            <span>Colour</span>
            <input
              type="color"
              value={currentColor}
              onChange={(event) => setCurrentColor(event.target.value)}
            />
          </label>
          {mode !== 'run' && (
            <label className="pdf-check pdf-check-sub">
              <input type="checkbox" checked={white} onChange={(event) => setWhite(event.target.checked)} />
              White background
            </label>
          )}
        </div>

        <div className="pdf-modal-actions">
          <button type="button" className="pdf-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="pdf-primary" disabled={!canSubmit} onClick={submit}>
            {label}
          </button>
        </div>
      </div>
    </div>
  );
}
