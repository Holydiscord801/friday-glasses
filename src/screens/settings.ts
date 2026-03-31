// ── Settings Screen ────────────────────────────────────────────────────
// App settings: Change AI, wake word, sleep timeout, about.

import type { Container, AppState, AppScreen, GlassesEvent } from '../types';
import { textContainer, listContainer, cursorList, UI } from '../layout';

interface SettingsItem {
  label: string;
  action: 'change_ai' | 'back';
  detail?: (state: AppState) => string;
}

const SETTINGS_ITEMS: SettingsItem[] = [
  { label: 'Change AI', action: 'change_ai' },
  { label: 'Back', action: 'back' },
];

export function renderSettings(state: AppState): Container[] {
  const header = textContainer(0,
    `${UI.BOX_V} Settings\n${UI.SEPARATOR}`,
    { x: 0, y: 0, w: 576, h: 50 }
  );

  const aiName = state.selectedAI
    ? state.selectedAI.charAt(0).toUpperCase() + state.selectedAI.slice(1)
    : 'None';

  const infoLines = [
    `AI: ${aiName}`,
    `Wake Word: "${state.wakeWord}"`,
    `Sleep: ${state.sleepTimeoutMs / 1000}s`,
    '',
    'Friday v0.1.0',
  ].join('\n');

  const info = textContainer(1, infoLines, {
    x: 0, y: 52, w: 576, h: 100, border: 1,
  });

  const items = cursorList(
    SETTINGS_ITEMS.map(s => s.label),
    state.settingsIndex ?? 0
  );
  const list = listContainer(2, items, {
    x: 0, y: 158, w: 576, h: 80, capture: true,
  });

  const footer = textContainer(3,
    `${UI.SEPARATOR}\n  Double-click to go back`,
    { x: 0, y: 245, w: 576, h: 43 }
  );

  return [header, info, list, footer];
}

export function handleSettingsEvent(
  event: GlassesEvent,
  state: AppState
): { state: AppState; transition?: AppScreen } {
  const next = { ...state };
  const idx = state.settingsIndex ?? 0;

  switch (event) {
    case 'SCROLL_BOTTOM_EVENT':
      next.settingsIndex = Math.min(idx + 1, SETTINGS_ITEMS.length - 1);
      return { state: next };

    case 'SCROLL_TOP_EVENT':
      next.settingsIndex = Math.max(idx - 1, 0);
      return { state: next };

    case 'CLICK_EVENT': {
      const selected = SETTINGS_ITEMS[idx];
      if (selected.action === 'change_ai') {
        next.selectedAI = null;
        next.welcomeIndex = 0;
        return { state: next, transition: 'welcome' };
      }
      if (selected.action === 'back') {
        return { state: next, transition: 'drawer' };
      }
      return { state: next };
    }

    case 'DOUBLE_CLICK_EVENT':
      return { state: next, transition: 'drawer' };

    default:
      return { state: next };
  }
}
