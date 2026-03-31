// ── Drawer Menu ─────────────────────────────────────────────────────────
// Left-side menu: Chat, Teleprompter, Conversation, Settings
// Scroll to navigate, click to select.
// Double-click to dismiss back to main display.

import type { Container, AppState, AppScreen, GlassesEvent } from '../types';
import { textContainer, listContainer, cursorList, UI } from '../layout';

interface MenuItem {
  label: string;
  screen: AppScreen;
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'Chat',          screen: 'chat' },
  { label: 'Teleprompter',  screen: 'teleprompter' },
  { label: 'Conversation',  screen: 'conversation' },
  { label: 'Settings',      screen: 'settings' },
];

export function renderDrawer(state: AppState): Container[] {
  // Container 0: Header
  const header = textContainer(0,
    `${UI.BOX_V} Friday Menu\n${UI.SEPARATOR}`,
    { x: 0, y: 0, w: 576, h: 55 }
  );

  // Container 1: Menu list with cursor
  const items = cursorList(
    MENU_ITEMS.map(m => m.label),
    state.drawerIndex
  );
  const list = listContainer(1, items, {
    x: 0, y: 60, w: 576, h: 180, capture: true,
  });

  // Container 2: Footer hint
  const footer = textContainer(2,
    `${UI.SEPARATOR}\n  Double-click to close`,
    { x: 0, y: 245, w: 576, h: 43 }
  );

  return [header, list, footer];
}

export function handleDrawerEvent(
  event: GlassesEvent,
  state: AppState
): { state: AppState; transition?: AppScreen } {
  const next = { ...state };

  switch (event) {
    case 'SCROLL_BOTTOM_EVENT':
      next.drawerIndex = Math.min(
        state.drawerIndex + 1,
        MENU_ITEMS.length - 1
      );
      return { state: next };

    case 'SCROLL_TOP_EVENT':
      next.drawerIndex = Math.max(state.drawerIndex - 1, 0);
      return { state: next };

    case 'CLICK_EVENT': {
      const selected = MENU_ITEMS[state.drawerIndex];
      return { state: next, transition: selected.screen };
    }

    case 'DOUBLE_CLICK_EVENT':
      return { state: next, transition: 'main' };

    default:
      return { state: next };
  }
}
