import { useState } from 'react';

interface Props {
  onClear(): void;
}

/**
 * "Clear" for the recents, with the one confirmation that matters: this also reclaims the copies Lembaran stored
 * on this device so a reload could not lose a document. The originals — a folder on disk, a file in a drive — are
 * never touched by it, which the label says so nobody has to guess.
 */
export function ClearRecents({ onClear }: Props) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        className="hub-account-action"
        onClick={() => setConfirming(true)}
        title="Forget every recent and delete the copies Lembaran stored on this device"
      >
        Clear
      </button>
    );
  }

  return (
    <span className="hub-confirm" role="group" aria-label="Clear the list?">
      <span>Clear the copies too?</span>
      <button
        type="button"
        className="hub-confirm-yes"
        onClick={() => {
          setConfirming(false);
          onClear();
        }}
      >
        Clear
      </button>
      <button type="button" className="lb-ghost" onClick={() => setConfirming(false)}>
        Cancel
      </button>
    </span>
  );
}
