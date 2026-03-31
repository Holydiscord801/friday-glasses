// ── Teleprompter Mode ───────────────────────────────────────────────────
// Scrollable presentation notes. Swipe/click pages. Double-click exits.

import type { Container, AppState, GlassesEvent } from '../types';
import { textContainer, paginateText, progressBar, UI, CHARS_PER_PAGE } from '../layout';

const DEMO_TEXT = `Good morning everyone. Thank you for joining today's presentation on the future of AI-integrated wearable displays.

The key insight driving our work is that smart glasses should not be another app platform. Instead, they should serve as an AI-agnostic display layer.

What does this mean in practice? The user puts on their glasses, selects their preferred AI assistant, and the glasses become a transparent interface between the user and their AI.

The AI already knows your calendar, your email, your relationships, your context through persistent memory. The glasses simply display what the AI surfaces. There is nothing to operate, no apps to launch, no menus to navigate.

This is fundamentally different from the current approach where each app must be built specifically for the glasses display constraints.

Consider the precedent: Apple proved this model works by opening Siri to any AI provider. We are proposing the same paradigm shift for smart glasses.

Our proof of concept demonstrates four key modes: direct chat with your AI, teleprompter for presentations, conversation awareness with real-time context, and a minimalistic always-available status display.

Thank you. I am happy to take questions.`;

export function initTeleprompterState(state: AppState): AppState {
  const pages = paginateText(DEMO_TEXT, CHARS_PER_PAGE - 80);
  return {
    ...state,
    teleprompterText: DEMO_TEXT,
    teleprompterPages: pages,
    teleprompterPage: 0,
  };
}

export function renderTeleprompter(state: AppState): Container[] {
  const pages = state.teleprompterPages;
  const page = state.teleprompterPage;
  const total = pages.length;
  const text = pages[page] ?? '';

  // Container 0: Header
  const header = textContainer(0,
    `${UI.BOX_V} Teleprompter  ${page + 1}/${total}\n${UI.SEPARATOR}`,
    { x: 0, y: 0, w: 576, h: 45 }
  );

  // Container 1: Text body (captures events)
  const body = textContainer(1, text, {
    x: 0, y: 48, w: 576, h: 195, capture: true,
  });

  // Container 2: Progress + hint
  const bar = progressBar(page + 1, total, 24);
  const footer = textContainer(2,
    `${bar}\n  Swipe: page  ${UI.BOX_V}  ${UI.BULLET}${UI.BULLET} exit`,
    { x: 0, y: 248, w: 576, h: 40 }
  );

  return [header, body, footer];
}

export function handleTeleprompterEvent(
  event: GlassesEvent,
  state: AppState
): { state: AppState; transition?: 'main' } {
  const next = { ...state };
  const maxPage = state.teleprompterPages.length - 1;

  switch (event) {
    case 'SCROLL_BOTTOM_EVENT':
      next.teleprompterPage = Math.min(state.teleprompterPage + 1, maxPage);
      return { state: next };

    case 'SCROLL_TOP_EVENT':
      next.teleprompterPage = Math.max(state.teleprompterPage - 1, 0);
      return { state: next };

    case 'DOUBLE_CLICK_EVENT':
      return { state: next, transition: 'main' };

    case 'CLICK_EVENT':
      next.teleprompterPage = Math.min(state.teleprompterPage + 1, maxPage);
      return { state: next };

    default:
      return { state: next };
  }
}
