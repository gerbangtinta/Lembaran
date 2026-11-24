import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from '@lembaran/ui';

interface MenuButtonProps {
  icon: IconName;
  /** the button's accessible name, and the menu's */
  label: string;
  /** something in this menu is on: the button shows it */
  active?: boolean;
  /** open towards the left edge of the button, for menus at the right of the bar */
  align?: 'left' | 'right';
  children: ReactNode;
}

/** A toolbar button that opens a labelled list: the bar keeps one square per family of actions. */
export function MenuButton({ icon, label, active = false, align = 'left', children }: MenuButtonProps) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // the press and the click that dismiss the menu are spent on that: they must not also select the page,
    // open a note or run a tool
    const dismiss = (event: Event) => {
      if (wrap.current?.contains(event.target as Node)) return;
      // the click that dismisses the menu is spent on that: it must not also select the page, open a note or
      // run a tool. Closing on the click (not on the press) means this very event is the one swallowed.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', dismiss, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', dismiss, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`pdf-menu${align === 'right' ? ' is-right' : ''}`} ref={wrap}>
      <button
        type="button"
        className={`pdf-ib${active ? ' is-active' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name={icon} />
      </button>
      {open && (
        <div className="pdf-menu-list" role="menu" aria-label={label} onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  onSelect(): void;
  disabled?: boolean;
  danger?: boolean;
  /** a mode that is currently on */
  checked?: boolean;
  children: ReactNode;
}

export function MenuItem({ onSelect, disabled = false, danger = false, checked, children }: MenuItemProps) {
  return (
    <button
      type="button"
      role={checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
      className={danger ? 'pdf-menu-danger' : undefined}
      aria-checked={checked}
      disabled={disabled}
      // the action takes no arguments: a click event passed as the first one read as a page number
      onClick={() => onSelect()}
    >
      {children}
    </button>
  );
}
