#!/usr/bin/env bash
# Downloads the audio of the official Endshow video for LOCAL, personal use only.
# Requires yt-dlp (https://github.com/yt-dlp/yt-dlp) and ffmpeg on your machine.
# FALLBACK ONLY: the show's audio map and sync were measured on the 48 kHz MP3 (public/assets/audio/endshow-2026.mp3,
# 25298732 bytes); the YouTube soundtrack is about 36 ms behind it, and the app prefers an .m4a over the .mp3 when both
# exist. Use the MP3 when you have it (HANDOFF.md step 6).
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=public/assets/audio/endshow-2026.m4a
if [ -f "$OUT" ]; then echo "Already present: $OUT"; exit 0; fi
command -v yt-dlp >/dev/null || { echo "yt-dlp not found. Install: brew install yt-dlp (macOS) or pipx install yt-dlp"; exit 1; }
yt-dlp -f "bestaudio[ext=m4a]/bestaudio" -x --audio-format m4a -o "public/assets/audio/endshow-2026.%(ext)s" "https://www.youtube.com/watch?v=fLWY-Sxb1bE"
echo "Saved to $OUT — restart the dev server and the show will use it automatically (note: ~36 ms behind the MP3 the sync was measured on)."
