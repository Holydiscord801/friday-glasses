// ── Even Hub SDK Bridge ─────────────────────────────────────────────────
// Uses waitForEvenAppBridge() from the SDK — the async pattern the simulator expects.

import {
  waitForEvenAppBridge,
  type EvenAppBridge,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerProperty,
  TextContainerUpgrade as SDKTextContainerUpgrade,
  ListContainerProperty,
  ListItemContainerProperty,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk';
import type { Container, GlassesEvent, TextContainer, ListContainer } from './types';
import { log } from './logger';

type EventCallback = (event: GlassesEvent) => void;

let _bridge: EvenAppBridge | null = null;
let _isSimulator = false;

// ── Initialization ──────────────────────────────────────────────────────

export async function initBridge(timeoutMs = 5000): Promise<boolean> {
  try {
    const p = waitForEvenAppBridge();
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Bridge timeout')), timeoutMs)
    );
    _bridge = await Promise.race([p, timeout]);
    log('Bridge: connected to Even Hub SDK');
    return true;
  } catch {
    _isSimulator = true;
    log('Bridge: running without SDK (browser-only mode)');
    return false;
  }
}

export function isSimulatorMode(): boolean {
  return _isSimulator;
}

// ── Container conversion ─────────────────────────────────────────────────

function toTextProperty(c: TextContainer): TextContainerProperty {
  return new TextContainerProperty({
    containerID: c.containerIdx,
    containerName: `text-${c.containerIdx}`,
    content: c.textContent.substring(0, 1000),
    xPosition: c.positionX,
    yPosition: c.positionY,
    width: c.width,
    height: c.height,
    isEventCapture: c.isEventCapture,
    borderWidth: c.borderWidth ?? 0,
  });
}

function toListProperty(c: ListContainer): ListContainerProperty {
  const items = c.listContent.slice(0, 20).map(s => s.substring(0, 64));
  return new ListContainerProperty({
    containerID: c.containerIdx,
    containerName: `list-${c.containerIdx}`,
    xPosition: c.positionX,
    yPosition: c.positionY,
    width: c.width,
    height: c.height,
    isEventCapture: c.isEventCapture,
    borderWidth: c.borderWidth ?? 0,
    itemContainer: new ListItemContainerProperty({
      itemCount: items.length,
      itemWidth: c.width,
      isItemSelectBorderEn: 1,
      itemName: items,
    }),
  });
}

function buildPagePayload(containers: Container[]) {
  const textObjects: TextContainerProperty[] = [];
  const listObjects: ListContainerProperty[] = [];

  for (const c of containers) {
    if (c.containerType === 0) {
      textObjects.push(toTextProperty(c));
    } else if (c.containerType === 1) {
      listObjects.push(toListProperty(c));
    }
    // containerType === 2 (image) skipped — requires updateImageRawData after startup
  }

  return {
    containerTotalNum: containers.length,
    ...(textObjects.length > 0 && { textObject: textObjects }),
    ...(listObjects.length > 0 && { listObject: listObjects }),
  };
}

// ── Event handling ──────────────────────────────────────────────────────

const EVENT_MAP: Partial<Record<OsEventTypeList, GlassesEvent>> = {
  [OsEventTypeList.CLICK_EVENT]: 'CLICK_EVENT',
  [OsEventTypeList.DOUBLE_CLICK_EVENT]: 'DOUBLE_CLICK_EVENT',
  [OsEventTypeList.SCROLL_TOP_EVENT]: 'SCROLL_TOP_EVENT',
  [OsEventTypeList.SCROLL_BOTTOM_EVENT]: 'SCROLL_BOTTOM_EVENT',
  [OsEventTypeList.FOREGROUND_ENTER_EVENT]: 'FOREGROUND_ENTER_EVENT',
  [OsEventTypeList.FOREGROUND_EXIT_EVENT]: 'FOREGROUND_EXIT_EVENT',
  [OsEventTypeList.ABNORMAL_EXIT_EVENT]: 'ABNORMAL_EXIT_EVENT',
};

// ── Incoming list selection index ────────────────────────────────────────
// The simulator handles Up/Down navigation internally for list containers.
// When Click is pressed, it sends a listEvent with currentSelectItemIndex.
// We expose this so the app can sync its selection state before handling CLICK.
let _incomingListIndex = -1;

/** Returns the list index from the most recent simulator list event, or -1. */
export function getIncomingListIndex(): number {
  return _incomingListIndex;
}

/**
 * Extract the raw event type from all the places the simulator might put it.
 * Mirrors the demo apps' getRawEventType() from _shared/even-events.ts.
 */
function getRawEventType(event: any): unknown {
  const raw = (event?.jsonData ?? {}) as Record<string, unknown>;
  return (
    event?.listEvent?.eventType ??
    event?.textEvent?.eventType ??
    event?.sysEvent?.eventType ??
    event?.eventType ??
    raw.eventType ??
    raw.event_type ??
    raw.Event_Type ??
    raw.type
  );
}

/**
 * Normalize a raw event type value (number or string) to an OsEventTypeList.
 * Mirrors the demo apps' normalizeEventType() from _shared/even-events.ts.
 */
