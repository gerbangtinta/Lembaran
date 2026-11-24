/**
 * A reader is almost always drawn inside the hub's frame, which prints the document's name in its own
 * one-line bar above it. A shell asks this before repeating that name a second time.
 */
export function isFramed(): boolean {
  try {
    return window.top !== window.self;
  } catch {
    // a cross-origin parent cannot be inspected, which is itself proof of a frame
    return true;
  }
}
