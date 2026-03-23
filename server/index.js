#!/usr/bin/env node

/**
 * Friday AI Glasses — Local Express backend
 *
 * Runs on MonsterLinux as a persistent process. In-memory state,
 * direct OpenClaw + faster-whisper integration, serves the frontend.
 *
 * Usage:
 *   npm run server
 *   PORT=3737 node server/index.js
 */

import express from 'express';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3737;
const AUDIO_DIR = '/tmp/friday-audio';
const TRANSCRIBE_SCRIPT = join(__dirname, '..', 'scripts', 'transcribe.py');
const DIST_DIR = join(__dirname, '..', 'dist');

// ── In-memory state ──────────────────────────────────────────────

let store = {
  teleprompter: { content: '', scrollPosition: 0 },
  notes: [],
  contact: null,
  conversation: { entries: [] },
  pending_question: null,
  pending_audio: null,
  lastUpdate: Date.now(),
};

function getStore() {
  return store;
}

function updateStore(partial) {
  store = { ...store, ...partial, lastUpdate: Date.now() };
  return store;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Express app ──────────────────────────────────────────────────

const app = express();

// CORS — needed when frontend is served from Vercel or another origin
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '10mb' }));

// ── API Routes ───────────────────────────────────────────────────

// GET /api/state — full state snapshot
app.get('/api/state', (_req, res) => {
  res.json({ success: true, data: getStore() });
});

// POST /api/ask — accept question, call OpenClaw, return answer
app.post('/api/ask', async (req, res) => {
  const { message } = req.body ?? {};
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Missing: message' });
  }

  const text = message.trim();
  const now = new Date().toISOString();
  const userEntry = { role: 'user', text, timestamp: now };

  // Add user entry + mark as processing
  updateStore({
    conversation: { entries: [...store.conversation.entries, userEntry] },
    pending_question: text,
  });

  console.log(`[friday] Question: ${text}`);

  let answer;
  try {
    answer = await callOpenClaw(text);
  } catch (err) {
    console.error('[friday] OpenClaw error:', err.message);
    answer = `Sorry, I couldn't process that right now. (${err.message})`;
  }

  console.log(`[friday] Answer: ${answer.slice(0, 120)}${answer.length > 120 ? '...' : ''}`);

  const fridayEntry = { role: 'friday', text: answer, timestamp: new Date().toISOString() };

  updateStore({
    conversation: { entries: [...store.conversation.entries, fridayEntry] },
    pending_question: null,
  });

  res.json({
    success: true,
    data: { userMessage: userEntry, fridayResponse: fridayEntry },
  });
});

// POST /api/answer — manual answer injection
app.post('/api/answer', (req, res) => {
  const { answer } = req.body ?? {};
  if (typeof answer !== 'string' || !answer.trim()) {
    return res.status(400).json({ success: false, error: 'Missing: answer' });
  }

  const fridayEntry = { role: 'friday', text: answer.trim(), timestamp: new Date().toISOString() };

  updateStore({
    conversation: { entries: [...store.conversation.entries, fridayEntry] },
    pending_question: null,
  });

  res.json({ success: true, data: { fridayResponse: fridayEntry } });
});

// POST /api/audio — transcribe audio + call OpenClaw
app.post('/api/audio', async (req, res) => {
  const { audio } = req.body ?? {};
  if (typeof audio !== 'string' || !audio.length) {
    return res.status(400).json({ success: false, error: 'Missing: audio (base64)' });
  }

  const audioKB = Math.round(audio.length / 1024);
  console.log(`[friday] Audio received (${audioKB}KB base64)`);

  updateStore({ pending_audio: audio });

  let transcript;
  try {
    transcript = await transcribeAudio(audio);
    console.log(`[friday] Transcript: ${transcript}`);
  } catch (err) {
    console.error('[friday] Transcription error:', err.message);
    updateStore({ pending_audio: null });

    const errorEntry = {
      role: 'friday',
      text: `Couldn't understand that. (${err.message})`,
      timestamp: new Date().toISOString(),
    };
    updateStore({
      conversation: { entries: [...store.conversation.entries, errorEntry] },
    });

    return res.status(500).json({ success: false, error: err.message });
  }

  // Add user entry with transcript, transition to pending_question
  const now = new Date().toISOString();
  const userEntry = { role: 'user', text: transcript, timestamp: now };

  updateStore({
    conversation: { entries: [...store.conversation.entries, userEntry] },
    pending_audio: null,
    pending_question: transcript,
  });

  // Call OpenClaw with transcript
  let answer;
  try {
    answer = await callOpenClaw(transcript);
  } catch (err) {
    console.error('[friday] OpenClaw error:', err.message);
    answer = `Sorry, I couldn't process that. (${err.message})`;
  }

  console.log(`[friday] Answer: ${answer.slice(0, 120)}${answer.length > 120 ? '...' : ''}`);

  const fridayEntry = { role: 'friday', text: answer, timestamp: new Date().toISOString() };

  updateStore({
    conversation: { entries: [...store.conversation.entries, fridayEntry] },
    pending_question: null,
  });

  res.json({
    success: true,
    data: { transcript, userMessage: userEntry, fridayResponse: fridayEntry },
  });
});

