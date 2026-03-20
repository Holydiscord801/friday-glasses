import type { VercelRequest, VercelResponse } from './_store';
import { cors, getStore } from './_store';

const SSE_TIMEOUT_MS = 30_000; // Vercel hobby tier limit
const POLL_INTERVAL_MS = 2_000;

export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — still need headers even on SSE
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET,OPTIONS');
    return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering if present

  // Flush headers immediately
  res.writeHead(200);

  // Helper to write an SSE frame
  function sendEvent(data: unknown) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  // Send the current state right away
  let lastUpdate = 0;
  const initialState = getStore();
  lastUpdate = initialState.lastUpdate;
  sendEvent(initialState);

  // Poll for changes
  const interval = setInterval(() => {
    try {
      const state = getStore();
      if (state.lastUpdate !== lastUpdate) {
        lastUpdate = state.lastUpdate;
        sendEvent(state);
      }
    } catch {
      // Swallow errors during polling; connection may already be closed.
    }
  }, POLL_INTERVAL_MS);

  // Timeout: close the connection gracefully after 30 s
  const timeout = setTimeout(() => {
    clearInterval(interval);
    try {
      res.write('event: timeout\ndata: {}\n\n');
      res.end();
    } catch {
      // Connection may already be gone.
    }
  }, SSE_TIMEOUT_MS);

  // If the client disconnects early, clean up
  req.on('close', () => {
    clearInterval(interval);
    clearTimeout(timeout);
  });
}
