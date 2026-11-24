import type { ReactNode } from 'react';
import { Icon, type IconName } from '@lembaran/ui';

interface Props {
  icon: IconName;
  label: string;
  onClick?(): void;
  disabled?: boolean;
  pressed?: boolean;
  active?: boolean;
  children?: ReactNode;
}

/** Icon-only control. The label is the tooltip and the accessible name. */
export function IconButton({ icon, label, onClick, disabled, pressed, active, children }: Props) {
  return (
    <button
      type="button"
      className={`pdf-ib${active ? ' is-active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={label}
      title={label}
    >
      {children ?? <Icon name={icon} />}
    </button>
  );
}
