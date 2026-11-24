import type { SearchState } from '../../feature/search';
import { SearchBox } from './SearchBox';

interface Props {
  search: SearchState;
  onHit(page: number): void;
  onClose(): void;
}

/** Find lives in a panel, not in the toolbar: a reader should look like a reader. */
export function SearchPanel({ search, onHit, onClose }: Props) {
  return (
    <div className="pdf-searchpanel" role="search">
      <SearchBox search={search} onHit={onHit} />
      <button type="button" className="pdf-ib" onClick={onClose} aria-label="Close find">
        ✕
      </button>
    </div>
  );
}
