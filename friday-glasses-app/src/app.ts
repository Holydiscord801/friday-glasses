// ── App Controller ──────────────────────────────────────────────────────
// Central state machine. Routes events to the active screen handler,
// manages transitions, and drives the display via the bridge.

import type { AppState, AppScreen, Container, GlassesEvent } from './types';
import { createInitialState } from './types';
import {
  createStartUpPage,
  rebuildPage,
  updateText,
  audioControl,
  saveLocal,
  loadLocal,
} from './bridge';
import { log, setStatus } from './logger';

// Screen modules
import { renderSleep, handleSleepEvent } from './screens/sleep';
import { renderWelcome, handleWelcomeEvent } from './screens/welcome';
import { renderComingSoon, handleComingSoonEvent } from './screens/coming-soon';
import {
  renderMainDisplay,
  getTimeUpdateText,
  handleMainDisplayEvent,
} from './screens/main-display';
import { renderDrawer, handleDrawerEvent } from './screens/drawer';
import { renderChat, getChatBodyText, handleChatEvent } from './screens/chat';
import {
  renderTeleprompter,
  handleTeleprompterEvent,
  initTeleprompterState,
} from './screens/teleprompter';
import {
  renderConversation,
  handleConversationEvent,
  initConversationState,
} from './screens/conversation';

// ── State ───────────────────────────────────────────────────────────────

let state: AppState = createInitialState();
let timeUpdateInterval: number | null = null;
let isFirstRender = true;

// ── Persistence ─────────────────────────────────────────────────────────

function persistState(): void {
  try {
    const persist = {
      selectedAI: state.selectedAI,
      wakeWord: state.wakeWord,
      sleepTimeoutMs: state.sleepTimeoutMs,
    };
    saveLocal('friday_state', JSON.stringify(persist));
  } catch {
    // Non-critical
  }
}

function restoreState(): void {
  try {
    const raw = loadLocal('friday_state');
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.selectedAI) state.selectedAI = saved.selectedAI;
      if (saved.wakeWord) state.wakeWord = saved.wakeWord;
      if (saved.sleepTimeoutMs) state.sleepTimeoutMs = saved.sleepTimeoutMs;
      log(`Restored: AI=${state.selectedAI}, wake="${state.wakeWord}"`);
    }
  } catch {
    // Non-critical
  }
}

// ── Inactivity timer ────────────────────────────────────────────────────

function resetInactivityTimer(): void {
  if (state.inactivityTimer !== null) {
    clearTimeout(state.inactivityTimer);
    state.inactivityTimer = null;
  }

  // Only set timer when on screens that should auto-sleep
  const autoSleepScreens: AppScreen[] = ['main', 'drawer'];
  if (autoSleepScreens.includes(state.screen)) {
    state.inactivityTimer = window.setTimeout(() => {
      log('Inactivity timeout — going to sleep');
      transitionTo('sleep');
    }, state.sleepTimeoutMs);
  }
}

function clearInactivityTimer(): void {
  if (state.inactivityTimer !== null) {
    clearTimeout(state.inactivityTimer);
    state.inactivityTimer = null;
  }
}

// ── Rendering ───────────────────────────────────────────────────────────

function getContainersForScreen(screen: AppScreen): Container[] {
  switch (screen) {
    case 'sleep':         return renderSleep(state);
    case 'welcome':       return renderWelcome(state);
    case 'coming_soon':   return renderComingSoon(state);
    case 'main':          return renderMainDisplay(state);
    case 'drawer':        return renderDrawer(state);
    case 'chat':          return renderChat(state);
    case 'teleprompter':  return renderTeleprompter(state);
    case 'conversation':  return renderConversation(state);
    default:              return renderSleep(state);
  }
}

function render(): void {
  const containers = getContainersForScreen(state.screen);

  if (isFirstRender) {
    createStartUpPage(containers);
    isFirstRender = false;
  } else {
    rebuildPage(containers);
  }

  setStatus(`Screen: ${state.screen} | AI: ${state.selectedAI ?? 'none'}`);
}

// ── Time updates for main display ───────────────────────────────────────

function startTimeUpdates(): void {
  stopTimeUpdates();
  timeUpdateInterval = window.setInterval(() => {
    if (state.screen === 'main') {
      updateText(0, getTimeUpdateText());
    }
  }, 10_000); // Update every 10 seconds
}

function stopTimeUpdates(): void {
  if (timeUpdateInterval !== null) {
    clearInterval(timeUpdateInterval);
    timeUpdateInterval = null;
  }
}

// ── Screen transitions ──────────────────────────────────────────────────

