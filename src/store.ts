import type { AppState, Note, ContactCard, ConversationEntry, PageName } from './types';

const initialState: AppState = {
  currentPage: 'home',
  teleprompter: { content: '', scrollPosition: 0 },
  notes: [],
  contact: null,
  conversation: { micOn: false, entries: [], isProcessing: false },
  glasses: { connected: false, battery: 100 },
  settings: { fontSize: 16, scrollSpeed: 1, darkMode: true, showBattery: true },
  lastUpdate: Date.now(),
};

type Listener = () => void;
const listeners = new Set<Listener>();

let state: AppState = { ...initialState };

export function getState(): AppState {
  return state;
}

function setState(partial: Partial<AppState>) {
  state = { ...state, ...partial, lastUpdate: Date.now() };
  listeners.forEach(fn => fn());
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Snapshot for useGlasses - returns same reference if unchanged
let snapshotRef = state;
export function getSnapshot(): AppState {
  if (snapshotRef.lastUpdate !== state.lastUpdate) {
    snapshotRef = state;
  }
  return snapshotRef;
}

// ── Actions ──

export function setPage(page: PageName) {
  setState({ currentPage: page });
}

export function setTeleprompter(content: string) {
  setState({ teleprompter: { content, scrollPosition: 0 } });
}

export function scrollTeleprompter(direction: 'up' | 'down') {
  const delta = direction === 'down' ? 1 : -1;
  setState({
    teleprompter: {
      ...state.teleprompter,
      scrollPosition: Math.max(0, state.teleprompter.scrollPosition + delta),
    },
  });
}

export function clearTeleprompter() {
  setState({ teleprompter: { content: '', scrollPosition: 0 } });
}

export function addNote(note: Note) {
  setState({ notes: [note, ...state.notes] });
}

export function deleteNote(id: string) {
  setState({ notes: state.notes.filter(n => n.id !== id) });
}

export function setContact(contact: ContactCard | null) {
  setState({ contact });
}

export function toggleMic() {
  setState({
    conversation: { ...state.conversation, micOn: !state.conversation.micOn },
  });
}

export function addConversationEntry(entry: ConversationEntry) {
  setState({
    conversation: {
      ...state.conversation,
      entries: [...state.conversation.entries, entry],
    },
  });
}

export function setProcessing(isProcessing: boolean) {
  setState({
    conversation: { ...state.conversation, isProcessing },
  });
}

export function clearConversation() {
  setState({
    conversation: { micOn: false, entries: [], isProcessing: false },
  });
}

export function setGlassesStatus(glasses: Partial<AppState['glasses']>) {
  setState({ glasses: { ...state.glasses, ...glasses } });
}

export function updateSettings(settings: Partial<AppState['settings']>) {
  setState({ settings: { ...state.settings, ...settings } });
}

// ── Polling for remote updates ──

let pollTimer: ReturnType<typeof setInterval> | null = null;

export function startPolling(intervalMs = 2000) {
  if (pollTimer) return;
  pollTimer = setInterval(async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) {
        setGlassesStatus({ connected: false });
        return;
      }
      const json = await res.json();
      setGlassesStatus({ connected: true });
      const remote = json.data;
      if (remote?.lastUpdate && remote.lastUpdate > state.lastUpdate) {
        if (remote.teleprompter) setState({ teleprompter: remote.teleprompter });
        if (remote.notes) setState({ notes: remote.notes });
        if (remote.contact !== undefined) setState({ contact: remote.contact });
        if (remote.conversation) {
          setState({
            conversation: {
              ...state.conversation,
              entries: remote.conversation.entries ?? state.conversation.entries,
              isProcessing: remote.pending_question != null,
            },
          });
        }
      }
    } catch {
      setGlassesStatus({ connected: false });
    }
  }, intervalMs);
}

export function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