function normalizeEventType(rawEventType: unknown): OsEventTypeList | undefined {
  if (typeof rawEventType === 'number') {
    switch (rawEventType) {
      case 0: return OsEventTypeList.CLICK_EVENT;
      case 1: return OsEventTypeList.SCROLL_TOP_EVENT;
      case 2: return OsEventTypeList.SCROLL_BOTTOM_EVENT;
      case 3: return OsEventTypeList.DOUBLE_CLICK_EVENT;
      default: return undefined;
    }
  }
  if (typeof rawEventType === 'string') {
    const value = rawEventType.toUpperCase();
    if (value.includes('DOUBLE')) return OsEventTypeList.DOUBLE_CLICK_EVENT;
    if (value.includes('CLICK')) return OsEventTypeList.CLICK_EVENT;
    if (value.includes('SCROLL_TOP') || value.includes('UP')) return OsEventTypeList.SCROLL_TOP_EVENT;
    if (value.includes('SCROLL_BOTTOM') || value.includes('DOWN')) return OsEventTypeList.SCROLL_BOTTOM_EVENT;
  }
  return undefined;
}

/**
 * Parse the incoming list selection index from a list event.
 */
function parseListIndex(event: any): number {
  const raw = (event?.jsonData ?? {}) as Record<string, unknown>;
  const idxRaw = event?.listEvent?.currentSelectItemIndex
    ?? raw.currentSelectItemIndex
    ?? raw.current_select_item_index;
  if (typeof idxRaw === 'number') return idxRaw;
  if (typeof idxRaw === 'string') {
    const parsed = Number.parseInt(idxRaw, 10);
    return Number.isNaN(parsed) ? -1 : parsed;
  }
  return -1;
}

export function registerEventHandler(cb: EventCallback): void {
  if (_bridge) {
    _bridge.onEvenHubEvent((event) => {
      // 1. Try to get event type from all known locations
      const rawType = getRawEventType(event);
      let eventType = normalizeEventType(rawType);

      // 2. Simulator fallback: list events often arrive without eventType.
      //    The simulator handles Up/Down internally for lists; it only sends
      //    events on Click. So any list event = CLICK_EVENT.
      //    The currentSelectItemIndex tells us WHICH item was clicked.
      if (eventType === undefined && event.listEvent) {
        const idx = parseListIndex(event);
        _incomingListIndex = idx >= 0 ? idx : 0;
        eventType = OsEventTypeList.CLICK_EVENT;
      }

      // 3. Simulator fallback: for text containers, the Click button sends
      //    a sysEvent with eventSource but no eventType. Treat as CLICK.
      if (eventType === undefined && event.sysEvent) {
        const raw = (event?.jsonData ?? {}) as Record<string, unknown>;
        const src = event.sysEvent?.eventSource ?? raw.eventSource;
        if (src !== undefined) {
          eventType = OsEventTypeList.CLICK_EVENT;
        }
      }

      if (eventType !== undefined) {
        const mapped = EVENT_MAP[eventType];
        if (mapped) cb(mapped);
      }
    });
  }

  // Keyboard shortcuts — always registered for browser-based testing
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':     cb('CLICK_EVENT'); break;
      case ' ':         e.preventDefault(); cb('DOUBLE_CLICK_EVENT'); break;
      case 'ArrowUp':   e.preventDefault(); cb('SCROLL_TOP_EVENT'); break;
      case 'ArrowDown': e.preventDefault(); cb('SCROLL_BOTTOM_EVENT'); break;
    }
  });
  log('Bridge: keyboard shortcuts active (Enter=click, Space=double, Arrows=scroll)');
}

// ── Page management ─────────────────────────────────────────────────────

export function createStartUpPage(containers: Container[]): void {
  if (!_bridge) {
    log('[SIM] createStartUpPage — no bridge');
    return;
  }
  const payload = buildPagePayload(containers);
  void _bridge.createStartUpPageContainer(new CreateStartUpPageContainer(payload));
}

export function rebuildPage(containers: Container[]): void {
  if (!_bridge) {
    log('[SIM] rebuildPage — no bridge');
    return;
  }
  const payload = buildPagePayload(containers);
  void _bridge.rebuildPageContainer(new RebuildPageContainer(payload));
}

export function updateText(containerIdx: number, text: string): void {
  if (!_bridge) {
    log(`[SIM] updateText(${containerIdx})`);
    return;
  }
  void _bridge.textContainerUpgrade(new SDKTextContainerUpgrade({
    containerID: containerIdx,
    contentOffset: 0,
    content: text,
  }));
}

export function shutDown(showDialog = false): void {
  if (!_bridge) {
    log('[SIM] shutDown');
    return;
  }
  void _bridge.shutDownPageContainer(showDialog ? 1 : 0);
}

// ── Device APIs ─────────────────────────────────────────────────────────

export function audioControl(enabled: boolean): void {
  if (!_bridge) {
    log(`[SIM] audioControl(${enabled})`);
    return;
  }
  void _bridge.audioControl(enabled);
}

// localStorage is used directly for synchronous reads; SDK storage is async.
export function saveLocal(key: string, value: string): void {
  localStorage.setItem(`friday_${key}`, value);
  if (_bridge) {
    void _bridge.setLocalStorage(key, value);
  }
}

export function loadLocal(key: string): string | null {
  return localStorage.getItem(`friday_${key}`);
}
