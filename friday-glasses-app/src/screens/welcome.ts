// ── Welcome Screen ──────────────────────────────────────────────────────
// "Welcome to Even Realities" + AI provider selection list.
// Scroll to navigate, click to select.

import type { Container, AppState, AIProvider, GlassesEvent } from '../types';
import { textContainer, listContainer, cursorList, UI } from '../layout';

const AI_OPTIONS: { label: string; provider: AIProvider }[] = [
  { label: 'Claude (Friday)', provider: 'claude' },
  { label: 'Gemini',          provider: 'gemini' },
  { label: 'ChatGPT',         provider: 'chatgpt' },
  { label: 'OpenClaw',        provider: 'openclaw' },
];

export function renderWelcome(state: AppState): Container[] {
  // Container 0: Title text
  const title = textContainer(0,
    `Welcome to Even Realities\n${UI.SEPARATOR}\nChoose your AI assistant:`,
    { x: 0, y: 0, w: 576, h: 80 }
  );

  // Container 1: AI selection list with cursor
  const items = cursorList(
    AI_OPTIONS.map(o => o.label),
    state.welcomeIndex
  );
  const list = listContainer(1, items, {
    x: 0, y: 85, w: 576, h: 200, capture: true,
  });

  return [title, list];
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

      // Only Claude/Friday is functional in this PoC
      if (selected.provider === 'claude') {
        return { state: next, transition: 'main' };
      }
      return { state: next, transition: 'coming_soon' };
    }

    default:
      return { state: next };
  }
}