app.delete('/api/audio', (_req, res) => {
  updateStore({ pending_audio: null });
  res.json({ success: true });
});

// POST /api/transcribe — accept raw WAV binary from glasses mic
app.post('/api/transcribe', express.raw({ type: 'audio/*', limit: '5mb' }), async (req, res) => {
  if (!req.body || req.body.length === 0) {
    return res.status(400).json({ success: false, error: 'No audio data' });
  }

  const wavKB = Math.round(req.body.length / 1024);
  console.log(`[friday] Voice received (${wavKB}KB WAV)`);

  // Save to temp file
  await mkdir(AUDIO_DIR, { recursive: true });
  const wavPath = `${AUDIO_DIR}/voice-${Date.now()}.wav`;
  await writeFile(wavPath, req.body);

  let transcript;
  try {
    const { stdout } = await execFileAsync('python3', [TRANSCRIBE_SCRIPT, wavPath], {
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });
    transcript = stdout.trim();
    if (!transcript || transcript === '[inaudible]') throw new Error('Could not transcribe');
    console.log(`[friday] Transcript: ${transcript}`);
  } catch (err) {
    await unlink(wavPath).catch(() => {});
    return res.status(500).json({ success: false, error: `Transcription failed: ${err.message}` });
  }
  await unlink(wavPath).catch(() => {});

  // Add user entry
  const userEntry = { role: 'user', text: transcript, timestamp: new Date().toISOString() };
  updateStore({
    conversation: { entries: [...store.conversation.entries, userEntry] },
    pending_question: transcript,
  });

  // Call OpenClaw
  let answer;
  try {
    answer = await callOpenClaw(transcript);
  } catch (err) {
    console.error('[friday] OpenClaw error:', err.message);
    answer = `Sorry, I couldn't process that. (${err.message})`;
  }

  console.log(`[friday] Answer: ${answer.slice(0, 120)}${answer.length > 120 ? '...' : ''}`);

  const fridayEntry = { role: 'friday', text: answer, timestamp: new Date().toISOString() };
  updateStore({
    conversation: { entries: [...store.conversation.entries, fridayEntry] },
    pending_question: null,
  });

  res.json({
    success: true,
    data: { transcript, response: answer },
  });
});

// POST /api/conversation — legacy alias for /api/ask
app.post('/api/conversation', async (req, res) => {
  req.url = '/api/ask';
  app.handle(req, res);
});

// ── Teleprompter ──

app.get('/api/teleprompter', (_req, res) => {
  res.json({ success: true, data: store.teleprompter });
});

app.post('/api/teleprompter', (req, res) => {
  const { content } = req.body ?? {};
  if (typeof content !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing: content (string)' });
  }
  updateStore({ teleprompter: { content, scrollPosition: 0 } });
  res.json({ success: true, data: { content } });
});

// ── Notes ──

app.get('/api/notes', (_req, res) => {
  res.json({ success: true, data: store.notes });
});

app.post('/api/notes', (req, res) => {
  const { title, content } = req.body ?? {};
  if (typeof title !== 'string' || typeof content !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing: title, content (strings)' });
  }
  const note = { id: generateId(), title, content, createdAt: new Date().toISOString() };
  updateStore({ notes: [...store.notes, note] });
  res.status(201).json({ success: true, data: note });
});

app.delete('/api/notes', (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ success: false, error: 'Missing query: id' });
  const before = store.notes.length;
  const notes = store.notes.filter((n) => n.id !== id);
  if (notes.length === before) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }
  updateStore({ notes });
  res.json({ success: true, data: { deleted: id } });
});

// ── Contact ──

app.get('/api/contact', (_req, res) => {
  res.json({ success: true, data: store.contact });
});

