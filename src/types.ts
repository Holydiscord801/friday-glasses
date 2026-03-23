export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface ContactCard {
  name: string;
  title: string;
  company: string;
  context: string;
  talking_points: string[];
}

export interface TeleprompterState {
  content: string;
  scrollPosition: number;
}

export interface ConversationEntry {
  role: 'user' | 'friday';
  text: string;
  timestamp: string;
}

export interface AppState {
  currentPage: PageName;
  teleprompter: TeleprompterState;
  notes: Note[];
  contact: ContactCard | null;
  conversation: {
    micOn: boolean;
    entries: ConversationEntry[];
    isProcessing: boolean;
    scrollOffset: number;
  };
  glasses: {
    connected: boolean;
    battery: number;
  };
  settings: {
    fontSize: number;
    scrollSpeed: number;
    darkMode: boolean;
    showBattery: boolean;
  };
  flashMessage: string | null;
  viewingNoteIndex: number;
  lastUpdate: number;
}

export type PageName = 'home' | 'teleprompter' | 'conversation' | 'notes' | 'note-detail' | 'contact' | 'settings';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FridayCommand {
  action: string;
  payload: Record<string, unknown>;
}