function transitionTo(screen: AppScreen): void {
  const prevScreen = state.screen;
  state.screen = screen;
  log(`Transition: ${prevScreen} -> ${screen}`);

  // Cleanup previous screen
  if (prevScreen === 'main') stopTimeUpdates();
  if (prevScreen === 'chat' || prevScreen === 'conversation') {
    if (state.isRecording) {
      audioControl(false);
      state.isRecording = false;
    }
  }

  // Initialize new screen
  switch (screen) {
    case 'sleep':
      clearInactivityTimer();
      stopTimeUpdates();
      break;
    case 'main':
      startTimeUpdates();
      resetInactivityTimer();
      break;
    case 'teleprompter':
      state = initTeleprompterState(state);
      clearInactivityTimer();
      break;
    case 'conversation':
      state = initConversationState(state);
      audioControl(true);
      clearInactivityTimer();
      break;
    case 'chat':
      clearInactivityTimer();
      break;
    case 'drawer':
      resetInactivityTimer();
      break;
    default:
      clearInactivityTimer();
      break;
  }

  persistState();
  render();
}

// ── Event routing ───────────────────────────────────────────────────────

function handleEvent(event: GlassesEvent): void {
  log(`Event: ${event} (screen: ${state.screen})`);

  // Handle app lifecycle events globally
  if (event === 'FOREGROUND_ENTER_EVENT') {
    // App brought to foreground — wake up if sleeping
    if (state.screen === 'sleep') {
      transitionTo(state.selectedAI ? 'main' : 'welcome');
    }
    return;
  }
  if (event === 'FOREGROUND_EXIT_EVENT') {
    // App backgrounded — go to sleep
    transitionTo('sleep');
    return;
  }
  if (event === 'ABNORMAL_EXIT_EVENT') {
    clearInactivityTimer();
    stopTimeUpdates();
    return;
  }

  // Route to active screen handler
  let result: {
    state: AppState;
    transition?: AppScreen;
    startMic?: boolean;
    stopMic?: boolean;
  };

  switch (state.screen) {
    case 'sleep':
      result = handleSleepEvent(event, state);
      break;
    case 'welcome':
      result = handleWelcomeEvent(event, state);
      break;
    case 'coming_soon':
      result = handleComingSoonEvent(event, state);
      break;
    case 'main':
      result = handleMainDisplayEvent(event, state);
      break;
    case 'drawer':
      result = handleDrawerEvent(event, state);
      break;
    case 'chat':
      result = handleChatEvent(event, state);
      break;
    case 'teleprompter':
      result = handleTeleprompterEvent(event, state);
      break;
    case 'conversation':
      result = handleConversationEvent(event, state);
      break;
    default:
      result = { state };
  }

  // Apply state changes
  state = result.state;

  // Handle mic control
  if (result.startMic) audioControl(true);
  if (result.stopMic) audioControl(false);

  // Transition or re-render current screen
  if (result.transition) {
    transitionTo(result.transition);
  } else {
    // Re-render in place for scroll/cursor changes
    // Use textContainerUpgrade where possible to avoid flicker
    if (state.screen === 'chat') {
      updateText(1, getChatBodyText(state));
    } else {
      render();
    }
    // Reset inactivity timer on any user interaction
    resetInactivityTimer();
  }
}

// ── Public API ──────────────────────────────────────────────────────────

export function startApp(eventHandler: (cb: (e: GlassesEvent) => void) => void): void {
  log('Friday app starting...');
  restoreState();

  // Register event handler
  eventHandler(handleEvent);

  // Initial render — start in sleep state
  render();
  log('Friday ready. Double-tap to wake.');
}

/** Simulate receiving a wake word (called from phone-side voice detection) */
export function onWakeWord(word: string): void {
  if (
    state.screen === 'sleep' &&
    word.toLowerCase() === state.wakeWord.toLowerCase()
  ) {
    log(`Wake word detected: "${word}"`);
    transitionTo(state.selectedAI ? 'main' : 'welcome');
  }
}

/** Simulate receiving an AI response (for chat mode) */
export function onAIResponse(text: string): void {
  if (state.screen === 'chat') {
    state.chatMessages = [...state.chatMessages, `AI: ${text}`];
    updateText(1, getChatBodyText(state));
  }
}

/** Simulate receiving a transcript line (for conversation mode) */
export function onTranscriptLine(speaker: string, text: string): void {
  if (state.screen === 'conversation') {
    state.conversationTranscript = [
      ...state.conversationTranscript,
      `${speaker}: ${text}`,
    ];
    render(); // Full rebuild since we have 4 containers
  }
}

/** Simulate receiving an AI notification (for conversation mode) */
export function onAINotification(text: string): void {
  if (state.screen === 'conversation') {
    state.conversationNotifications = [text, ...state.conversationNotifications.slice(0, 4)];
    render();
  }
}

/** Get current app state (for debugging) */
export function getState(): Readonly<AppState> {
  return state;
}
