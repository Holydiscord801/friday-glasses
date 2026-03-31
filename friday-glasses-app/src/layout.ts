// ── Layout constants & helpers ───────────────────────────────────────────
// All values tuned for the G2's 576x288 greyscale display.
// Max 4 containers per page. Text left/top aligned only.

import type { TextContainer, ListContainer, Container } from './types';

// Display dimensions
export const SCREEN_W = 576;
export const SCREEN_H = 288;

// Approximate character capacity per full-screen text container
export const CHARS_PER_PAGE = 450;

// ── Container builders ──────────────────────────────────────────────────

export function textContainer(
  idx: number,
  text: string,
  opts: {
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    capture?: boolean;
    border?: number;
  } = {}
): TextContainer {
  return {
    containerType: 0,
    containerIdx: idx,
    textContent: text.substring(0, 1000), // startup/rebuild limit
    positionX: opts.x ?? 0,
    positionY: opts.y ?? 0,
    width: opts.w ?? SCREEN_W,
    height: opts.h ?? SCREEN_H,
    isEventCapture: opts.capture ? 1 : 0,
    borderWidth: opts.border ?? 0,
  };
}

export function listContainer(
  idx: number,
  items: string[],
  opts: {
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    capture?: boolean;
    border?: number;
  } = {}
): ListContainer {
  // SDK limits: 1-20 items, 64 chars each
  const safeItems = items.slice(0, 20).map(s => s.substring(0, 64));
  return {
    containerType: 1,
    containerIdx: idx,
    listContent: safeItems,
    positionX: opts.x ?? 0,
    positionY: opts.y ?? 0,
    width: opts.w ?? SCREEN_W,
    height: opts.h ?? SCREEN_H,
    isEventCapture: opts.capture ? 1 : 0,
    borderWidth: opts.border ?? 0,
  };
}

// ── Text pagination ─────────────────────────────────────────────────────

export function paginateText(text: string, charsPerPage: number = CHARS_PER_PAGE): string[] {
  const pages: string[] = [];
  const words = text.split(/\s+/);
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length > charsPerPage) {
      if (current) pages.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) pages.push(current);
  return pages.length > 0 ? pages : [''];
}

// ── Unicode UI helpers ──────────────────────────────────────────────────

export const UI = {
  SEPARATOR: '────────────────────────────',
  BULLET: '●',
  BULLET_EMPTY: '○',
  ARROW_RIGHT: '▶',
  ARROW_LEFT: '◀',
  ARROW_UP: '▲',
  ARROW_DOWN: '▼',
  STAR: '★',
  CHECK: '■',
  UNCHECK: '□',
  DOT: '·',
  BAR_FULL: '█',
  BAR_7: '▇',
  BAR_6: '▆',
  BAR_5: '▅',
  BAR_4: '▄',
  BAR_3: '▃',
  BAR_2: '▂',
  BAR_1: '▁',
  BOX_TL: '┌',
  BOX_TR: '┐',
  BOX_BL: '└',
  BOX_BR: '┘',
  BOX_H: '─',
  BOX_V: '│',
} as const;

/** Format a cursor-selected list. `>` prefix on selected item. */
export function cursorList(items: string[], selectedIdx: number): string[] {
  return items.map((item, i) =>
    i === selectedIdx ? `${UI.ARROW_RIGHT} ${item}` : `  ${item}`
  );
}

/** Build a simple progress bar using Unicode blocks */
export function progressBar(current: number, total: number, width: number = 20): string {
  const ratio = Math.max(0, Math.min(1, current / total));
  const filled = Math.round(ratio * width);
  return UI.BAR_FULL.repeat(filled) + UI.BOX_H.repeat(width - filled);
}
