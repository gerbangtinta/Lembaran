import { MenuButton, MenuItem } from './Menu';

interface Props {
  /** 1-based display position, for the label */
  page: number;
  /** false when the document has a single page: there is nothing left to read */
  canDelete: boolean;
  onRotate(delta: 90 | -90): void;
  onDelete(): void;
  onInsertBlank(): void;
}

/**
 * The page menu: everything that changes the page itself rather than its contents. Rotation shows at once,
 * the other two change the numbering, so the menu closes on use and the reader keeps the page it was on.
 */
export function PageMenu({ page, canDelete, onRotate, onDelete, onInsertBlank }: Props) {
  return (
    <MenuButton icon="pages" label={`Page ${page} actions`}>
      <MenuItem onSelect={() => onRotate(-90)}>Rotate left</MenuItem>
      <MenuItem onSelect={() => onRotate(90)}>Rotate right</MenuItem>
      <MenuItem onSelect={onInsertBlank}>Insert blank after</MenuItem>
      <MenuItem onSelect={onDelete} danger disabled={!canDelete}>
        Delete page
      </MenuItem>
    </MenuButton>
  );
}
