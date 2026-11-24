import type { StampDesign, StampLine } from '../../storage/edits';
import { seededRandom, valueNoise } from './noise';

/** Inks a paper stamp is usually cut in, plus a neutral one for a digital mark. */
export const STAMP_COLOURS = [
  { value: '#b03a2e', name: 'Brick' },
  { value: '#1f5b3a', name: 'Forest' },
  { value: '#1d3f8f', name: 'Navy' },
  { value: '#1b1b1b', name: 'Ink' },
] as const;

/** How clean the impression is. `perfect` is a print, `natural` a hand press, `worn` old rubber. */
export type StampFinish = NonNullable<StampDesign['finish']>;

export const STAMP_FINISHES: { value: StampFinish; name: string }[] = [
  { value: 'perfect', name: 'Perfect' },
  { value: 'natural', name: 'Natural press' },
  { value: 'worn', name: 'Worn rubber' },
];

/** Base text sizes in points: a stamp is a physical thing, so its size is in points, not a share of a page. */
const BASE_SIZE = { sm: 15, md: 19, lg: 25 } as const;
const RELATIVE = { sm: 0.8, md: 1, lg: 1.3 } as const;

const FONT_STACK = `Carlito, 'Liberation Sans', Arial, sans-serif`;

let counter = 0;

export function newStampLine(text = '', bold = false, size: StampLine['size'] = 'md'): StampLine {
  counter += 1;
  return { id: `l${Date.now().toString(36)}${counter}`, text, bold, size };
}

/** The lines a stamp usually needs, left empty so nothing untrue is stamped by accident. */
export function defaultStampDesign(): StampDesign {
  return {
    style: 'paper',
    colour: STAMP_COLOURS[0].value,
    size: 'md',
    uppercase: true,
    border: 'double',
    align: 'center',
    finish: 'natural',
    seed: Math.floor(Math.random() * 0x7fffffff),
    lines: [
      newStampLine('APPROVED', true, 'lg'),
      newStampLine('', true),
      newStampLine(''),
      newStampLine(''),
      newStampLine('', false, 'sm'),
    ],
  };
}

/** Moves a row by `delta` places. A move past either end, or an unknown id, leaves the order alone. */
export function moveStampLine(lines: readonly StampLine[], id: string, delta: number): StampLine[] {
  const from = lines.findIndex((line) => line.id === id);
  const to = from + delta;
  if (from < 0 || delta === 0 || to < 0 || to >= lines.length) return [...lines];
  const next = [...lines];
  const [row] = next.splice(from, 1);
  if (row) next.splice(to, 0, row);
  return next;
}

/** Drops a row where another row sits now — what dragging one row onto another means. */
export function moveStampLineTo(lines: readonly StampLine[], id: string, targetId: string): StampLine[] {
  const from = lines.findIndex((line) => line.id === id);
  const to = lines.findIndex((line) => line.id === targetId);
  if (from < 0 || to < 0 || from === to) return [...lines];
  return moveStampLine(lines, id, to - from);
}

/** A one-line stamp, for the stock words that should not need a design first. */
export function simpleStampDesign(text: string): StampDesign {
  return {
    ...defaultStampDesign(),
    border: 'single',
    lines: [newStampLine(text.toUpperCase(), true, 'lg')],
  };
}

export function stampLabel(design: StampDesign): string {
  const first = design.lines.map((line) => line.text.trim()).find((text) => text.length > 0);
  return (first ?? 'Stamp').slice(0, 28);
}

export interface StampVisualLine {
  text: string;
  bold: boolean;
  /** points */
  size: number;
}

export interface StampLayout {
  lines: StampVisualLine[];
  /** the height of each line's box, in points */
  lineHeights: number[];
  /** space between the frame and the words */
  padding: number;
  /** inset taken by the frame */
  frame: number;
  width: number;
  height: number;
}

export type StampMeasure = (text: string, size: number, bold: boolean) => number;

/**
 * Places the lines and sizes the sheet around them. Empty lines are dropped — a stamp is made of the lines that
 * were filled in, not of the blanks the form offered. Multiline text inside one entry is split as well.
 */
