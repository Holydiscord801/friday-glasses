import type { AppState, ContactCard } from './types';
import type { DisplayData, DisplayLine, GlassNavState } from 'even-toolkit/types';
import { line, separator } from 'even-toolkit/types';
import { paginateText, pageIndicator, wordWrap } from 'even-toolkit/paginate-text';
import { cleanForG2 } from 'even-toolkit/text-clean';

export const LINE_W = 44;
export const CONTENT_LINES = 8;

export const HOME_MENU = ['conversation', 'teleprompter', 'notes', 'contact', 'settings'] as const;
const MENU_ICONS = ['\u25B6', '\u25A1', '\u25A0', '\u25C7', '\u25CB'] as const;
const MENU_LABELS = ['Chat', 'Teleprompter', 'Notes', 'Contact', 'Settings'] as const;

export const SETTINGS_LABELS = [
  'Mic enabled', 'Show battery', 'Scroll speed',
  'Keep alive', 'IMU tracking', 'Dark mode',
  'Clear history', 'About',
] as const;

function rAlign(left: string, right: string, w = LINE_W): string {
  const gap = Math.max(1, w - left.length - right.length);
  return left + ' '.repeat(gap) + right;
}

function padLines(lines: DisplayLine[], n = CONTENT_LINES): DisplayLine[] {
  const out = lines.slice(0, n);
  while (out.length < n) out.push(line(''));
  return out;
}

function scrollView(all: DisplayLine[], offset: number, size = CONTENT_LINES): DisplayLine[] {
  const visible = all.slice(offset, offset + size);
  const padded = padLines(visible, size);
  if (offset > 0) {
    padded[0] = line('                     \u25B2', 'meta');
  }
  if (offset + size < all.length) {
    padded[padded.length - 1] = line('                     \u25BC', 'meta');
  }
  return padded;
}

function hint(...actions: string[]): DisplayLine {
  return line(' ' + actions.join('   '), 'meta');
}

export function buildConversationLines(snapshot: AppState): DisplayLine[] {
  const { entries } = snapshot.conversation;
  const allLines: DisplayLine[] = [];

  // Show last several entries (reversed so newest is at bottom)
  const recent = entries.slice(-6);

  for (let i = 0; i < recent.length; i++) {
    const entry = recent[i];
    if (i > 0) allLines.push(separator());

    if (entry.role === 'friday') {
      allLines.push(line('  FRIDAY:'));
      for (const wl of wordWrap(cleanForG2(entry.text), 40)) {
        allLines.push(line(`  ${wl}`));
      }
    } else {
      const userText = cleanForG2(entry.text);
      const truncated = userText.length > 38 ? userText.slice(0, 37) + '~' : userText;
      allLines.push(line(`  You: ${truncated}`));
    }
  }
  return allLines;
}

