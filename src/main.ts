// ── Entry point ─────────────────────────────────────────────────────────
// Initializes the Even Hub bridge and starts the Friday app.

import { initBridge, registerEventHandler, isSimulatorMode } from './bridge';
import { startApp, onWakeWord, onAIResponse, onTranscriptLine, onAINotification, getState } from './app';
import { log, setStatus } from './logger';

// ── Boot ────────────────────────────────────────────────────────────────

function boot(): void {
  log('Friday v0.1.0 — AI-agnostic display layer for Even Realities G2');
  log('────────────────────────────────────────────────');

  const sdkAvailable = initBridge();

  if (sdkAvailable) {
    setStatus('Connected to Even Hub SDK');
  } else {
    setStatus('Simulator mode — use keyboard: Enter=click, Space=double, Arrows=scroll');
  }

  // Start the app
  startApp(registerEventHandler);

  // Expose APIs for phone-side integration and debugging
  if (isSimulatorMode()) {
    exposeDebugAPI();
  }

  // Always expose the integration hooks (phone-side JS can call these)
  (window as any).fridayWakeWord = onWakeWord;
  (window as any).fridayAIResponse = onAIResponse;
  (window as any).fridayTranscript = onTranscriptLine;
  (window as any).fridayNotification = onAINotification;
}

// ── Debug helpers for simulator ─────────────────────────────────────────

function exposeDebugAPI(): void {
  const debug = {
    getState,
    wake: () => onWakeWord('Friday'),
    chat: (msg: string) => onAIResponse(msg),
    transcript: (speaker: string, text: string) => onTranscriptLine(speaker, text),
    notify: (text: string) => onAINotification(text),
    help: () => {
      console.log(`
Friday Debug API:
  debug.wake()                    — Simulate wake word
  debug.chat("Hello!")            — Simulate AI response
  debug.transcript("S1", "Hi")   — Add transcript line
  debug.notify("Meeting in 5m")  — Add notification
  debug.getState()                — View current state

Keyboard shortcuts:
  Enter     = CLICK_EVENT (select / toggle)
  Space     = DOUBLE_CLICK_EVENT (wake / dismiss)
  ArrowUp   = SCROLL_TOP_EVENT (scroll up)
  ArrowDown = SCROLL_BOTTOM_EVENT (scroll down)
      `);
    },
  };

  (window as any).friday = debug;
  log('Debug API available: window.friday.help()');
}

// ── Start ───────────────────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
