// ── Main Display ────────────────────────────────────────────────────────
// Always-on minimalistic view: time, date, connected AI status.
// CLICK opens the drawer menu.

import type { Container, AppState, GlassesEvent } from '../types';
import { textContainer, UI } from '../layout';

function formatTime(): string {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function formatDate(): string {
  const now = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
}

function aiDisplayName(ai: string | null): string {
  switch (ai) {
    case 'claude': return 'Friday (Claude)';
    case 'gemini': return 'Gemini';
    case 'chatgpt': return 'ChatGPT';
    case 'openclaw': return 'OpenClaw';
    default: return 'Not connected';
  }
}

export function renderMainDisplay(state: AppState): Container[] {
  // Container 0: Time display (large, top area)
  const timeText = textContainer(0,
    `\n    ${formatTime()}`,
    { x: 0, y: 0, w: 576, h: 100 }
  );

  // Container 1: Date display
  const dateText = textContainer(1,
    `    ${formatDate()}`,
    { x: 0, y: 100, w: 576, h: 50 }
  );

  // Container 2: AI status + hint (captures events)
  const statusContent = [
    UI.SEPARATOR,
    `${UI.BULLET} ${aiDisplayName(state.selectedAI)}`,
    '',
    '  Click to open menu',
  ].join('\n');

  const statusText = textContainer(2, statusContent, {
    x: 0, y: 155, w: 576, h: 130, capture: true,
  });

  return [timeText, dateText, statusText];
}

/** Returns the time string for live update via textContainerUpgrade */
export function getTimeUpdateText(): string {
  return `\n    ${formatTime()}`;
}

export function getDateUpdateText(): string {
  return `    ${formatDate()}`;
}

export function handleMainDisplayEvent(
  event: GlassesEvent,
  state: AppState
): { state: AppState; transition?: 'drawer' | 'sleep' } {
  if (event === 'CLICK_EVENT') {
    return { state: { ...state, drawerIndex: 0 }, transition: 'drawer' };
  }
  if (event === 'DOUBLE_CLICK_EVENT') {
    // Double-tap puts glasses back to sleep
    return { state, transition: 'sleep' };
  }
  return { state };
}
