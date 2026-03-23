import { useEffect, useRef } from 'react';
import { EvenAppBridge } from '@evenrealities/even_hub_sdk';
import { addConversationEntry, setProcessing, setMicOn } from '../store';
import { API_BASE } from '../api';

/**
 * useGlassesAudio — captures PCM audio from the G2 glasses mic
 * via Even SDK, detects silence, builds a WAV, and POSTs it to
 * /api/transcribe on the local Express server.
 *
 * Audio format from glasses: 16 kHz, S16LE, mono, 10 ms frames (40 bytes).
 */

const SILENCE_THRESHOLD = 328; // ~0.01 normalised (0.01 * 32767)
const SILENCE_MS = 500;
const MIN_CHUNKS = 10; // need ≥100 ms of audio before checking silence

// ── helpers ──

function computeRMS(pcm: Uint8Array): number {
  const samples = pcm.length / 2;
  if (samples === 0) return 0;
  const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let sum = 0;
  for (let i = 0; i < samples; i++) {
    const s = view.getInt16(i * 2, true);
    sum += s * s;
  }
  return Math.sqrt(sum / samples);
}

function buildWav(chunks: Uint8Array[]): Blob {
  let dataLen = 0;
  for (const c of chunks) dataLen += c.length;

  const hdr = new ArrayBuffer(44);
  const v = new DataView(hdr);

  // RIFF header
  v.setUint32(0, 0x52494646, false);  // "RIFF"
  v.setUint32(4, 36 + dataLen, true);
  v.setUint32(8, 0x57415645, false);  // "WAVE"

  // fmt  sub-chunk
  v.setUint32(12, 0x666d7420, false); // "fmt "
  v.setUint32(16, 16, true);          // chunk size
  v.setUint16(20, 1, true);           // PCM
  v.setUint16(22, 1, true);           // mono
  v.setUint32(24, 16000, true);       // sample rate
  v.setUint32(28, 32000, true);       // byte rate (16000 * 1 * 2)
  v.setUint16(32, 2, true);           // block align (1 * 2)
  v.setUint16(34, 16, true);          // bits per sample

  // data sub-chunk
  v.setUint32(36, 0x64617461, false); // "data"
  v.setUint32(40, dataLen, true);

  // Copy chunks into a single ArrayBuffer to satisfy BlobPart type
  const pcm = new Uint8Array(dataLen);
  let offset = 0;
  for (const c of chunks) { pcm.set(c, offset); offset += c.length; }

  return new Blob([hdr, pcm.buffer], { type: 'audio/wav' });
}

// ── hook ──

export function useGlassesAudio(micOn: boolean) {
  const capturingRef = useRef(false);
  const bridgeRef = useRef<EvenAppBridge | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const bufferRef = useRef<Uint8Array[]>([]);
  const lastSpeechRef = useRef(0);
  const speechSeenRef = useRef(false);

  function stopCapture() {
    if (!capturingRef.current) return;
    capturingRef.current = false;
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    if (bridgeRef.current) {
      bridgeRef.current.audioControl(false).catch(() => {});
      bridgeRef.current = null;
    }
  }

  async function flushAndSend() {
    // grab buffer and stop immediately to prevent re-entry
    capturingRef.current = false;
    const chunks = [...bufferRef.current];
    bufferRef.current = [];

    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    if (bridgeRef.current) {
      bridgeRef.current.audioControl(false).catch(() => {});
      bridgeRef.current = null;
    }

    setMicOn(false);

    if (chunks.length === 0) return;

    const wav = buildWav(chunks);
    setProcessing(true);

    try {
      const res = await fetch(`${API_BASE}/api/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'audio/wav' },
        body: wav,
      });
      if (!res.ok) throw new Error(`Transcription failed: ${res.status}`);

      const json = await res.json();
      if (json.data?.transcript) {
        addConversationEntry({
          role: 'user',
          text: json.data.transcript,
          timestamp: new Date().toISOString(),
        });
      }
      if (json.data?.response) {
        addConversationEntry({
          role: 'friday',
          text: json.data.response,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      addConversationEntry({
        role: 'friday',
        text: `Voice error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setProcessing(false);
    }
  }

  async function startCapture() {
    if (capturingRef.current) return;
    capturingRef.current = true;
    bufferRef.current = [];
    speechSeenRef.current = false;
    lastSpeechRef.current = Date.now();

    try {
      const bridge = EvenAppBridge.getInstance();
      bridgeRef.current = bridge;
      await bridge.audioControl(true);

      const unsub = bridge.onEvenHubEvent((event) => {
        if (!capturingRef.current) return;
        const audio = (event as any).audioEvent;
        if (!audio) return;

        const pcm = new Uint8Array(audio.audioPcm);
        bufferRef.current.push(pcm);

        const rms = computeRMS(pcm);
        if (rms > SILENCE_THRESHOLD) {
          speechSeenRef.current = true;
          lastSpeechRef.current = Date.now();
        }

        if (
          speechSeenRef.current &&
          bufferRef.current.length > MIN_CHUNKS &&
          Date.now() - lastSpeechRef.current > SILENCE_MS
        ) {
          flushAndSend();
        }
      });

      unsubRef.current = unsub;
    } catch (err) {
      console.error('[audio] Failed to start glasses mic:', err);
      capturingRef.current = false;
      setMicOn(false);
    }
  }

  useEffect(() => {
    if (micOn) {
      startCapture();
    } else {
      stopCapture();
    }
    return () => stopCapture();
  }, [micOn]); // eslint-disable-line react-hooks/exhaustive-deps
}
