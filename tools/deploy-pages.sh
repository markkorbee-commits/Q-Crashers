#!/usr/bin/env bash
# Publishes the shareable web build to GitHub Pages (branch gh-pages of this repository):
#   https://markkorbee-commits.github.io/Q-Crashers/
# The build plays with the official YouTube video as the synced picture-in-picture audio source
# (VITE_DEFAULT_SOURCE=youtube) and contains NO audio file (vite.config.ts strips assets/audio).
set -euo pipefail
cd "$(dirname "$0")/.."
VITE_DEFAULT_SOURCE=youtube npx vite build --outDir dist-pages --emptyOutDir
if find dist-pages -type f \( -iname '*.mp3' -o -iname '*.m4a' -o -iname '*.mp4' -o -iname '*.webm' -o -iname '*.ogg' -o -iname '*.opus' -o -iname '*.wav' -o -iname '*.flac' \) | grep -q .; then
  echo "deploy-pages: audio files found in dist-pages, refusing to publish" >&2
  exit 1
fi
touch dist-pages/.nojekyll
SRC="$(git rev-parse --short HEAD)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp -R dist-pages/. "$TMP/"
cd "$TMP"
git init -q -b gh-pages
git add -A
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -q -m "Pages build of $SRC"
git push -q -f "$(git -C "$OLDPWD" remote get-url origin)" gh-pages
echo "deploy-pages: pushed build of $SRC to gh-pages"
