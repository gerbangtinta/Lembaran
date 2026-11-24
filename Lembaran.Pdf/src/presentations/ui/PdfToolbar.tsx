import type { AnnotateTool, AnnotationColor } from '../../feature/annotate';
import type { FullscreenState } from '@lembaran/ui';
import { Icon, ThemeToggle } from '@lembaran/ui';
import { IconButton } from '../library/IconButton';
import { MenuButton, MenuItem } from './Menu';
import { PageMenu } from './PageMenu';
import { PageSwitch } from './PageSwitch';
import type { EditTool } from '../layout/viewport/EditLayer';

const COLORS: AnnotationColor[] = ['amber', 'green', 'blue', 'rose'];

export interface ToolbarProps {
  page: number;
  numPages: number;
  zoom: number;
  tool: AnnotateTool;
  color: AnnotationColor;
  railOpen: boolean;
  searchOpen: boolean;
  fullscreen: FullscreenState;
  /** the current page can be removed: a document keeps at least one */
  canDelete: boolean;
  /** the record differs from the file: the save button says so without spending a word */
  dirty: boolean;
  editTool: EditTool;
  onEditTool(tool: EditTool): void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo(): void;
  onRedo(): void;
  /** which way the fit button is currently fitting */
  fitMode: 'width' | 'height';
  onToggleFitMode(): void;
  onPlaceImage(): void;
  onPlaceSignature(): void;
  onEditText(): void;
  /** a picture is armed: the next click on the page places it */
  placingRole: 'image' | 'signature' | 'stamp' | null;
  onSave(): void;
  /** the compression window, apart from saving */
  onCompress(): void;
  canOverwrite: boolean;
  onRotate(delta: 90 | -90): void;
  onDeletePage(): void;
  onInsertBlank(): void;
  onGoTo(page: number): void;
  onZoomIn(): void;
  onZoomOut(): void;
  onFit(): void;
  onToggleRail(): void;
  onToggleSearch(): void;
  onToggleAnnotate(): void;
  onColor(color: AnnotationColor): void;
  onOpen(): void;
}

/**
 * The desktop top bar. It holds one control per job — not one per tool — so it stays a single row beside the
 * page rail: the page's own actions behind one menu, the things you place behind another. The pen is the one
 * insert tool that stays visible, because drawing is the move made most often.
 */
