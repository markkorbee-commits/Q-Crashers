#!/usr/bin/env bash
# Downloads the audio of the official Endshow video for LOCAL, personal use only.
# Requires yt-dlp (https://github.com/yt-dlp/yt-dlp) and ffmpeg on your machine.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=public/assets/audio/endshow-2026.m4a
if [ -f "$OUT" ]; then echo "Already present: $OUT"; exit 0; fi
command -v yt-dlp >/dev/null || { echo "yt-dlp not found. Install: pip install -U yt-dlp"; exit 1; }
yt-dlp -f "bestaudio[ext=m4a]/bestaudio" -x --audio-format m4a -o "public/assets/audio/endshow-2026.%(ext)s" "https://www.youtube.com/watch?v=fLWY-Sxb1bE"
echo "Saved to $OUT — restart the dev server and the show will use it automatically."