export function stampLayout(design: StampDesign, measure: StampMeasure): StampLayout {
  const base = BASE_SIZE[design.size];
  const lines: StampVisualLine[] = [];
  const lineHeights: number[] = [];
  for (const line of design.lines) {
    const size = Math.max(6, Math.round(base * RELATIVE[line.size] * 10) / 10);
    const text = design.uppercase ? line.text.toUpperCase() : line.text;
    for (const part of text.split('\n')) {
      if (part.trim().length === 0) continue;
      lines.push({ text: part.trimEnd(), bold: line.bold, size });
      lineHeights.push(Math.round(size * 1.34));
    }
  }
  const padding =
    design.style === 'paper'
      ? Math.round(base * 0.85)
      : design.style === 'digital'
        ? Math.round(base * 0.7)
        : Math.round(base * 0.2);
  const frame =
    design.style === 'plain' || design.border === 'none'
      ? 0
      : design.style === 'paper'
        ? Math.round(base * 0.45)
        : Math.round(base * 0.35);
  const widest = lines.reduce((max, line) => Math.max(max, measure(line.text, line.size, line.bold)), 0);
  const inner = lines.reduce((sum, _line, index) => sum + (lineHeights[index] ?? 0), 0);
  const side = padding + frame;
  return {
    lines,
    lineHeights,
    padding,
    frame,
    width: Math.ceil(widest + side * 2),
    height: Math.ceil(inner + side * 2),
  };
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  if (radius > 0 && typeof context.roundRect === 'function') context.roundRect(x, y, width, height, radius);
  else context.rect(x, y, width, height);
}

/** A frame a hand pressed rather than a plotter drew: every corner sits a little off where it should. */
function wobblyRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  wobble: number,
  random: () => number,
): void {
  if (wobble === 0) {
    roundRect(context, x, y, width, height, radius);
    return;
  }
  const j = () => (random() - 0.5) * 1.3 * wobble;
  context.beginPath();
  context.moveTo(x + j(), y + j());
  context.lineTo(x + width + j(), y + j());
  context.lineTo(x + width + j(), y + height + j());
  context.lineTo(x + j(), y + height + j());
  context.closePath();
}

/**
 * One pass of the stamp: the frame, then each row. `wobble` is 0 for a perfect print, so the same function serves
 * every finish — at 0 every offset and corner jitter below is zero.
 */
function drawPass(
  context: CanvasRenderingContext2D,
  layout: StampLayout,
  design: StampDesign,
  ink: string,
  wobble: number,
  alpha: number,
  random: () => number,
): void {
  context.globalAlpha = alpha;
  const radius = design.style === 'digital' ? 8 : 0;
  if (design.style !== 'plain' && design.border !== 'none') {
    context.strokeStyle = ink;
    context.lineWidth = design.style === 'paper' ? 2.2 : 1.2;
    wobblyRect(context, 2, 2, layout.width - 4, layout.height - 4, radius, wobble, random);
    context.stroke();
    if (design.style === 'paper' && design.border === 'double') {
      context.lineWidth = 0.9;
      wobblyRect(context, 6.5, 6.5, layout.width - 13, layout.height - 13, 0, wobble, random);
      context.stroke();
    }
  }

  context.fillStyle = ink;
  context.textBaseline = 'middle';
  context.textAlign = design.align === 'center' ? 'center' : 'left';
  const x = design.align === 'center' ? layout.width / 2 : layout.padding + layout.frame;
  let y = layout.padding + layout.frame;
  layout.lines.forEach((line, index) => {
    const height = layout.lineHeights[index] ?? line.size;
    const dx = wobble === 0 ? 0 : (random() - 0.5) * 1.1 * wobble;
    const dy = wobble === 0 ? 0 : (random() - 0.5) * 0.8 * wobble;
    context.font = `${line.bold ? '700' : '400'} ${line.size}px ${FONT_STACK}`;
    context.fillText(line.text, x + dx, y + height / 2 + dy);
    y += height;
  });
}