app.post('/api/contact', (req, res) => {
  const { name, title, company, context, talking_points } = req.body ?? {};
  if (typeof name !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing: name (string)' });
  }
  const contact = {
    name,
    title: typeof title === 'string' ? title : '',
    company: typeof company === 'string' ? company : '',
    context: typeof context === 'string' ? context : '',
    talking_points: Array.isArray(talking_points) ? talking_points : [],
  };
  updateStore({ contact });
  res.json({ success: true, data: contact });
});

app.delete('/api/contact', (_req, res) => {
  updateStore({ contact: null });
  res.json({ success: true, data: null });
});

// ── Command (multi-action) ──

app.post('/api/command', (req, res) => {
  const { action, payload } = req.body ?? {};
  if (typeof action !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing: action (string)' });
  }

  switch (action) {
    case 'set_teleprompter': {
      const content = payload?.content;
      if (typeof content !== 'string') {
        return res.status(400).json({ success: false, error: 'payload.content required' });
      }
      updateStore({ teleprompter: { content, scrollPosition: 0 } });
      return res.json({ success: true, action, data: { content } });
    }
    case 'clear_teleprompter':
      updateStore({ teleprompter: { content: '', scrollPosition: 0 } });
      return res.json({ success: true, action, data: { content: '' } });

    case 'add_note': {
      const { title, content } = payload ?? {};
      if (typeof title !== 'string' || typeof content !== 'string') {
        return res.status(400).json({ success: false, error: 'payload.title + payload.content required' });
      }
      const note = { id: generateId(), title, content, createdAt: new Date().toISOString() };
      updateStore({ notes: [...store.notes, note] });
      return res.json({ success: true, action, data: note });
    }
    case 'clear_notes':
      updateStore({ notes: [] });
      return res.json({ success: true, action, data: { notes: [] } });

    case 'set_contact': {
      if (!payload || typeof payload.name !== 'string') {
        return res.status(400).json({ success: false, error: 'payload.name required' });
      }
      const contact = {
        name: payload.name,
        title: typeof payload.title === 'string' ? payload.title : '',
        company: typeof payload.company === 'string' ? payload.company : '',
        context: typeof payload.context === 'string' ? payload.context : '',
        talking_points: Array.isArray(payload.talking_points) ? payload.talking_points : [],
      };
      updateStore({ contact });
      return res.json({ success: true, action, data: contact });
    }
    case 'clear_contact':
      updateStore({ contact: null });
      return res.json({ success: true, action, data: null });

    default:
      return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  }
});

// ── Static frontend (serves built Vite app) ──

app.use(express.static(DIST_DIR));
app.get('/{*path}', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(join(DIST_DIR, 'index.html'));
  }
});

// ── Helpers ──────────────────────────────────────────────────────

async function callOpenClaw(message) {
  const { stdout } = await execFileAsync(
    'openclaw',
    ['agent', '--session-id', 'main', '--message', message, '--json'],
    { timeout: 60_000, maxBuffer: 1024 * 1024 },
  );
  try {
    // Strip plugin log lines before the JSON
    const jsonStart = stdout.indexOf('{');
    const clean = jsonStart >= 0 ? stdout.slice(jsonStart) : stdout;
    const json = JSON.parse(clean.trim());
    return (
      json?.result?.payloads?.[0]?.text ||
      json.response || json.message || json.answer || json.text || json.content ||
      'No response.'
    );
  } catch {
    return stdout.trim() || 'No response from OpenClaw.';
  }
}

async function transcribeAudio(base64Audio) {
  await mkdir(AUDIO_DIR, { recursive: true });
  const audioPath = `${AUDIO_DIR}/voice-${Date.now()}.webm`;
  await writeFile(audioPath, Buffer.from(base64Audio, 'base64'));
  try {
    const { stdout } = await execFileAsync('python3', [TRANSCRIBE_SCRIPT, audioPath], {
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });
    const transcript = stdout.trim();
    if (!transcript || transcript === '[inaudible]') {
      throw new Error('Could not transcribe audio');
    }
    return transcript;
  } finally {
    await unlink(audioPath).catch(() => {});
  }
}

// ── Start ────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[friday] Server running on http://0.0.0.0:${PORT}`);
  console.log(`[friday] Open http://localhost:${PORT} in the Even app`);
  console.log(`[friday] API: http://localhost:${PORT}/api/state`);
  console.log(`[friday] Ctrl+C to stop\n`);
});
