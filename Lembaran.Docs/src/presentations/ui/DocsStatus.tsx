import { StatusBar, StatusHint, StatusName, StatusSeparator } from '@lembaran/ui';
import { pageLabel } from '../../feature/paginate';
import { zoomLabel } from '../../feature/zoom';

interface Props {
  name: string;
  pages: number;
  page: number;
  zoom: number;
}

export function DocsStatus({ name, pages, page, zoom }: Props) {
  return (
    <StatusBar>
      <StatusName title={name}>{name}</StatusName>
      <StatusSeparator />
      <span>{pages === 1 ? '1 page' : `${pages} pages`}</span>
      <StatusSeparator />
      <span>{pageLabel(page, pages)}</span>
      <StatusSeparator />
      <span>{zoomLabel(zoom)}</span>
      <StatusHint>+ − zoom · 0 fit · F full screen</StatusHint>
    </StatusBar>
  );
}
