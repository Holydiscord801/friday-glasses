// ── Chat Mode ───────────────────────────────────────────────────────────
// AI conversation display. Click toggles voice. Double-click exits.

import type { Container, AppState, GlassesEvent } from '../types';
import { textContainer, UI, CHARS_PER_PAGE } from '../layout';

function formatMessages(messages: string[]): string {
  if (messages.length === 0) {
    return [
      '',
      '  Say something...',
      '',
      '  Click to speak',
    ].join('\n');
  }

  const lines: string[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const newLines = [msg, ''];
    const test = [...newLines, ...lines].join('\n');
    if (test.length > CHARS_PER_PAGE - 80) break;
    lines.unshift(...newLines);
  }
  return lines.join('\n');
}

export function renderChat(state: AppState): Container[] {
  // Container 0: Header
  const rec = state.isRecording ? `${UI.BULLET} REC` : '';
  const header = textContainer(0,
    `${UI.BOX_V} Friday Chat ${rec}\n${UI.SEPARATOR}`,
    { x: 0, y: 0, w: 576, h: 45 }
  );

  // Container 1: Messages (captures events)
  const body = textContainer(1, formatMessages(state.chatMessages), {
    x: 0, y: 48, w: 576, h: 195, capture: true,
  });

  // Container 2: Footer
  const hint = state.isRecording
    ? `  ${UI.BULLET} Listening...  Click: stop`
    : `  Click: speak  ${UI.BOX_V}  ${UI.BULLET}${UI.BULLET} exit`;
  const footer = textContainer(2, `${UI.SEPARATOR}\n${hint}`, {
    x: 0, y: 248, w: 576, h: 40,
  });

  return [header, body, footer];
}

export function getChatBodyText(state: AppState): string {
  return formatMessages(state.chatMessages);
}

export function handleChatEvent(
  event: GlassesEvent,
  state: AppState
): { state: AppState; transition?: 'main'; startMic?: boolean; stopMic?: boolean } {
  const next = { ...state };

  switch (event) {
    case 'CLICK_EVENT':
      if (state.isRecording) {
        next.isRecording = false;
        if (next.chatInput) {
          next.chatMessages = [...state.chatMessages, `You: ${next.chatInput}`];
          next.chatInput = '';
        }
        return { state: next, stopMic: true };
      } else {
        next.isRecording = true;
        return { state: next, startMic: true };
      }

    case 'SCROLL_BOTTOM_EVENT':
    case 'SCROLL_TOP_EVENT':
      return { state: next };

    case 'DOUBLE_CLICK_EVENT':
      next.isRecording = false;
      return { state: next, transition: 'main', stopMic: true };

    default:
      return { state: next };
  }
}
