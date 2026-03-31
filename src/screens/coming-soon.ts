// ── Coming Soon Screen ──────────────────────────────────────────────────
// Shown when a non-Claude AI is selected. Click goes back.

import type { Container, AppState, GlassesEvent } from '../types';
import { textContainer, UI } from '../layout';

export function renderComingSoon(state: AppState): Container[] {
  const name = state.selectedAI ?? 'Unknown';
  const displayName = name.charAt(0).toUpperCase() + name.slice(1);

  const content = [
    `${UI.BOX_TL}${UI.BOX_H.repeat(26)}${UI.BOX_TR}`,
    `${UI.BOX_V} ${displayName}`,
    `${UI.BOX_V} Coming Soon`,
    `${UI.BOX_BL}${UI.BOX_H.repeat(26)}${UI.BOX_BR}`,
    '',
    `  ${displayName} support is under`,
    '  development.',
    '',
    UI.SEPARATOR,
    '  Click to go back',
  ].join('\n');

  return [
    textContainer(0, content, {
      x: 0, y: 0, w: 576, h: 288, capture: true,
    }),
  ];
}

export function handleComingSoonEvent(
  event: GlassesEvent,
  _state: AppState
): { state: AppState; transition?: 'welcome' } {
  if (event === 'CLICK_EVENT' || event === 'DOUBLE_CLICK_EVENT') {
    return { state: _state, transition: 'welcome' };
  }
  return { state: _state };
}
