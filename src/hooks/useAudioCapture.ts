import { useState, useRef, useCallback } from 'react';
import { addConversationEntry, setProcessing } from '../store';
import { API_BASE } from '../api';

/**
 * useAudioCapture — captures audio from the phone's browser mic,
 * encodes as base64 webm, and POSTs to /api/audio for transcription.
 *
 * Even SDK glasses mic capture is a future enhancement — for now
 * this uses the standard Web Audio / MediaRecorder API.
 */
export function useAudioCapture() {
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });

      // Pick a supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Release the mic
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        if (blob.size < 100) return; // Too short / empty

        // Convert to base64
        const buf = await blob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), ''),
        );

        setProcessing(true);

        try {
          const res = await fetch(`${API_BASE}/api/audio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio: base64 }),
          });
          if (!res.ok) throw new Error(`Upload failed: ${res.status}`);

          const json = await res.json();
          const transcript = json.data?.transcript;
          if (transcript) {
            addConversationEntry({
              role: 'user',
              text: transcript,
              timestamp: json.data.userMessage?.timestamp || new Date().toISOString(),
            });
          }
          const fridayText = json.data?.fridayResponse?.text;
          if (fridayText) {
            addConversationEntry({
              role: 'friday',
              text: fridayText,
              timestamp: json.data.fridayResponse.timestamp || new Date().toISOString(),
            });
          }
        } catch (err) {
          addConversationEntry({
            role: 'friday',
            text: `Audio error: ${err instanceof Error ? err.message : 'Unknown error'}`,
            timestamp: new Date().toISOString(),
          });
        } finally {
          setProcessing(false);
        }
      };

      recorderRef.current = recorder;
      recorder.start(250); // Collect chunks every 250ms
      setIsRecording(true);
    } catch (err) {
      console.error('[audio] getUserMedia failed:', err);
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return { isRecording, toggleRecording };
}