/**
 * Uneven ink over whatever was drawn: smooth blotches (value noise) for a press that did not wet the paper evenly,
 * and a little speckle for a worn rubber. Runs on the canvas's own pixels, so it ignores the drawing transform.
 */
function season(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  seed: number,
  strength: number,
  speckle: number,
): void {
  if (width <= 0 || height <= 0) return;
  const image = context.getImageData(0, 0, width, height);
  const data = image.data;
  const blot = valueNoise(seed, 6);
  const random = seededRandom(seed ^ 0x51ed);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3];
      if (!alpha) continue;
      const keep = 1 - strength + strength * blot.at(x / width, y / height);
      data[index + 3] = Math.round(alpha * keep * (random() < speckle ? 0.12 : 1));
    }
  }
  context.putImageData(image, 0, 0);
}

/**
 * Draws the stamp into a canvas at `scale` device pixels per point. The layout's points describe the picture, so
 * a stamp keeps a physical size on the page instead of growing with the canvas resolution.
 *
 * `seed` decides the hand-made marks: the same seed draws the same impression, which keeps a preview still while
 * it is being typed. A placed stamp is drawn from a fresh seed, because no two presses of a rubber stamp match.
 */
export function paintStamp(canvas: HTMLCanvasElement, design: StampDesign, scale = 3, seed = design.seed ?? 1): StampLayout | null {
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) return null;
  const font = (size: number, bold: boolean) => `${bold ? '700' : '400'} ${size}px ${FONT_STACK}`;
  const measure: StampMeasure = (text, size, bold) => {
    probe.font = font(size, bold);
    return probe.measureText(text).width;
  };
  const layout = stampLayout(design, measure);
  if (layout.lines.length === 0) return null;

  const finish: StampFinish = design.finish ?? 'perfect';
  canvas.width = Math.max(1, Math.round(layout.width * scale));
  canvas.height = Math.max(1, Math.round(layout.height * scale));
  // every finish but a perfect print reads its own pixels back to grain them
  const context = canvas.getContext('2d', finish === 'perfect' ? undefined : { willReadFrequently: true });
  if (!context) return null;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.scale(scale, scale);

  const ink = design.style === 'digital' ? '#17251b' : design.colour;
  const random = seededRandom(seed);
  const wobble = finish === 'perfect' ? 0 : finish === 'natural' ? 1 : 1.8;

  context.save();
  if (wobble > 0) {
    // the whole mark sits a fraction of a degree off square, the way a hand leans on a stamp
    context.translate(layout.width / 2, layout.height / 2);
    context.rotate((((random() - 0.5) * 1.5 * wobble) / 180) * Math.PI);
    context.translate(-layout.width / 2, -layout.height / 2);
  }
  const opacity = wobble === 0 ? 1 : 0.84 + random() * 0.16;
  drawPass(context, layout, design, ink, wobble, opacity, random);
  if (wobble > 0) {
    // ink laid twice: a fainter second impression, slightly off the first
    drawPass(context, layout, design, ink, wobble * 1.4, 0.16 * wobble, random);
  }
  context.restore();
  context.globalAlpha = 1;

  if (finish === 'worn') season(context, canvas.width, canvas.height, seed, 0.55, 0.03);
  else if (finish === 'natural') season(context, canvas.width, canvas.height, seed, 0.2, 0.006);
  return layout;
}

export interface RenderedStamp {
  blob: Blob;
  aspect: number;
  /** the stamp's size in points, which is what the page places it at */
  width: number;
  height: number;
}

/** The bytes a placed stamp needs, drawn at 4× so it stays sharp when the page is printed. */
export async function renderStamp(design: StampDesign, fresh = true): Promise<RenderedStamp | null> {
  const canvas = document.createElement('canvas');
  const seed = design.seed ?? 1;
  const layout = paintStamp(canvas, design, 4, fresh ? (seed + Math.floor(Math.random() * 0x7fffffff)) | 0 : seed);
  if (!layout) return null;
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((value) => resolve(value), 'image/png'));
  if (!blob) return null;
  return { blob, aspect: layout.width / layout.height, width: layout.width, height: layout.height };
}
