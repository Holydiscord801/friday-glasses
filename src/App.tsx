import { useSyncExternalStore, useCallback, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router';
import { useGlasses } from 'even-toolkit/useGlasses';
import type { GlassAction, GlassNavState } from 'even-toolkit/types';
import { line, separator } from 'even-toolkit/types';
import { paginateText, pageIndicator, wordWrap } from 'even-toolkit/paginate-text';
import { cleanForG2 } from 'even-toolkit/text-clean';
import { activateKeepAlive, deactivateKeepAlive } from 'even-toolkit/keep-alive';
import { NavBar } from 'even-toolkit/web/nav-bar';
import { Page } from 'even-toolkit/web/page';
import {
  getState,
  subscribe,
  getSnapshot,
  setPage,
  clearTeleprompter,
  toggleMic,
  clearConversation,
  setConversationScroll,
  updateSettings,
  setFlash,
  setViewingNote,
  startPolling,
  stopPolling,
} from './store';
import type { AppState, PageName, ContactCard } from './types';
import type { DisplayData, DisplayLine } from 'even-toolkit/types';
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

// ── G2 display constants ──

const LINE_W = 44;       // usable chars per line (with margins)
const CONTENT_LINES = 6; // lines in scrollable content area

// Home menu icons (G2-safe geometric shapes)
const MENU_ICONS = ['\u25B6', '\u25A1', '\u25A0', '\u25C7', '\u25CB'] as const; // ▶ □ ■ ◇ ○
const MENU_LABELS = ['Chat', 'Teleprompter', 'Notes', 'Contact', 'Settings'] as const;

// Settings items
const SETTINGS_LABELS = [
  'Mic enabled', 'Show battery', 'Scroll speed',
  'Keep alive', 'Clear history', 'About',
] as const;

// ── G2 display helpers ──

/** Right-align: put `left` flush left and `right` flush right, padded to width */
function rAlign(left: string, right: string, w = LINE_W): string {
  const gap = Math.max(1, w - left.length - right.length);
  return left + ' '.repeat(gap) + right;
}

/** Pad/trim an array of DisplayLines to exactly `n` lines */
function padLines(lines: DisplayLine[], n = CONTENT_LINES): DisplayLine[] {
  const out = lines.slice(0, n);
  while (out.length < n) out.push(line(''));
  return out;
}

/** Apply scroll window with ▲/▼ indicators */
function scrollView(all: DisplayLine[], offset: number, size = CONTENT_LINES): DisplayLine[] {
  const visible = all.slice(offset, offset + size);
  const padded = padLines(visible, size);
  if (offset > 0) {
    padded[0] = line('                     \u25B2', 'meta');  // ▲
  }
  if (offset + size < all.length) {
    padded[padded.length - 1] = line('                     \u25BC', 'meta');  // ▼
  }
  return padded;
}

/** Build a footer action-hint line (meta style) */
function hint(...actions: string[]): DisplayLine {
  return line(' ' + actions.join('   '), 'meta');
}

/** Build conversation content lines (shared between display and scroll calc) */
function buildConversationLines(snapshot: AppState): DisplayLine[] {
  const { entries } = snapshot.conversation;
  const allLines: DisplayLine[] = [];
  const lastFriday = [...entries].reverse().find(e => e.role === 'friday');
  const lastUser = [...entries].reverse().find(e => e.role === 'user');

  if (lastFriday) {
    allLines.push(line('  FRIDAY:'));
    for (const wl of wordWrap(cleanForG2(lastFriday.text), 40)) {
      allLines.push(line(`  ${wl}`));
    }
  }
  if (lastUser) {
    if (allLines.length > 0) allLines.push(separator());
    const userText = cleanForG2(lastUser.text);
    const truncated = userText.length > 38 ? userText.slice(0, 37) + '~' : userText;
    allLines.push(line(`  You: ${truncated}`));
  }
  return allLines;
}

/** Build contact card content lines (shared between display and scroll calc) */
function buildContactLines(c: ContactCard): DisplayLine[] {
  const allLines: DisplayLine[] = [];
  allLines.push(line(`  ${cleanForG2(c.name).toUpperCase()}`));
  const subtitle = `${cleanForG2(c.title)} \u00B7 ${cleanForG2(c.company)}`;
  allLines.push(line(`  ${subtitle.slice(0, 42)}`, 'meta'));
  if (c.context) {
    allLines.push(separator());
    for (const wl of wordWrap(cleanForG2(c.context), 40)) {
      allLines.push(line(`  ${wl}`));
    }
  }
  if (c.talking_points.length > 0) {
    allLines.push(separator());
    for (const tp of c.talking_points) {
      const wrapped = wordWrap(cleanForG2(tp), 38);
      allLines.push(line(`  \u2022 ${wrapped[0] || ''}`));
      for (let i = 1; i < wrapped.length; i++) {
        allLines.push(line(`    ${wrapped[i]}`));
      }
    }
  }
  return allLines;
}

/** Compute auto-scroll offset to keep highlighted item visible in a list */
function listViewOffset(highlighted: number, total: number, windowSize = CONTENT_LINES): number {
  if (total <= windowSize) return 0;
  const maxStart = total - windowSize;
  const idealStart = Math.max(0, highlighted - 2);
  return Math.min(idealStart, maxStart);
}

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

// ── Build glasses DisplayData from app state ──
// Layout: header (1) + separator (1) + content (6) + separator (1) + footer (1) = 10 lines
// 576x288 display, ~28px line height, 4-bit greyscale

function toDisplayData(snapshot: AppState, nav: GlassNavState): DisplayData {
  // ── Flash message overlay ──
  if (snapshot.flashMessage) {
    const msg = snapshot.flashMessage;
    const pad = Math.max(0, Math.floor((LINE_W - msg.length) / 2));
    const bar = '  ' + '\u2501'.repeat(40);  // ━━━━━
    return {
      lines: [
        line(''), line(''),
        line(bar, 'meta'),
        line(''),
        line(' '.repeat(pad) + msg),
        line(''),
        line(bar, 'meta'),
        line(''), line(''), line(''),
      ],
    };
  }

  const screen = nav.screen;

  switch (screen) {
    // ────────────────────────────────────────────
    // HOME — icon menu with status header
    // ────────────────────────────────────────────
    case 'home': {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dot = snapshot.glasses.connected ? '\u25CF' : '\u25CB'; // ● or ○
      const bat = snapshot.settings.showBattery ? ` ${snapshot.glasses.battery}%` : '';

      const menuLines = HOME_MENU.map((_, i) => {
        const icon = MENU_ICONS[i];
        const label = MENU_LABELS[i];
        return line(`   ${icon} ${label}`, 'normal', i === nav.highlightedIndex);
      });

      return {
        lines: [
          line(rAlign('  FRIDAY', `${dot} ${time}${bat}`)),
          separator(),
          ...padLines(menuLines, CONTENT_LINES),
          separator(),
          hint('\u25B2\u25BC Scroll', '\u25CF Select', '\u25CF\u25CF Exit'),
        ],
      };
    }

    // ────────────────────────────────────────────
    // TELEPROMPTER — full-screen paginated text
    // ────────────────────────────────────────────
    case 'teleprompter': {
      if (!snapshot.teleprompter.content) {
        return {
          lines: [
            line(rAlign('  FRIDAY', 'Teleprompter')),
            separator(),
            ...padLines([
              line(''),
              line('  No content loaded.'),
              line('  Push via API or type below.'),
            ]),
            separator(),
            hint('\u25CF\u25CF Home'),
          ],
        };
      }
      const pages = paginateText(snapshot.teleprompter.content, 42, CONTENT_LINES);
      const pageIdx = Math.min(Math.max(0, nav.highlightedIndex), Math.max(0, pages.length - 1));
      const currentPage = pages[pageIdx] || [];
      const indicator = pageIndicator(pageIdx, pages.length);

      return {
        lines: [
          line(rAlign('  FRIDAY', `Teleprompter  ${indicator}`)),
          separator(),
          ...padLines(currentPage.map(l => line(`  ${l}`)), CONTENT_LINES),
          separator(),
          hint('\u25B2\u25BC Page', '\u25CF\u25CF Clear'),
        ],
      };
    }

    // ────────────────────────────────────────────
    // CONVERSATION — status bar + scrollable chat
    // ────────────────────────────────────────────
    case 'conversation': {
      const { entries, micOn, isProcessing } = snapshot.conversation;
      const micStatus = micOn
        ? '\u25CF MIC ON'
        : isProcessing
        ? '\u25C6 thinking'
        : '\u25CB mic off';

      if (entries.length === 0) {
        return {
          lines: [
            line(rAlign('  FRIDAY', `Chat  ${micStatus}`)),
            separator(),
            ...padLines([
              line(''),
              line('  Say something to Friday.'),
              line('  Tap to start listening.'),
            ]),
            separator(),
            hint('\u25B2\u25BC Scroll', '\u25CF Mic', '\u25CF\u25CF Home'),
          ],
        };
      }

      const allLines = buildConversationLines(snapshot);
      const offset = snapshot.conversation.scrollOffset;
      const content = scrollView(allLines, offset);

      return {
        lines: [
          line(rAlign('  FRIDAY', `Chat  ${micStatus}`)),
          separator(),
          ...content,
          separator(),
          hint('\u25B2\u25BC Scroll', '\u25CF Mic', '\u25CF\u25CF Home'),
        ],
      };
    }

    // ────────────────────────────────────────────
    // NOTES LIST — numbered, scrollable
    // ────────────────────────────────────────────
    case 'notes': {
      if (snapshot.notes.length === 0) {
        return {
          lines: [
            line(rAlign('  FRIDAY', 'Notes')),
            separator(),
            ...padLines([
              line(''),
              line('  No notes yet.'),
              line('  Friday can add notes via API.'),
            ]),
            separator(),
            hint('\u25CF\u25CF Home'),
          ],
        };
      }

      const noteLines = snapshot.notes.map((note, i) => {
        const num = `${i + 1}.`;
        const title = cleanForG2(note.title);
        const maxT = LINE_W - num.length - 4;
        const display = title.length > maxT ? title.slice(0, maxT - 1) + '~' : title;
        return line(`  ${num} ${display}`, 'normal', i === nav.highlightedIndex);
      });

      const viewStart = listViewOffset(nav.highlightedIndex, noteLines.length);
      const visible = noteLines.slice(viewStart, viewStart + CONTENT_LINES);
      const content = padLines(visible);
      if (viewStart > 0) {
        content[0] = line('                     \u25B2', 'meta');
      }
      if (viewStart + CONTENT_LINES < noteLines.length) {
        content[content.length - 1] = line('                     \u25BC', 'meta');
      }

      return {
        lines: [
          line(rAlign('  FRIDAY', 'Notes')),
          separator(),
          ...content,
          separator(),
          hint('\u25B2\u25BC Scroll', '\u25CF Open', '\u25CF\u25CF Home'),
        ],
      };
    }

    // ────────────────────────────────────────────
    // NOTE DETAIL — paginated content
    // ────────────────────────────────────────────
    case 'note-detail': {
      const note = snapshot.notes[snapshot.viewingNoteIndex];
      if (!note) {
        return {
          lines: [
            line('  Note'),
            separator(),
            ...padLines([line('  Note not found.')]),
            separator(),
            hint('\u25CF\u25CF Home'),
          ],
        };
      }

      const pages = paginateText(cleanForG2(note.content), 42, CONTENT_LINES);
      const pageIdx = Math.min(Math.max(0, nav.highlightedIndex), Math.max(0, pages.length - 1));
      const currentPage = pages[pageIdx] || [];
      const indicator = pages.length > 1 ? pageIndicator(pageIdx, pages.length) : '';
      const title = cleanForG2(note.title);
      const maxTitle = indicator ? LINE_W - indicator.length - 3 : LINE_W - 2;
      const displayTitle = title.length > maxTitle ? title.slice(0, maxTitle - 1) + '~' : title;

      return {
        lines: [
          line(indicator ? rAlign(`  ${displayTitle}`, indicator) : `  ${displayTitle}`),
          separator(),
          ...padLines(currentPage.map(l => line(`  ${l}`)), CONTENT_LINES),
          separator(),
          hint('\u25B2\u25BC Page', '\u25CF\u25CF Home'),
        ],
      };
    }

    // ────────────────────────────────────────────
    // CONTACT CARD — scrollable details
    // ────────────────────────────────────────────
    case 'contact': {
      const c = snapshot.contact;
      if (!c) {
        return {
          lines: [
            line(rAlign('  FRIDAY', 'Contact')),
            separator(),
            ...padLines([
              line(''),
              line('  No contact card.'),
              line('  Push via POST /api/contact'),
            ]),
            separator(),
            hint('\u25CF\u25CF Home'),
          ],
        };
      }

      const allLines = buildContactLines(c);
      const offset = nav.highlightedIndex;
      const content = scrollView(allLines, offset);

      return {
        lines: [
          line(rAlign('  FRIDAY', 'Contact')),
          separator(),
          ...content,
          separator(),
          hint('\u25B2\u25BC Scroll', '\u25CF\u25CF Home'),
        ],
      };
    }

    // ────────────────────────────────────────────
    // SETTINGS — toggle list with [ ON ] / [OFF ] brackets
    // ────────────────────────────────────────────
    case 'settings': {
      const highlighted = nav.highlightedIndex;

      // Format toggle values with bracket style
      const toggleVal = (on: boolean) => on ? '[ ON  ]' : '[ OFF ]';
      const values = [
        toggleVal(snapshot.conversation.micOn),
        toggleVal(snapshot.settings.showBattery),
        `[ ${snapshot.settings.scrollSpeed}x  ]`,
        toggleVal(snapshot.settings.keepAlive),
        '     \u2192',  // →
        '     \u2192',
      ];

      const settingLines = SETTINGS_LABELS.map((label, i) =>
        line(rAlign(`  ${label}`, values[i]), 'normal', i === highlighted),
      );

      return {
        lines: [
          line(rAlign('  FRIDAY', 'Settings')),
          separator(),
          ...padLines(settingLines),
          separator(),
          hint('\u25B2\u25BC Scroll', '\u25CF Toggle', '\u25CF\u25CF Home'),
        ],
      };
    }

    default:
      return {
        lines: [
          line('  FRIDAY'),
          separator(),
          ...padLines([]),
          separator(),
          line('', 'meta'),
        ],
      };
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
        // ── RING SCROLL ──
        case 'HIGHLIGHT_MOVE': {
          const dir = action.direction;

          if (screen === 'home') {
            const maxIdx = HOME_MENU.length - 1;
            const next = dir === 'down'
              ? Math.min(nav.highlightedIndex + 1, maxIdx)
              : Math.max(nav.highlightedIndex - 1, 0);
            return { ...nav, highlightedIndex: next };
          }

          if (screen === 'teleprompter') {
            const pages = paginateText(snapshot.teleprompter.content || '', 42, CONTENT_LINES);
            const maxPage = Math.max(0, pages.length - 1);
            const next = dir === 'down'
              ? Math.min(nav.highlightedIndex + 1, maxPage)
              : Math.max(nav.highlightedIndex - 1, 0);
            return { ...nav, highlightedIndex: next };
          }

          if (screen === 'conversation') {
            const allLines = buildConversationLines(snapshot);
            const maxOffset = Math.max(0, allLines.length - CONTENT_LINES);
            const curOffset = snapshot.conversation.scrollOffset;
            if (dir === 'down') {
              setConversationScroll(Math.min(curOffset + 1, maxOffset));
            } else {
              setConversationScroll(Math.max(curOffset - 1, 0));
            }
            return nav;
          }

          if (screen === 'notes') {
            const maxIdx = Math.max(0, snapshot.notes.length - 1);
            const next = dir === 'down'
              ? Math.min(nav.highlightedIndex + 1, maxIdx)
              : Math.max(nav.highlightedIndex - 1, 0);
            return { ...nav, highlightedIndex: next };
          }

          if (screen === 'note-detail') {
            const note = snapshot.notes[snapshot.viewingNoteIndex];
            if (note) {
              const pages = paginateText(cleanForG2(note.content), 42, CONTENT_LINES);
              const maxPage = Math.max(0, pages.length - 1);
              const next = dir === 'down'
                ? Math.min(nav.highlightedIndex + 1, maxPage)
                : Math.max(nav.highlightedIndex - 1, 0);
              return { ...nav, highlightedIndex: next };
            }
            return nav;
          }

          if (screen === 'contact') {
            if (snapshot.contact) {
              const allLines = buildContactLines(snapshot.contact);
              const maxOffset = Math.max(0, allLines.length - CONTENT_LINES);
              const next = dir === 'down'
                ? Math.min(nav.highlightedIndex + 1, maxOffset)
                : Math.max(nav.highlightedIndex - 1, 0);
              return { ...nav, highlightedIndex: next };
            }
            return nav;
          }

          if (screen === 'settings') {
            const maxIdx = SETTINGS_LABELS.length - 1;
            const next = dir === 'down'
              ? Math.min(nav.highlightedIndex + 1, maxIdx)
              : Math.max(nav.highlightedIndex - 1, 0);
            return { ...nav, highlightedIndex: next };
          }

          return nav;
        }

        // ── SINGLE TAP ──
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
              setViewingNote(nav.highlightedIndex);
              navigate(`/notes/${note.id}`);
              return { ...nav, screen: 'note-detail', highlightedIndex: 0 };
            }
            return nav;
          }

          if (screen === 'settings') {
            const idx = nav.highlightedIndex;
            switch (idx) {
              case 0: // Mic enabled
                toggleMic();
                break;
              case 1: // Show battery
                updateSettings({ showBattery: !snapshot.settings.showBattery });
                break;
              case 2: { // Scroll speed (cycle 1→2→3→1)
                const speeds = [1, 2, 3];
                const curIdx = speeds.indexOf(snapshot.settings.scrollSpeed);
                updateSettings({ scrollSpeed: speeds[(curIdx + 1) % speeds.length] ?? 1 });
                break;
              }
              case 3: { // Keep alive
                const newKA = !snapshot.settings.keepAlive;
                updateSettings({ keepAlive: newKA });
                if (newKA) activateKeepAlive(); else deactivateKeepAlive();
                break;
              }
              case 4: // Clear history
                clearConversation();
                setFlash('History cleared');
                break;
              case 5: // About
                setFlash('Friday AI v1.0');
                break;
            }
            return nav;
          }

          return nav;
        }

        // ── DOUBLE TAP (GO_BACK) — always goes home ──
        case 'GO_BACK': {
          if (screen === 'home') {
            setFlash('\u2605 Friday Active \u2605');
            return nav;
          }
          // From anywhere: double tap = back to main menu
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
