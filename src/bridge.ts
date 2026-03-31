// ── Even Hub SDK Bridge ─────────────────────────────────────────────────
// Wraps bridge.callEvenApp() and event listeners into a typed interface.
// In production this calls the real SDK; in dev/simulator it logs to console.

import type { Container, GlassesEvent, PageParams } from './types';
import { log } from './logger';

// The SDK injects `bridge` onto the WebView's window object
declare global {
  interface Window {
    bridge?: {
      callEvenApp(method: string, params: string): void;
      audioControl(enabled: boolean): void;
      imuControl(isOpen: boolean, reportFrq?: number): void;
      getDeviceInfo(): Promise<unknown>;
      getUserInfo(): Promise<unknown>;
      setLocalStorage(key: string, value: string): void;
      getLocalStorage(key: string): string | null;
      onEvenHubEvent?(callback: (event: string) => void): void;
    };
    _listenEvenAppMessage?(message: string): void;
  }
}

type EventCallback = (event: GlassesEvent) => void;

let eventCallback: EventCallback | null = null;
let isSimulator = false;

// ── Initialization ──────────────────────────────────────────────────────

export function initBridge(): boolean {
  if (window.bridge && typeof window.bridge.callEvenApp === 'function') {
    log('Bridge: connected to Even Hub SDK');
    return true;
  }

  // Running outside Even Hub — simulator mode
  isSimulator = true;
  log('Bridge: simulator mode (no SDK detected)');

  // Create a stub bridge for local development
  window.bridge = {
    callEvenApp(method: string, params: string) {
      log(`[SIM] callEvenApp(${method}, ${params.substring(0, 120)}...)`);
    },
    audioControl(enabled: boolean) {
      log(`[SIM] audioControl(${enabled})`);
    },
    imuControl(isOpen: boolean) {
      log(`[SIM] imuControl(${isOpen})`);
    },
    async getDeviceInfo() {
      return { model: 'G2-SIM', battery: 85, wearing: true };
    },
    async getUserInfo() {
      return { uid: 'sim-user', name: 'Dev User' };
    },
    setLocalStorage(key: string, value: string) {
      localStorage.setItem(`friday_${key}`, value);
    },
    getLocalStorage(key: string) {
      return localStorage.getItem(`friday_${key}`);
    },
  };

  return false;
}

export function isSimulatorMode(): boolean {
  return isSimulator;
}

// ── Event handling ──────────────────────────────────────────────────────

export function registerEventHandler(cb: EventCallback): void {
  eventCallback = cb;

  // SDK callback path
  window._listenEvenAppMessage = (message: string) => {
    try {
      const parsed = JSON.parse(message);
      if (parsed?.eventType && eventCallback) {
        eventCallback(parsed.eventType as GlassesEvent);
      }
    } catch {
      log(`Bridge: failed to parse event: ${message}`);
    }
  };

  // Keyboard fallback for simulator
  if (isSimulator) {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!eventCallback) return;
      switch (e.key) {
        case 'Enter': eventCallback('CLICK_EVENT'); break;
        case ' ':     eventCallback('DOUBLE_CLICK_EVENT'); break;
        case 'ArrowUp':   eventCallback('SCROLL_TOP_EVENT'); break;
        case 'ArrowDown': eventCallback('SCROLL_BOTTOM_EVENT'); break;
      }
    });
    log('Bridge: keyboard shortcuts active (Enter=click, Space=double, Arrows=scroll)');
  }
}

// ── Page management ─────────────────────────────────────────────────────

function callApp(method: string, params: PageParams | object): void {
  const json = JSON.stringify(params);
  log(`Bridge: ${method}`);
  window.bridge!.callEvenApp(method, json);
}

export function createStartUpPage(containers: Container[]): void {
  callApp('createStartUpPageContainer', {
    layoutMode: 0,
    containers,
  });
}

export function rebuildPage(containers: Container[]): void {
  callApp('rebuildPageContainer', {
    layoutMode: 0,
    containers,
  });
}

export function updateText(containerIdx: number, text: string): void {
  callApp('textContainerUpgrade', {
    containerIdx,
    textContent: text,
  });
}

export function shutDown(showDialog: boolean = false): void {
  callApp('shutDownPageContainer', {
    showDialog: showDialog ? 1 : 0,
  });
}

// ── Device APIs ─────────────────────────────────────────────────────────

export function audioControl(enabled: boolean): void {
  log(`Bridge: audioControl(${enabled})`);
  window.bridge!.audioControl(enabled);
}

export function saveLocal(key: string, value: string): void {
  window.bridge!.setLocalStorage(key, value);
}

export function loadLocal(key: string): string | null {
  return window.bridge!.getLocalStorage(key);
}
