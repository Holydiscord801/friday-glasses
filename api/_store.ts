import type { IncomingMessage, ServerResponse } from 'http';

// ---------------------------------------------------------------------------
// Vercel-compatible request / response interfaces
// ---------------------------------------------------------------------------

export interface VercelRequest extends IncomingMessage {
  query: Record<string, string | string[]>;
  body: any;
}

export interface VercelResponse extends ServerResponse {
  status(code: number): VercelResponse;
  json(body: any): VercelResponse;
  send(body: any): VercelResponse;
}

// ---------------------------------------------------------------------------
// Server state
// ---------------------------------------------------------------------------

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface Contact {
  name: string;
  title: string;
  company: string;
  context: string;
  talking_points: string[];
}

export interface ConversationEntry {
  role: 'user' | 'friday';
  text: string;
  timestamp: string;
}

export interface ServerState {
  teleprompter: { content: string; scrollPosition: number };
  notes: Note[];
  contact: Contact | null;
  conversation: { entries: ConversationEntry[] };
  pending_question: string | null;
  pending_audio: string | null;
  lastUpdate: number;
}

const defaultState: ServerState = {
  teleprompter: { content: '', scrollPosition: 0 },
  notes: [],
  contact: null,
  conversation: { entries: [] },
  pending_question: null,
  pending_audio: null,
  lastUpdate: Date.now(),
};

// Persist across warm function invocations
const g = globalThis as unknown as { __fridayStore?: ServerState };
if (!g.__fridayStore) {
  g.__fridayStore = { ...defaultState };
}

export function getStore(): ServerState {
  return g.__fridayStore!;
}

export function updateStore(partial: Partial<ServerState>): ServerState {
  g.__fridayStore = { ...g.__fridayStore!, ...partial, lastUpdate: Date.now() };
  return g.__fridayStore;
}

// ---------------------------------------------------------------------------
// CORS helper – returns true if the request was a preflight (already handled)
// ---------------------------------------------------------------------------

export function cors(req: VercelRequest, res: VercelResponse): boolean {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Utility: generate a short unique id
// ---------------------------------------------------------------------------

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
