import { useCallback, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router';
import { useSyncExternalStore } from 'react';
import { useGlasses } from 'even-toolkit/useGlasses';
import type { GlassAction, GlassNavState } from 'even-toolkit/types';
import { paginateText } from 'even-toolkit/paginate-text';
import { cleanForG2 } from 'even-toolkit/text-clean';
import { activateKeepAlive, deactivateKeepAlive } from 'even-toolkit/keep-alive';
import {
  getSnapshot, subscribe, getState, setPage,
  toggleMic, clearConversation, setConversationScroll,
  updateSettings, setFlash, setViewingNote,
  startPolling, stopPolling,
} from './store';
import type { AppState, PageName } from './types';
import {
  toDisplayData, HOME_MENU, CONTENT_LINES, SETTINGS_LABELS,
  buildConversationLines, buildContactLines,
} from './glasses-display';
import { HomePage } from './pages/HomePage';
import { ConversationPage } from './pages/ConversationPage';
import { TeleprompterPage } from './pages/TeleprompterPage';
import { NotesPage } from './pages/NotesPage';
import { NoteDetailPage } from './pages/NoteDetailPage';
import { ContactPage } from './pages/ContactPage';
import { SettingsPage } from './pages/SettingsPage';
import './App.css';

// ── Routing helpers ──

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
    case 'home': return '/';
    case 'teleprompter': return '/teleprompter';
    case 'conversation': return '/conversation';
    case 'notes': return '/notes';
    case 'contact': return '/contact';
    case 'settings': return '/settings';
    default: return '/';
  }
}

function pageNameFromScreen(screen: string): PageName {
  if (screen === 'note-detail') return 'note-detail';
  const valid: PageName[] = ['home', 'teleprompter', 'conversation', 'notes', 'contact', 'settings'];
  return valid.includes(screen as PageName) ? (screen as PageName) : 'home';
}

const NAV_ITEMS = [
  { id: 'home', label: 'Home' },
  { id: 'conversation', label: 'Chat' },
  { id: 'teleprompter', label: 'Text' },
  { id: 'notes', label: 'Notes' },
  { id: 'contact', label: 'Contact' },
  { id: 'settings', label: 'Settings' },
];

