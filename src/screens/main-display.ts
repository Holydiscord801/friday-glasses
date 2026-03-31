// ── Main Display ────────────────────────────────────────────────────────
// G2-style dashboard: time + date on left, AI status widget on right.
// Click opens drawer. Double-click sleeps.
//
// Gesture mapping (current SDK limitations):
//   CLICK_EVENT        → Open drawer menu (simulates long-press on real G2)
//   DOUBLE_CLICK_EVENT → Sleep / dismiss
//   SCROLL_TOP/BOTTOM  → (reserved for future widget cycling)
//
// Ideal mapping (if SDK adds long-press support):
//   Long-press (hold)  → Open drawer menu (matches real G2 behavior)
//   CLICK_EVENT        → Cycle right-side widget
//   DOUBLE_CLICK_EVENT → Sleep / dismiss
//   SCROLL_TOP/BOTTOM  → Scroll within active widget

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
    case 'claude': return 'Claude (Friday)';
    case 'gemini': return 'Gemini';
    case 'chatgpt': return 'ChatGPT';
    case 'openclaw': return 'OpenClaw';
    default: return 'Not connected';
  }
}

export function renderMainDisplay(state: AppState): Container[] {
  // Container 0: Time + date (left side)
  const timeDate = [
    '',
    `  ${formatTime()}`,
    '',
    `  ${formatDate()}`,
  ].join('\n');

  const timeContainer = textContainer(0, timeDate, {
    x: 8, y: 8, w: 270, h: 140,
  });

  // Container 1: AI status widget (right side)
  const aiStatus = [
    `${UI.BOX_TL}${UI.BOX_H.repeat(22)}${UI.BOX_TR}`,
    `${UI.BOX_V} ${UI.BULLET} ${aiDisplayName(state.selectedAI)}`,
    `${UI.BOX_V}   Connected`,
    `${UI.BOX_V}`,
    `${UI.BOX_BL}${UI.BOX_H.repeat(22)}${UI.BOX_BR}`,
  ].join('\n');

  const statusWidget = textContainer(1, aiStatus, {
    x: 290, y: 8, w: 278, h: 140,
  });

  // Container 2: Bottom bar with navigation hints (captures events)
  const bottomBar = [
    UI.SEPARATOR,
    `  Click: menu  ${UI.BOX_V}  ${UI.BULLET}${UI.BULLET} sleep`,
  ].join('\n');

  const navHint = textContainer(2, bottomBar, {
    x: 0, y: 158, w: 576, h: 128, capture: true,
  });

  return [timeContainer, statusWidget, navHint];
}

/** Returns the time string for live update via textContainerUpgrade */
export function getTimeUpdateText(): string {
  const timeDate = [
    '',
    `  ${formatTime()}`,
    '',
    `  ${formatDate()}`,
  ].join('\n');
  return timeDate;
}

export function getDateUpdateText(): string {
  return `  ${formatDate()}`;
}

export function handleMainDisplayEvent(
  event: GlassesEvent,
  state: AppState
): { state: AppState; transition?: 'drawer' | 'sleep' } {
  if (event === 'CLICK_EVENT') {
    return { state: { ...state, drawerIndex: 0 }, transition: 'drawer' };
  }
  if (event === 'DOUBLE_CLICK_EVENT') {
    return { state, transition: 'sleep' };
  }
  return { state };
}
