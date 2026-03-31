// ── Conversation Awareness Mode ─────────────────────────────────────────
// Shows "Recording..." status with mic active.
// Transcript area with speaker labels.
// Notification area for AI-surfaced context.
// Click to expand a notification, double-click to dismiss.

import type { Container, AppState, GlassesEvent } from '../types';
import { textContainer, UI, CHARS_PER_PAGE } from '../layout';

// Demo transcript lines for the PoC
const DEMO_TRANSCRIPT = [
  'Speaker 1: We need to finalize the Q2 roadmap',
  'Speaker 2: I think the AR integration should be priority',
  'Speaker 1: Agreed. What about the timeline?',
  'Speaker 2: Dan mentioned March 31 as the demo date',
];

const DEMO_NOTIFICATIONS = [
  'Dan Hu replied about navigation-free concept',
  'Q2 roadmap doc shared in #product channel',
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
  // Show most recent lines that fit
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
  // Container 0: Status header
  const recStatus = state.isRecording ? `${UI.BULLET} Recording` : '  Paused';
  const header = textContainer(0,
    `Conversation ${recStatus}\n${UI.SEPARATOR}`,
    { x: 0, y: 0, w: 576, h: 45 }
  );

  // Container 1: Notification area (top section)
  const notifText = state.conversationNotifications.length > 0
    ? state.conversationNotifications
        .map((n, i) => `${i === 0 ? UI.ARROW_RIGHT : '  '} ${n}`)
        .join('\n')
    : '  No notifications';
  const notifs = textContainer(1, notifText, {
    x: 0, y: 48, w: 576, h: 65, border: 1,
  });

  // Container 2: Transcript (captures events)
  const transcript = formatTranscript(state.conversationTranscript, 250);
  const body = textContainer(2, transcript, {
    x: 0, y: 118, w: 576, h: 130, capture: true,
  });

  // Container 3: Footer hint
  const footer = textContainer(3,
    `  Click: toggle rec | Double-click: exit`,
    { x: 0, y: 252, w: 576, h: 36 }
  );

  return [header, notifs, body, footer];
}

/** Get updatable transcript text for live updates */
export function getTranscriptText(state: AppState): string {
  return formatTranscript(state.conversationTranscript, 250);
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
      // Toggle recording
      next.isRecording = !state.isRecording;
      if (next.isRecording) {
        return { state: next, startMic: true };
      }
      return { state: next, stopMic: true };

    case 'SCROLL_TOP_EVENT':
      // Cycle through notifications
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
