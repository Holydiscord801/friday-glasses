// ── Even Hub SDK type declarations ──────────────────────────────────────
// The SDK is a JS-only package; we declare what we use here.

export interface TextContainer {
  containerType: 0; // text
  containerIdx: number;
  textContent: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  isEventCapture: 0 | 1;
  borderWidth?: number;
}

export interface ListContainer {
  containerType: 1; // list
  containerIdx: number;
  listContent: string[];
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  isEventCapture: 0 | 1;
  borderWidth?: number;
}

export interface ImageContainer {
  containerType: 2; // image
  containerIdx: number;
  imageData: string; // placeholder on create
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  isEventCapture: 0 | 1;
}

export type Container = TextContainer | ListContainer | ImageContainer;

export type PageParams = {
  layoutMode?: number; // 0 = binocular (default)
  containers: Container[];
};

// ── Input events from glasses ───────────────────────────────────────────

export type GlassesEvent =
  | 'CLICK_EVENT'
  | 'DOUBLE_CLICK_EVENT'
  | 'SCROLL_TOP_EVENT'
  | 'SCROLL_BOTTOM_EVENT'
  | 'FOREGROUND_ENTER_EVENT'
  | 'FOREGROUND_EXIT_EVENT'
  | 'ABNORMAL_EXIT_EVENT';

// ── App state machine ───────────────────────────────────────────────────

export type AppScreen =
  | 'sleep'
  | 'welcome'
  | 'main'
  | 'drawer'
  | 'chat'
  | 'teleprompter'
  | 'conversation'
  | 'coming_soon'
  | 'settings';

export type AIProvider = 'claude' | 'gemini' | 'chatgpt' | 'openclaw';

export interface AppState {
  screen: AppScreen;
  selectedAI: AIProvider | null;
  welcomeIndex: number;       // cursor position on welcome screen
  drawerIndex: number;        // cursor position in drawer menu
  chatMessages: string[];     // message history
  chatInput: string;          // current pending input
  teleprompterText: string;   // text to display
  teleprompterPage: number;   // current page index
  teleprompterPages: string[]; // pre-paginated chunks
  conversationTranscript: string[];
  conversationNotifications: string[];
  isRecording: boolean;
  inactivityTimer: number | null;    // timeout ID for auto-sleep
  wakeWord: string;                   // configurable wake word
  sleepTimeoutMs: number;             // inactivity timeout in ms
  settingsIndex: number;              // cursor position in settings menu
}

export function createInitialState(): AppState {
  return {
    screen: 'sleep',
    selectedAI: 'claude',
    welcomeIndex: 0,
    drawerIndex: 0,
    chatMessages: [],
    chatInput: '',
    teleprompterText: '',
    teleprompterPage: 0,
    teleprompterPages: [],
    conversationTranscript: [],
    conversationNotifications: [],
    isRecording: false,
    inactivityTimer: null,
    wakeWord: 'Friday',
    sleepTimeoutMs: 30_000,  // 30 seconds default
    settingsIndex: 0,
  };
}