// ── Main App ──

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = useSyncExternalStore(subscribe, getState);

  // Keep store's currentPage in sync with the URL
  const currentScreen = deriveScreen(location.pathname);
  const currentPage = pageNameFromScreen(currentScreen);
  useEffect(() => {
    if (state.currentPage !== currentPage) setPage(currentPage);
  }, [currentPage, state.currentPage]);

  // Start remote polling on mount
  useEffect(() => { startPolling(2000); return () => stopPolling(); }, []);

  // ── Glass action handler ──
  const onGlassAction = useCallback(
    (action: GlassAction, nav: GlassNavState, snapshot: AppState): GlassNavState => {
      const screen = nav.screen;

      switch (action.type) {
        case 'HIGHLIGHT_MOVE': {
          const dir = action.direction;

          if (screen === 'home') {
            const maxIdx = HOME_MENU.length - 1;
            const next = dir === 'down' ? Math.min(nav.highlightedIndex + 1, maxIdx) : Math.max(nav.highlightedIndex - 1, 0);
            return { ...nav, highlightedIndex: next };
          }

          if (screen === 'teleprompter') {
            const pages = paginateText(snapshot.teleprompter.content || '', 42, CONTENT_LINES);
            const maxPage = Math.max(0, pages.length - 1);
            const next = dir === 'down' ? Math.min(nav.highlightedIndex + 1, maxPage) : Math.max(nav.highlightedIndex - 1, 0);
            return { ...nav, highlightedIndex: next };
          }

          if (screen === 'conversation') {
            const allLines = buildConversationLines(snapshot);
            const maxOffset = Math.max(0, allLines.length - CONTENT_LINES);
            const curOffset = snapshot.conversation.scrollOffset;
            if (dir === 'down') setConversationScroll(Math.min(curOffset + 1, maxOffset));
            else setConversationScroll(Math.max(curOffset - 1, 0));
            return nav;
          }

          if (screen === 'notes') {
            const maxIdx = Math.max(0, snapshot.notes.length - 1);
            const next = dir === 'down' ? Math.min(nav.highlightedIndex + 1, maxIdx) : Math.max(nav.highlightedIndex - 1, 0);
            return { ...nav, highlightedIndex: next };
          }

          if (screen === 'note-detail') {
            const note = snapshot.notes[snapshot.viewingNoteIndex];
            if (note) {
              const pages = paginateText(cleanForG2(note.content), 42, CONTENT_LINES);
              const maxPage = Math.max(0, pages.length - 1);
              const next = dir === 'down' ? Math.min(nav.highlightedIndex + 1, maxPage) : Math.max(nav.highlightedIndex - 1, 0);
              return { ...nav, highlightedIndex: next };
            }
            return nav;
          }

          if (screen === 'contact') {
            if (snapshot.contact) {
              const allLines = buildContactLines(snapshot.contact);
              const maxOffset = Math.max(0, allLines.length - CONTENT_LINES);
              const next = dir === 'down' ? Math.min(nav.highlightedIndex + 1, maxOffset) : Math.max(nav.highlightedIndex - 1, 0);
              return { ...nav, highlightedIndex: next };
            }
            return nav;
          }

          if (screen === 'settings') {
            const maxIdx = SETTINGS_LABELS.length - 1;
            const next = dir === 'down' ? Math.min(nav.highlightedIndex + 1, maxIdx) : Math.max(nav.highlightedIndex - 1, 0);
            return { ...nav, highlightedIndex: next };
          }

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

          if (screen === 'conversation') { toggleMic(); return nav; }

          if (screen === 'notes') {
            const note = snapshot.notes[nav.highlightedIndex];
            if (note) {
              setViewingNote(nav.highlightedIndex);
              navigate(`/notes/${note.id}`);
              return { ...nav, screen: 'note-detail', highlightedIndex: 0 };
            }
            return nav;
          }

          if (screen === 'settings') {
            switch (nav.highlightedIndex) {
              case 0: toggleMic(); break;
              case 1: updateSettings({ showBattery: !snapshot.settings.showBattery }); break;
              case 2: {
                const speeds = [1, 2, 3];
                const curIdx = speeds.indexOf(snapshot.settings.scrollSpeed);
                updateSettings({ scrollSpeed: speeds[(curIdx + 1) % speeds.length] ?? 1 });
                break;
              }
              case 3: {
                const newKA = !snapshot.settings.keepAlive;
                updateSettings({ keepAlive: newKA });
                if (newKA) activateKeepAlive(); else deactivateKeepAlive();
                break;
              }
              case 4: clearConversation(); setFlash('History cleared'); break;
              case 5: setFlash('Friday AI v1.0'); break;
            }
            return nav;
          }

          return nav;
        }

        case 'GO_BACK': {
          if (screen === 'home') { setFlash('\u2605 Friday Active \u2605'); return nav; }
          navigate('/');
          return { ...nav, screen: 'home', highlightedIndex: 0 };
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

  // ── Nav ──
  const activeNavId = (() => {
    if (location.pathname === '/') return 'home';
    if (location.pathname === '/conversation') return 'conversation';
    if (location.pathname === '/teleprompter') return 'teleprompter';
    if (location.pathname.startsWith('/notes')) return 'notes';
    if (location.pathname === '/contact') return 'contact';
    if (location.pathname === '/settings') return 'settings';
    return 'home';
  })();

  return (
    <div className="app-shell">
      <div className="app-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/conversation" element={<ConversationPage />} />
          <Route path="/teleprompter" element={<TeleprompterPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/:id" element={<NoteDetailPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
      <nav className="app-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(screenToPath(item.id))}
            className={`app-nav-item ${activeNavId === item.id ? 'active' : ''}`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