export function PdfToolbar(props: ToolbarProps) {
  const inserting = props.editTool === 'text' || props.editTool === 'textEdit' || props.placingRole !== null;
  // anything that takes the next click on the page is armed until the reader says it is finished
  const armed = inserting || props.editTool === 'ink' || props.tool === 'highlight';
  const finishTool = () => {
    props.onEditTool('none');
    if (props.tool === 'highlight') props.onToggleAnnotate();
  };

  return (
    <div className="pdf-topbar" role="toolbar" aria-label="Reader controls">
      <div className="pdf-topbar-lead">
        <IconButton
          icon="rail"
          label={props.railOpen ? 'Hide pages' : 'Show pages'}
          onClick={props.onToggleRail}
          pressed={props.railOpen}
        />
        <IconButton icon="open" label="Open another file" onClick={props.onOpen} />
        <button
          type="button"
          className={`pdf-ib${props.dirty ? ' is-dirty' : ''}`}
          aria-label={props.dirty ? 'Save PDF, edited (Ctrl+S)' : 'Save PDF (Ctrl+S)'}
          title={
            props.dirty
              ? props.canOverwrite
                ? 'Save over the original (Ctrl+S)'
                : 'Save a copy of the edits (Ctrl+S)'
              : 'Save (Ctrl+S)'
          }
          onClick={props.onSave}
        >
          <Icon name="save" />
          {props.dirty && <span className="pdf-dirty-dot" aria-hidden="true" />}
        </button>
        <IconButton icon="compress" label="Compress and save" onClick={props.onCompress} />
        <IconButton icon="undo" label="Undo (Ctrl+Z)" onClick={props.onUndo} disabled={!props.canUndo} />
        <IconButton icon="redo" label="Redo (Ctrl+Y)" onClick={props.onRedo} disabled={!props.canRedo} />
        <PageMenu
          page={props.page}
          canDelete={props.canDelete}
          onRotate={props.onRotate}
          onDelete={props.onDeletePage}
          onInsertBlank={props.onInsertBlank}
        />
      </div>

      {/* the rail carries the page switch under its thumbnails; the bar keeps it only when there is no rail */}
      {!props.railOpen && <PageSwitch page={props.page} numPages={props.numPages} onGoTo={props.onGoTo} />}

      <div className="pdf-seg" aria-label="Zoom">
        <IconButton icon="zoomOut" label="Zoom out" onClick={props.onZoomOut} />
        <span className="pdf-zoom" aria-live="polite">
          {Math.round(props.zoom * 100)}%
        </span>
        <IconButton icon="zoomIn" label="Zoom in" onClick={props.onZoomIn} />
        <IconButton
          icon={props.fitMode === 'width' ? 'fitWidth' : 'fitHeight'}
          label={props.fitMode === 'width' ? 'Fit width (0), click to fit the height' : 'Fit height (0), click to fit the width'}
          onClick={props.onToggleFitMode}
        />
      </div>

      <div className="pdf-topbar-trail">
        <div className="pdf-seg" aria-label="Place">
          <IconButton
            icon="ink"
            label="Draw freehand (D)"
            onClick={() => props.onEditTool(props.editTool === 'ink' ? 'none' : 'ink')}
            pressed={props.editTool === 'ink'}
            active={props.editTool === 'ink'}
          />
          <MenuButton icon="insert" label="Add to the page" active={inserting} align="right">
            <MenuItem
              checked={props.editTool === 'text'}
              onSelect={() => props.onEditTool(props.editTool === 'text' ? 'none' : 'text')}
            >
              Text box
            </MenuItem>
            <MenuItem checked={props.editTool === 'textEdit'} onSelect={props.onEditText}>
              Edit text in the page
            </MenuItem>
            <MenuItem onSelect={props.onPlaceImage}>Picture…</MenuItem>
            <MenuItem onSelect={props.onPlaceSignature}>Signature or stamp…</MenuItem>
          </MenuButton>
        </div>

        <div className={`pdf-seg pdf-annotate${props.tool === 'highlight' ? ' is-live' : ''}`} aria-label="Annotate">
          <IconButton
            icon="annotate"
            label={props.tool === 'highlight' ? 'Stop highlighting' : 'Highlight an area (H)'}
            onClick={props.onToggleAnnotate}
            pressed={props.tool === 'highlight'}
            active={props.tool === 'highlight'}
          />
          {props.tool === 'highlight' && (
            <div className="pdf-palette" role="group" aria-label="Highlight colour">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`pdf-swatch is-${color}${props.color === color ? ' is-on' : ''}`}
                  onClick={() => props.onColor(color)}
                  aria-label={`${color} highlight`}
                  aria-pressed={props.color === color}
                />
              ))}
            </div>
          )}
        </div>

        {armed && (
          <button
            type="button"
            className="pdf-chip pdf-tool-done"
            aria-label="Finish this tool (Enter)"
            title="Finish this tool (Enter)"
            onClick={finishTool}
          >
            Done
          </button>
        )}

        <IconButton
          icon="search"
          label="Find in document (Ctrl+F)"
          onClick={props.onToggleSearch}
          pressed={props.searchOpen}
          active={props.searchOpen}
        />        <ThemeToggle />
        {props.fullscreen.supported && (
          <IconButton
            icon={props.fullscreen.active ? 'exitFullscreen' : 'fullscreen'}
            label={props.fullscreen.active ? 'Exit full screen (F)' : 'Full screen (F)'}
            onClick={props.fullscreen.toggle}
            pressed={props.fullscreen.active}
          />
        )}
      </div>
    </div>
  );
}
