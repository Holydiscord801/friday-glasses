#!/usr/bin/env node

/**
 * friday-listener.js
 *
 * Polls the Friday glasses app for pending questions, routes them
 * through OpenClaw (local Claude agent), and posts the response back.
 *
 * Usage:
 *   node scripts/friday-listener.js
 *   FRIDAY_URL=https://friday-glasses.vercel.app node scripts/friday-listener.js
 *
 * Environment:
 *   FRIDAY_URL  — base URL of the deployed app (default: https://friday-glasses.vercel.app)
 *   POLL_MS     — polling interval in ms (default: 2000)
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const BASE_URL = process.env.FRIDAY_URL || 'https://friday-glasses.vercel.app';
const POLL_MS = parseInt(process.env.POLL_MS || '2000', 10);

let processing = false;

async function poll() {
  if (processing) return;

  try {
    const res = await fetch(`${BASE_URL}/api/state`);
    if (!res.ok) return;

    const json = await res.json();
    const state = json.data;
    const question = state?.pending_question;

    if (!question) return;

    processing = true;
    console.log(`[friday] Question: ${question}`);

    let answer;
    try {
      answer = await callOpenClaw(question);
    } catch (err) {
      console.error('[friday] OpenClaw error:', err.message);
      answer = `Sorry, I couldn't process that right now. (${err.message})`;
    }

    console.log(`[friday] Answer: ${answer.slice(0, 120)}${answer.length > 120 ? '...' : ''}`);

    // Post the answer back
    const postRes = await fetch(`${BASE_URL}/api/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer }),
    });

    if (!postRes.ok) {
      console.error(`[friday] Failed to post answer: ${postRes.status}`);
    }
  } catch (err) {
    // Network error — will retry next cycle
  } finally {
    processing = false;
  }
}

async function callOpenClaw(message) {
  const { stdout } = await execFileAsync('openclaw', ['agent', '--message', message, '--json'], {
    timeout: 60_000,
    maxBuffer: 1024 * 1024,
  });

  // Try to parse as JSON first
  try {
    const json = JSON.parse(stdout.trim());
    // Handle common response shapes
    return json.response || json.message || json.answer || json.text || json.content || JSON.stringify(json);
  } catch {
    // Not JSON — return raw text, trimmed
    return stdout.trim() || 'No response from OpenClaw.';
  }
}

// ── Main ──

console.log(`[friday] Listener started`);
console.log(`[friday] Polling ${BASE_URL}/api/state every ${POLL_MS}ms`);
console.log(`[friday] Ctrl+C to stop\n`);

// Initial poll, then interval
poll();
setInterval(poll, POLL_MS);