export function buildContactLines(c: ContactCard): DisplayLine[] {
  const allLines: DisplayLine[] = [];
  allLines.push(line(`  ${cleanForG2(c.name).toUpperCase()}`));
  const subtitle = `${cleanForG2(c.title)} \u00B7 ${cleanForG2(c.company)}`;
  allLines.push(line(`  ${subtitle.slice(0, 42)}`, 'meta'));
  if (c.context) {
    allLines.push(separator());
    allLines.push(line('  CONTEXT', 'meta'));
    for (const wl of wordWrap(cleanForG2(c.context), 40)) {
      allLines.push(line(`  ${wl}`));
    }
  }
  if (c.talking_points.length > 0) {
    allLines.push(separator());
    allLines.push(line('  TALKING POINTS', 'meta'));
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

function listViewOffset(highlighted: number, total: number, windowSize = CONTENT_LINES): number {
  if (total <= windowSize) return 0;
  const maxStart = total - windowSize;
  const idealStart = Math.max(0, highlighted - 2);
  return Math.min(idealStart, maxStart);
}

export function toDisplayData(snapshot: AppState, nav: GlassNavState): DisplayData {
  if (snapshot.flashMessage) {
    const msg = snapshot.flashMessage;
    const pad = Math.max(0, Math.floor((LINE_W - msg.length) / 2));
    const bar = '  ' + '\u2501'.repeat(40);
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
    case 'home': {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dot = snapshot.glasses.connected ? '\u25CF' : '\u25CB';
      const bat = snapshot.settings.showBattery ? ` ${snapshot.glasses.battery}%` : '';
      const menuLines = HOME_MENU.map((_, i) =>
        line(`   ${MENU_ICONS[i]} ${MENU_LABELS[i]}`, 'normal', i === nav.highlightedIndex),
      );

      // ── Status bar: mic | notes count | contact name ──
      const micTag = snapshot.conversation.micOn ? '\u25CF MIC' : '\u25CB mic';
      const noteCount = snapshot.notes.length;
      const noteTag = noteCount === 0 ? 'no notes' : `${noteCount} note${noteCount > 1 ? 's' : ''}`;
      const contactTag = snapshot.contact ? cleanForG2(snapshot.contact.name).slice(0, 14) : 'no contact';
      const statusLine = `  ${micTag} \u2502 ${noteTag} \u2502 ${contactTag}`;

      // ── Briefing: last Friday response preview ──
      const lastFriday = [...snapshot.conversation.entries].reverse().find(e => e.role === 'friday');
      const briefing = lastFriday
        ? cleanForG2(lastFriday.text).slice(0, 40)
        : 'Say something to get started.';

      return {
        lines: [
          line(rAlign('  FRIDAY', `${dot} ${time}${bat}`)),
          separator(),
          ...menuLines,
          separator(),
          line(`  ${briefing}`, 'meta'),
          line(statusLine, 'meta'),
          separator(),
          hint('\u25B2\u25BC Scroll', '\u25CF Select', '\u25CF\u25CF Exit'),
        ],
      };
    }

    case 'teleprompter': {
      if (!snapshot.teleprompter.content) {
        return {
          lines: [
            line(rAlign('  FRIDAY', 'Teleprompter')),
            separator(),
            ...padLines([line(''), line('  No content loaded.'), line('  Push via API or type below.')]),
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

    case 'conversation': {
      const { entries, micOn, isProcessing } = snapshot.conversation;
      const micStatus = micOn ? '\u25CF MIC ON' : isProcessing ? '\u25C6 thinking' : '\u25CB mic off';

      if (entries.length === 0) {
        return {
          lines: [
            line(rAlign('  FRIDAY', `Chat  ${micStatus}`)),
            separator(),
            ...padLines([line(''), line('  Say something to Friday.'), line('  Tap to start listening.')]),
            separator(),
            hint('\u25B2\u25BC Scroll', '\u25CF Mic', '\u25CF\u25CF Home'),
          ],
        };
      }

      const allLines = buildConversationLines(snapshot);
      const offset = snapshot.conversation.scrollOffset;
      return {
        lines: [
          line(rAlign('  FRIDAY', `Chat  ${micStatus}`)),
          separator(),
          ...scrollView(allLines, offset),
          separator(),
          hint('\u25B2\u25BC Scroll', '\u25CF Mic', '\u25CF\u25CF Home'),
        ],
      };
    }

    case 'notes': {
      if (snapshot.notes.length === 0) {
        return {
          lines: [
            line(rAlign('  FRIDAY', 'Notes')),
            separator(),
            ...padLines([line(''), line('  No notes yet.'), line('  Friday can add notes via API.')]),
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
      if (viewStart > 0) content[0] = line('                     \u25B2', 'meta');
      if (viewStart + CONTENT_LINES < noteLines.length)
        content[content.length - 1] = line('                     \u25BC', 'meta');

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

    case 'note-detail': {
      const note = snapshot.notes[snapshot.viewingNoteIndex];
      if (!note) {
        return {
          lines: [
            line('  Note'), separator(),
            ...padLines([line('  Note not found.')]),
            separator(), hint('\u25CF\u25CF Home'),
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

    case 'contact': {
      const c = snapshot.contact;
      if (!c) {
        return {
          lines: [
            line(rAlign('  FRIDAY', 'Contact')),
            separator(),
            ...padLines([line(''), line('  No contact card.'), line('  Push via POST /api/contact')]),
            separator(),
            hint('\u25CF\u25CF Home'),
          ],
        };
      }

      return {
        lines: [
          line(rAlign('  FRIDAY', 'Contact')),
          separator(),
          ...scrollView(buildContactLines(c), nav.highlightedIndex),
          separator(),
          hint('\u25B2\u25BC Scroll', '\u25CF\u25CF Home'),
        ],
      };
    }

    case 'settings': {
      const toggleVal = (on: boolean) => on ? '[ ON  ]' : '[ OFF ]';
      const values = [
        toggleVal(snapshot.conversation.micOn),
        toggleVal(snapshot.settings.showBattery),
        `[ ${snapshot.settings.scrollSpeed}x  ]`,
        toggleVal(snapshot.settings.keepAlive),
        toggleVal(snapshot.settings.imuTracking ?? false),
        toggleVal(snapshot.settings.darkMode),
        '     \u2192',
        '     \u2192',
      ];
      const settingLines = SETTINGS_LABELS.map((label, i) =>
        line(rAlign(`  ${label}`, values[i]), 'normal', i === nav.highlightedIndex),
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
          line('  FRIDAY'), separator(), ...padLines([]), separator(), line('', 'meta'),
        ],
      };
  }
}
