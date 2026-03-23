import { useSyncExternalStore, useCallback, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router';
import { useGlasses } from 'even-toolkit/useGlasses';
import type { GlassAction, GlassNavState } from 'even-toolkit/types';
import { line, separator } from 'even-toolkit/types';
import { paginateText, pageIndicator } from 'even-toolkit/paginate-text';
import { NavBar } from 'even-toolkit/web/nav-bar';
import { Page } from 'even-toolkit/web/page';
import {
  getState,
  subscribe,
  getSnapshot,
  setPage,
  scrollTeleprompter,
  clearTeleprompter,
  toggleMic,
  clearConversation,
  startPolling,
  stopPolling,
} from './store';
import type { AppState, PageName } from './types';
import type { DisplayData } from 'even-toolkit/types';
import { GlassesPreview } from './components/GlassesPreview';
import { ConversationPage } from './pages/ConversationPage';
import './App.css';

// ── Nav items ──

const NAV_ITEMS = [
  { id: 'home', label: 'Home' },
  { id: 'teleprompter', label: 'Teleprompter' },
  { id: 'conversation', label: 'Chat' },
  { id: 'notes', label: 'Notes' },
  { id: 'contact', label: 'Contact' },
  { id: 'settings', label: 'Settings' },
];

// Screens navigable from the home menu on glasses
const HOME_MENU = ['conversation', 'teleprompter', 'notes', 'contact', 'settings'] as const;

// ── Helpers ──

function deriveScreen(path: string): string {
  if (path === '/') return 'home';
  if (path === '/teleprompter') return 'teleprompter';
  if (path === '/conversation') return 'conversation';
  if (path.startsWith('/notes/')) return 'note-detail';
  if (path === '/notes') return 'notes';
  if (path === '/contact') return 'contact';
  if (path === '/settings') return 'settings';
  return 'home';
}

function screenToPath(screen: string): string {
  switch (screen) {
    case 'home':
      return '/';
    case 'teleprompter':
      return '/teleprompter';
    case 'conversation':
      return '/conversation';
    case 'notes':
      return '/notes';
    case 'contact':
      return '/contact';
    case 'settings':
      return '/settings';
    default:
      return '/';
  }
}

function pageNameFromScreen(screen: string): PageName {
  if (screen === 'note-detail') return 'note-detail';
  const valid: PageName[] = ['home', 'teleprompter', 'conversation', 'notes', 'contact', 'settings'];
  return valid.includes(screen as PageName) ? (screen as PageName) : 'home';
}

// ── Build glasses DisplayData from app state ──

function toDisplayData(snapshot: AppState, nav: GlassNavState): DisplayData {
  const screen = nav.screen;

  switch (screen) {
    case 'home': {
      const time = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const battery = `${snapshot.glasses.battery}%`;
      const status = snapshot.glasses.connected ? 'CONNECTED' : 'DISCONNECTED';
      const menuLines = HOME_MENU.map((item, i) => {
        const label = item.charAt(0).toUpperCase() + item.slice(1);
        return line(`  ${label}`, 'normal', i === nav.highlightedIndex);
      });
      return {
        lines: [
          line('  FRIDAY AI'),
          line(`  ${time}  \u25A0 ${battery}  ${status}`, 'meta'),
          separator(),
          ...menuLines,
        ],
      };
    }

    case 'teleprompter': {
      if (!snapshot.teleprompter.content) {
        return {
          lines: [
            line(''),
            line('  No teleprompter content.'),
            line('  Push via API or type below.'),
          ],
        };
      }
      const pages = paginateText(snapshot.teleprompter.content, 46, 9);
      const pageIdx = Math.min(
        Math.max(0, nav.highlightedIndex),
        Math.max(0, pages.length - 1),
      );
      const currentPage = pages[pageIdx] || [];
      const indicator = pageIndicator(pageIdx, pages.length);
      return {
        lines: [
          ...currentPage.map((l) => line(`  ${l}`)),
          line(''),
          line(`                    ${indicator}`, 'meta'),
        ],
      };
    }

    case 'conversation': {
      const entries = snapshot.conversation.entries;
      if (entries.length === 0) {
        const micLabel = snapshot.conversation.micOn ? 'MIC ON' : 'MIC OFF';
        return {
          lines: [
            line('  FRIDAY CONVERSATION'),
            separator(),
            line(''),
            line('  Tap R1 to start talking.'),
            line('  Friday is listening.'),
            line(''),
            line(`  ${micLabel}`, 'meta'),
          ],
        };
      }
      const recent = entries.slice(-6);
      const displayLines: DisplayData['lines'] = [
        line('  CONVERSATION'),
        separator(),
      ];
      for (const entry of recent) {
        if (entry.role === 'user') {
          displayLines.push(line(`  \u25B6 User: ${entry.text}`));
        } else {
          displayLines.push(line(`  \u25C0 Friday: ${entry.text}`));
        }
        displayLines.push(separator());
      }
      if (snapshot.conversation.isProcessing) {
        displayLines.push(line('  Thinking...', 'meta'));
      }
      return { lines: displayLines };
    }

    case 'notes': {
      if (snapshot.notes.length === 0) {
        return {
          lines: [
            line('  NOTES'),
            separator(),
            line(''),
            line('  No notes yet.'),
            line('  Friday can add notes via API.'),
          ],
        };
      }
      const highlighted = nav.highlightedIndex;
      const displayLines: DisplayData['lines'] = [
        line('  NOTES'),
        separator(),
      ];
      snapshot.notes.forEach((note, i) => {
        const isHighlighted = i === highlighted;
        displayLines.push(line(`  ${note.title}`, 'normal', isHighlighted));
      });
      return { lines: displayLines };
    }

    case 'note-detail': {
      // Find the note — highlightedIndex from the notes list, stored in the nav
      const noteIdx = Math.min(
        Math.max(0, nav.highlightedIndex),
        Math.max(0, snapshot.notes.length - 1),
      );
      const note = snapshot.notes[noteIdx];
      if (!note) {
        return { lines: [line('  Note not found.')] };
      }
      const pages = paginateText(note.content, 46, 8);
      const pageIdx = Math.min(
        Math.max(0, nav.highlightedIndex),
        Math.max(0, pages.length - 1),
      );
      const currentPage = pages[pageIdx] || [];
      return {
        lines: [
          line(`  ${note.title}`, 'normal', true),
          separator(),
          ...currentPage.map((l) => line(`  ${l}`)),
          line(''),
          line(
            `                    ${pageIndicator(pageIdx, pages.length)}`,
            'meta',
          ),
        ],
      };
    }

    case 'contact': {
      const c = snapshot.contact;
      if (!c) {
        return {
          lines: [
            line('  CONTACT'),
            separator(),
            line(''),
            line('  No contact card.'),
            line('  Push via POST /api/contact'),
          ],
        };
      }
      return {
        lines: [
          line(`  ${c.name}`, 'normal', true),
          line(`  ${c.title}`, 'meta'),
          line(`  ${c.company}`, 'meta'),
          separator(),
          line(`  ${c.context}`),
          line(''),
          ...c.talking_points.map((tp) => line(`  \u2022 ${tp}`)),
        ],
      };
    }

    case 'settings': {
      return {
        lines: [
          line('  SETTINGS'),
          separator(),
          line(`  Font Size: ${snapshot.settings.fontSize}`),
          line(`  Scroll Speed: ${snapshot.settings.scrollSpeed}x`),
          line(`  Dark Mode: ${snapshot.settings.darkMode ? 'ON' : 'OFF'}`),
          line(
            `  Show Battery: ${snapshot.settings.showBattery ? 'ON' : 'OFF'}`,
          ),
        ],
      };
    }

    default:
      return { lines: [line('  FRIDAY AI')] };
  }
}

// ── Placeholder page components ──

function HomePage() {
  const state = useSyncExternalStore(subscribe, getState);
  return (
    <Page>
      <div style={{ padding: '16px 0' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8 }}>
          Friday AI
        </h2>
        <p style={{ color: 'var(--color-text-dim)', marginBottom: 16 }}>
          {state.glasses.connected
            ? 'Glasses connected'
            : 'Glasses not connected'}{' '}
          &middot; Battery {state.glasses.battery}%
        </p>
        <GlassesPreview />
      </div>
    </Page>
  );
}

function TeleprompterPage() {
  return (
    <Page>
      <div style={{ padding: '16px 0' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8 }}>
          Teleprompter
        </h2>
        <GlassesPreview />
      </div>
    </Page>
  );
}

function NotesPage() {
  return (
    <Page>
      <div style={{ padding: '16px 0' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8 }}>
          Notes
        </h2>
        <GlassesPreview />
      </div>
    </Page>
  );
}

function NoteDetailPage() {
  return (
    <Page>
      <div style={{ padding: '16px 0' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8 }}>
          Note Detail
        </h2>
        <GlassesPreview />
      </div>
    </Page>
  );
}

function ContactPage() {
  return (
    <Page>
      <div style={{ padding: '16px 0' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8 }}>
          Contact
        </h2>
        <GlassesPreview />
      </div>
    </Page>
  );
}

function SettingsPage() {
  return (
    <Page>
      <div style={{ padding: '16px 0' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8 }}>
          Settings
        </h2>
        <GlassesPreview />
      </div>
    </Page>
  );
}

// ── Main App ──

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = useSyncExternalStore(subscribe, getState);

  // Keep store's currentPage in sync with the URL
  const currentScreen = deriveScreen(location.pathname);
  const currentPage = pageNameFromScreen(currentScreen);
  useEffect(() => {
    if (state.currentPage !== currentPage) {
      setPage(currentPage);
    }
  }, [currentPage, state.currentPage]);

  // Start remote polling on mount
  useEffect(() => {
    startPolling(2000);
    return () => stopPolling();
  }, []);

  // ── Glass action handler ──
  const onGlassAction = useCallback(
    (
      action: GlassAction,
      nav: GlassNavState,
      snapshot: AppState,
    ): GlassNavState => {
      const screen = nav.screen;

      switch (action.type) {
        case 'HIGHLIGHT_MOVE': {
          const dir = action.direction;

          if (screen === 'home') {
            const maxIdx = HOME_MENU.length - 1;
            const next =
              dir === 'down'
                ? Math.min(nav.highlightedIndex + 1, maxIdx)
                : Math.max(nav.highlightedIndex - 1, 0);
            return { ...nav, highlightedIndex: next };
          }

          if (screen === 'teleprompter') {
            scrollTeleprompter(dir);
            const pages = paginateText(
              snapshot.teleprompter.content || '',
              46,
              9,
            );
            const maxPage = Math.max(0, pages.length - 1);
            const next =
              dir === 'down'
                ? Math.min(nav.highlightedIndex + 1, maxPage)
                : Math.max(nav.highlightedIndex - 1, 0);
            return { ...nav, highlightedIndex: next };
          }

          if (screen === 'notes') {
            const maxIdx = Math.max(0, snapshot.notes.length - 1);
            const next =
              dir === 'down'
                ? Math.min(nav.highlightedIndex + 1, maxIdx)
                : Math.max(nav.highlightedIndex - 1, 0);
            return { ...nav, highlightedIndex: next };
          }

          if (screen === 'note-detail') {
            const noteIdx = Math.min(
              nav.highlightedIndex,
              snapshot.notes.length - 1,
            );
            const note = snapshot.notes[noteIdx];
            if (note) {
              const pages = paginateText(note.content, 46, 8);
              const maxPage = Math.max(0, pages.length - 1);
              const next =
                dir === 'down'
                  ? Math.min(nav.highlightedIndex + 1, maxPage)
                  : Math.max(nav.highlightedIndex - 1, 0);
              return { ...nav, highlightedIndex: next };
            }
            return nav;
          }

          // conversation and others — no index movement needed
          return nav;
        }

        case 'SELECT_HIGHLIGHTED': {
          if (screen === 'home') {
            const target = HOME_MENU[nav.highlightedIndex];
            if (target) {
              navigate(screenToPath(target));
              return { ...nav, screen: target, highlightedIndex: 0 };
            }
            return nav;
          }

          if (screen === 'conversation') {
            toggleMic();
            return nav;
          }

          if (screen === 'notes') {
            const note = snapshot.notes[nav.highlightedIndex];
            if (note) {
              navigate(`/notes/${note.id}`);
              return { ...nav, screen: 'note-detail', highlightedIndex: 0 };
            }
            return nav;
          }

          return nav;
        }

        case 'GO_BACK': {
          if (screen === 'teleprompter') {
            clearTeleprompter();
            return { ...nav, highlightedIndex: 0 };
          }

          if (screen === 'conversation') {
            clearConversation();
            return nav;
          }

          if (screen === 'notes') {
            navigate('/');
            return { ...nav, screen: 'home', highlightedIndex: 0 };
          }

          if (screen === 'note-detail') {
            navigate('/notes');
            return { ...nav, screen: 'notes', highlightedIndex: 0 };
          }

          if (screen === 'contact') {
            navigate('/');
            return { ...nav, screen: 'home', highlightedIndex: 0 };
          }

          if (screen === 'settings') {
            navigate('/');
            return { ...nav, screen: 'home', highlightedIndex: 0 };
          }

          return nav;
        }

        default:
          return nav;
      }
    },
    [navigate],
  );

  // ── useGlasses integration ──
  useGlasses<AppState>({
    getSnapshot,
    appName: 'Friday',
    deriveScreen,
    toDisplayData,
    onGlassAction,
  });

  // ── Nav handling ──
  const activeNavId = (() => {
    if (location.pathname === '/') return 'home';
    if (location.pathname === '/teleprompter') return 'teleprompter';
    if (location.pathname === '/conversation') return 'conversation';
    if (location.pathname.startsWith('/notes')) return 'notes';
    if (location.pathname === '/contact') return 'contact';
    if (location.pathname === '/settings') return 'settings';
    return 'home';
  })();

  const handleNavigate = useCallback(
    (id: string) => {
      const path = screenToPath(id);
      navigate(path);
    },
    [navigate],
  );

  return (
    <div className="app-shell">
      <div className="app-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/teleprompter" element={<TeleprompterPage />} />
          <Route path="/conversation" element={<ConversationPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/:id" element={<NoteDetailPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
      <div className="app-nav">
        <NavBar
          items={NAV_ITEMS}
          activeId={activeNavId}
          onNavigate={handleNavigate}
        />
      </div>
    </div>
  );
}

export default App;
