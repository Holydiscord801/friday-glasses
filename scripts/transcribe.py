#!/usr/bin/env python3
"""Transcribe audio using faster-whisper. Called by friday-listener.js."""
import sys

from faster_whisper import WhisperModel

if len(sys.argv) < 2:
    print("Usage: transcribe.py <audio_file>", file=sys.stderr)
    sys.exit(1)

model = WhisperModel("base")
segments, _ = model.transcribe(sys.argv[1])
text = " ".join(s.text for s in segments).strip()

if text:
    print(text)
else:
    print("[inaudible]")
