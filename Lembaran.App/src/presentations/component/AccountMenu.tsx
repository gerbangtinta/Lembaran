import { useEffect, useRef, useState } from 'react';
import type { CloudAccount } from '@lembaran/framework';

interface Props {
  account: CloudAccount | null;
  onAddAccount(): void;
  onRemoveAccount(): void;
}

/**
 * The Microsoft account in use, with its own menu. Right-clicking the chip is the quick way — and the `⋯` beside it
 * is the discoverable one, which is also what a keyboard reaches. Both open the same two actions; one account is in
 * use at a time, so "remove" is the sign-out.
 */
export function AccountMenu({ account, onAddAccount, onRemoveAccount }: Props) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const menu = useRef<HTMLDivElement | null>(null);
  const group = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!at) return;
    // `mousedown`, not `click`: closing on the click itself would unmount the item before its own handler runs
    const onDown = (event: MouseEvent | Event) => {
      const target = event.target as Node;
      if (menu.current?.contains(target) || group.current?.contains(target)) return;
      setAt(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAt(null);
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('contextmenu', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onDown, true);
    window.addEventListener('resize', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('contextmenu', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onDown, true);
      window.removeEventListener('resize', onDown);
    };
  }, [at]);

  // keep the menu on screen when it is opened near an edge
  useEffect(() => {
    const box = menu.current;
    if (!box || !at) return;
    const rect = box.getBoundingClientRect();
    const x = Math.min(at.x, window.innerWidth - rect.width - 8);
    const y = Math.min(at.y, window.innerHeight - rect.height - 8);
    if (x !== at.x || y !== at.y) setAt({ x: Math.max(8, x), y: Math.max(8, y) });
  }, [at]);

  const open = (x: number, y: number) => setAt({ x, y });

  return (
    <span className="hub-account" ref={group}>
      <span
        className="hub-flag hub-account-chip"
        title={account?.username ? `${account.username} — right-click for account actions` : undefined}
        role="button"
        tabIndex={account === null ? -1 : 0}
        onContextMenu={(event) => {
          if (account === null) return;
          event.preventDefault();
          open(event.clientX, event.clientY);
        }}
        onKeyDown={(event) => {
          if (account === null) return;
          if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
          event.preventDefault();
          const r = event.currentTarget.getBoundingClientRect();
          open(r.left, r.bottom + 4);
        }}
      >
        {account === null ? 'OneDrive' : `OneDrive · ${account.username}`}
      </span>

      {at !== null && (
        <div className="hub-menu" role="menu" ref={menu} style={{ top: at.y, left: at.x }}>
          <button
            type="button"
            role="menuitem"
            className="hub-menu-item"
            onClick={() => {
              setAt(null);
              onAddAccount();
            }}
          >
            Sign in with another account
          </button>
          <button
            type="button"
            role="menuitem"
            className="hub-menu-item hub-menu-danger"
            onClick={() => {
              setAt(null);
              onRemoveAccount();
            }}
          >
            Remove account and sign out
          </button>
        </div>
      )}
    </span>
  );
}
