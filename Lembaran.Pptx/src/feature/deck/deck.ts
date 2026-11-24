import {
  decodePresentationImage,
  initWasm,
  openPresentation,
  paintSlide,
  sizeCanvasForSlide,
  type CanvasImageResolver,
  type PresentationHandle,
} from '@betteroffice/pptx';
// The package's `exports` map hides its own WASM file, so it is imported by path: Vite serves it
// in development and emits a content-hashed asset in the build, which keeps it self-hosted.
import wasmUrl from '../../../../node_modules/@betteroffice/pptx/dist/generated/pptx_wasm_bg.wasm?url';

let ready: Promise<void> | null = null;

/** One WASM instance per page load, however many slides are painted. */
export function ensureWasm(): Promise<void> {
  ready ??= initWasm(wasmUrl);
  return ready;
}

export interface Deck {
  handle: PresentationHandle;
  slides: number;
  /** slide size in CSS pixels, taken from the first laid-out slide */
  width: number;
  height: number;
}

export async function openDeck(bytes: Uint8Array): Promise<Deck> {
  await ensureWasm();
  const handle = openPresentation(bytes);
  const snapshot = handle.snapshot();
  const first = handle.layoutSlide(0);
  return {
    handle,
    slides: snapshot.slides.length,
    width: first.width,
    height: first.height,
  };
}

/** Paints one slide at `scale`, device pixel ratio included. */
export async function paintDeckSlide(
  deck: Deck,
  index: number,
  canvas: HTMLCanvasElement,
  scale: number,
  dpr = window.devicePixelRatio || 1,
): Promise<void> {
  const list = deck.handle.layoutSlide(index);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('this browser cannot paint the slide: no 2d canvas context');
  sizeCanvasForSlide(canvas, list, dpr, scale);
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  await paintSlide(context, list, dpr, scale, { resolveImage: imagesOf(deck) });
}

/** Pictures are decoded from the file's own media parts, so a slide never reaches the network. */
function imagesOf(deck: Deck): CanvasImageResolver {
  const resolver = (async (assetId: string): Promise<CanvasImageSource | null> => {
    try {
      return await decodePresentationImage(deck.handle.mediaBytes(assetId), `image ${assetId}`);
    } catch {
      return null;
    }
  }) as CanvasImageResolver;
  resolver.acquire = () => resolver;
  return resolver;
}
