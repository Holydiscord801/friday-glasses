// ── Chat Mode ───────────────────────────────────────────────────────────
// Simple text display showing AI conversation.
// Click starts voice input (mic), responses display as scrollable text.
// Double-click dismisses back to main display.

import type { Container, AppState, GlassesEvent } from '../types';
import { textContainer, UI, CHARS_PER_PAGE } from '../layout';

function formatMessages(messages: string[]): string {
  if (messages.length === 0) {
    return [
      'Chat Mode',
      UI.SEPARATOR,
      '',
      'Click to speak',
      'Double-click to exit',
    ].join('\n');
  }

  // Show the most recent messages that fit on screen
  const lines: string[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const newLines = [msg, ''];
    const test = [...newLines, ...lines].join('\n');
    if (test.length > CHARS_PER_PAGE) break;
    lines.unshift(...newLines);
  }

  return lines.join('\n');
}

export function renderChat(state: AppState): Container[] {
  // Container 0: Chat header
  const header = textContainer(0,
    `Friday Chat ${state.isRecording ? `${UI.BULLET} REC` : ''}\n${UI.SEPARATOR}`,
    { x: 0, y: 0, w: 576, h: 45 }
  );

  // Container 1: Message display area (captures events)
  const messageText = formatMessages(state.chatMessages);
  const body = textContainer(1, messageText, {
    x: 0, y: 48, w: 576, h: 200, capture: true,
  });

  // Container 2: Input hint
  const hint = state.isRecording
    ? `${UI.BULLET} Listening... Click to stop`
    : '  Click to speak  |  Double-click to exit';
  const footer = textContainer(2, `${UI.SEPARATOR}\n${hint}`, {
    x: 0, y: 252, w: 576, h: 36,
  });

  return [header, body, footer];
}

/** Get updatable text for live streaming AI responses */
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
        // Stop recording, process input
        next.isRecording = false;
        // In a real implementation, the audio callback would have been
        // accumulating audio data. Here we simulate a user message.
        if (next.chatInput) {
          next.chatMessages = [...state.chatMessages, `You: ${next.chatInput}`];
          next.chatInput = '';
        }
        return { state: next, stopMic: true };
      } else {
        // Start recording
        next.isRecording = true;
        return { state: next, startMic: true };
      }

    case 'SCROLL_BOTTOM_EVENT':
      // Could implement scroll through older messages
      return { state: next };

    case 'SCROLL_TOP_EVENT':
      return { state: next };

    case 'DOUBLE_CLICK_EVENT':
      next.isRecording = false;
      return { state: next, transition: 'main', stopMic: true };

    default:
      return { state: next };
  }
}
