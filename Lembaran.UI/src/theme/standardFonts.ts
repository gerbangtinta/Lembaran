/**
 * The families our @font-face layer aliases to open substitutes. A document that asks for one of
 * these should be measured after the substitute is ready, not with whatever the browser had a
 * frame earlier — otherwise Word pagination and canvas text drift.
 */
export const STANDARD_FAMILIES = [
  'Calibri',
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Times',
  'Verdana',
] as const;

const WEIGHTS = ['400 12px', '700 12px', 'italic 400 12px', 'italic 700 12px'] as const;

/**
 * Warms the standard faces. Resolves when every face that can load has loaded; a failure is a
 * missing file, which must degrade to the browser fallback, never reject.
 */
export async function loadStandardFonts(): Promise<void> {
  if (typeof document === 'undefined' || typeof document.fonts?.load !== 'function') return;
  const specs = STANDARD_FAMILIES.flatMap((family) => WEIGHTS.map((weight) => `${weight} "${family}"`));
  await Promise.allSettled(specs.map((spec) => document.fonts.load(spec)));
}
