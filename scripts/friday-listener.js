#!/usr/bin/env node

/**
 * friday-listener.js
 *
 * Polls the Friday glasses app for pending questions and audio,
 * routes them through faster-whisper (audio) and OpenClaw (AI),
 * and posts the responses back.
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
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const BASE_URL = process.env.FRIDAY_URL || 'https://friday-glasses.vercel.app';
const POLL_MS = parseInt(process.env.POLL_MS || '2000', 10);
const AUDIO_DIR = '/tmp/friday-audio';
const __dirname = dirname(fileURLToPath(import.meta.url));
const TRANSCRIBE_SCRIPT = join(__dirname, 'transcribe.py');

let processing = false;

async function poll() {
  if (processing) return;

  try {
    const res = await fetch(`${BASE_URL}/api/state`);
    if (!res.ok) return;

    const json = await res.json();
    const state = json.data;

    // ── 1. Handle pending audio (transcribe → post as question) ──

    if (state?.pending_audio) {
      processing = true;
      const audioLen = Math.round(state.pending_audio.length / 1024);
      console.log(`[friday] Audio received (${audioLen}KB base64)`);

      try {
        const transcript = await transcribeAudio(state.pending_audio);
        console.log(`[friday] Transcript: ${transcript}`);

        // Post transcript as a question (sets pending_question server-side)
        await fetch(`${BASE_URL}/api/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: transcript }),
        });

        // Clear the pending audio (pending_question is already set)
        await fetch(`${BASE_URL}/api/audio`, { method: 'DELETE' });
      } catch (err) {
        console.error('[friday] Audio/transcription error:', err.message);

        // Clear audio and post error as answer
        await fetch(`${BASE_URL}/api/audio`, { method: 'DELETE' }).catch(() => {});
        await fetch(`${BASE_URL}/api/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answer: `Sorry, I couldn't understand that. (${err.message})`,
          }),
        }).catch(() => {});
      } finally {
        processing = false;
      }
      return; // Next cycle will pick up the pending_question
    }

    // ── 2. Handle pending question (route through OpenClaw) ──

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
    // Clean up temp file
    await unlink(audioPath).catch(() => {});
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
console.log(`[friday] Audio transcription via faster-whisper`);
console.log(`[friday] Ctrl+C to stop\n`);

// Initial poll, then interval
poll();
setInterval(poll, POLL_MS);
