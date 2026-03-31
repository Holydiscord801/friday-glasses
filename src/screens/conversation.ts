// ── Conversation Awareness Mode ─────────────────────────────────────────
// Live transcript + AI notifications. Click toggles rec. Double-click exits.

import type { Container, AppState, GlassesEvent } from '../types';
import { textContainer, UI } from '../layout';

const DEMO_TRANSCRIPT = [
  'S1: We need to finalize the Q2 roadmap',
  'S2: I think AR integration should be priority',
  'S1: Agreed. What about the timeline?',
  'S2: Dan mentioned Mar 31 as demo date',
];

const DEMO_NOTIFICATIONS = [
  'Dan Hu replied re: navigation-free concept',
  'Q2 roadmap doc shared in #product',
];

export function initConversationState(state: AppState): AppState {
  return {
    ...state,
    conversationTranscript: DEMO_TRANSCRIPT,
    conversationNotifications: DEMO_NOTIFICATIONS,
    isRecording: true,
  };
}

function formatTranscript(lines: string[], maxChars: number): string {
  const result: string[] = [];
  let total = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (total + line.length + 1 > maxChars) break;
    result.unshift(line);
    total += line.length + 1;
  }
  return result.join('\n');
}

export function renderConversation(state: AppState): Container[] {
  // Container 0: Header
  const rec = state.isRecording ? `${UI.BULLET} REC` : '  Paused';
  const header = textContainer(0,
    `${UI.BOX_V} Conversation ${rec}\n${UI.SEPARATOR}`,
    { x: 0, y: 0, w: 576, h: 45 }
  );

  // Container 1: Notifications
  const notifText = state.conversationNotifications.length > 0
    ? state.conversationNotifications
        .map((n, i) => `${i === 0 ? UI.ARROW_RIGHT : '  '} ${n}`)
        .join('\n')
    : '  No notifications';
  const notifs = textContainer(1, notifText, {
    x: 0, y: 48, w: 576, h: 60, border: 1,
  });

  // Container 2: Transcript (captures events)
  const transcript = formatTranscript(state.conversationTranscript, 200);
  const body = textContainer(2, transcript, {
    x: 0, y: 114, w: 576, h: 128, capture: true,
  });

  // Container 3: Footer
  const footer = textContainer(3,
    `  Click: toggle rec  ${UI.BOX_V}  ${UI.BULLET}${UI.BULLET} exit`,
    { x: 0, y: 248, w: 576, h: 40 }
  );

  return [header, notifs, body, footer];
}

export function getTranscriptText(state: AppState): string {
  return formatTranscript(state.conversationTranscript, 200);
}

export function handleConversationEvent(
  event: GlassesEvent,
  state: AppState
): {
  state: AppState;
  transition?: 'main';
  startMic?: boolean;
  stopMic?: boolean;
} {
  const next = { ...state };

  switch (event) {
    case 'CLICK_EVENT':
      next.isRecording = !state.isRecording;
      if (next.isRecording) {
        return { state: next, startMic: true };
      }
      return { state: next, stopMic: true };

    case 'SCROLL_TOP_EVENT':
      if (state.conversationNotifications.length > 1) {
        const [first, ...rest] = state.conversationNotifications;
        next.conversationNotifications = [...rest, first];
      }
      return { state: next };

    case 'SCROLL_BOTTOM_EVENT':
      return { state: next };

    case 'DOUBLE_CLICK_EVENT':
      next.isRecording = false;
      return { state: next, transition: 'main', stopMic: true };

    default:
      return { state: next };
  }
}
