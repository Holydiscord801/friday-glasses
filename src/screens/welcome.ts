// ── Welcome Screen ──────────────────────────────────────────────────────
// AI provider selection with polished layout.

import type { Container, AppState, AIProvider, GlassesEvent } from '../types';
import { textContainer, listContainer, cursorList, UI } from '../layout';

const AI_OPTIONS: { label: string; provider: AIProvider }[] = [
  { label: 'Claude (Friday)', provider: 'claude' },
  { label: 'Gemini',          provider: 'gemini' },
  { label: 'ChatGPT',         provider: 'chatgpt' },
  { label: 'OpenClaw',        provider: 'openclaw' },
];

export function renderWelcome(state: AppState): Container[] {
  // Container 0: Header with box frame
  const header = [
    `${UI.BOX_TL}${UI.BOX_H.repeat(30)}${UI.BOX_TR}`,
    `${UI.BOX_V} Even Realities`,
    `${UI.BOX_V} Choose your AI:`,
    `${UI.BOX_BL}${UI.BOX_H.repeat(30)}${UI.BOX_BR}`,
  ].join('\n');

  const title = textContainer(0, header, {
    x: 0, y: 0, w: 576, h: 90,
  });

  // Container 1: AI selection list with cursor
  const items = cursorList(
    AI_OPTIONS.map(o => o.label),
    state.welcomeIndex
  );
  const list = listContainer(1, items, {
    x: 0, y: 95, w: 576, h: 150, capture: true,
  });

  // Container 2: Footer hint
  const footer = textContainer(2,
    `${UI.SEPARATOR}\n  Scroll: browse  ${UI.BOX_V}  Click: select`,
    { x: 0, y: 250, w: 576, h: 38 }
  );

  return [title, list, footer];
}

export function handleWelcomeEvent(
  event: GlassesEvent,
  state: AppState
): { state: AppState; transition?: 'main' | 'coming_soon' } {
  const next = { ...state };

  switch (event) {
    case 'SCROLL_BOTTOM_EVENT':
      next.welcomeIndex = Math.min(
        state.welcomeIndex + 1,
        AI_OPTIONS.length - 1
      );
      return { state: next };

    case 'SCROLL_TOP_EVENT':
      next.welcomeIndex = Math.max(state.welcomeIndex - 1, 0);
      return { state: next };

    case 'CLICK_EVENT': {
      const selected = AI_OPTIONS[state.welcomeIndex];
      next.selectedAI = selected.provider;
      if (selected.provider === 'claude') {
        return { state: next, transition: 'main' };
      }
      return { state: next, transition: 'coming_soon' };
    }

    default:
      return { state: next };
  }
}
