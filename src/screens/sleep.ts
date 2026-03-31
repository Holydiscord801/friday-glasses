// ── Sleep State ──────────────────────────────────────────────────────────
// Default state: display is dark/blank.
// Wake via double-tap (DOUBLE_CLICK_EVENT) or wake word detection.
// The sleep screen sends an empty/minimal page to keep the display dark.

import type { Container, AppState, GlassesEvent } from '../types';
import { textContainer } from '../layout';

// We send a single empty text container to keep the display blank.
// The Even Hub SDK requires at least one container to be active.
export function renderSleep(_state: AppState): Container[] {
  return [
    textContainer(0, '', {
      x: 0, y: 0, w: 576, h: 288, capture: true,
    }),
  ];
}

export function handleSleepEvent(
  event: GlassesEvent,
  state: AppState
): { state: AppState; transition?: 'welcome' | 'main' } {
  // Double-tap wakes the display
  if (event === 'DOUBLE_CLICK_EVENT') {
    // If AI already selected, go to main. Otherwise go to welcome.
    if (state.selectedAI) {
      return { state, transition: 'main' };
    }
    return { state, transition: 'welcome' };
  }

  return { state };
}
