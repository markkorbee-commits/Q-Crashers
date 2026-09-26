#!/usr/bin/env bash
# Extracts the official Endshow video as 4 fps, 480x270 JPEG frames: the reference frames every video tool reads.
#
#   tools/video/extract-frames.sh [--video <mp4>] [--out <dir>] [--ss <s>] [--dur <s>] [--jobs <n>]
#
# Defaults: --video $ENDSHOW_DATA/video/endshow.mp4, --out $ENDSHOW_DATA/f4, whole video, --jobs = CPU count.
# ENDSHOW_DATA defaults to endshow-data next to the main checkout (a git worktree shares the main checkout's one).
# Smoke test (~6 s): tools/video/extract-frames.sh --ss 400 --dur 30   (frames 01600-01719)
#
# INDEX CONVENTION (every tool relies on it): file NNNNN.jpg = video time NNNNN/4 s, zero-based
# (00000.jpg = 0.00 s, 00001.jpg = 0.25 s, ... 06324.jpg = 1581.00 s; 6325 frames for the 1581.19 s video).
# A run over the whole video writes f4/.timing = 'round-up' (prepare-data re-extracts frame dirs without it).
# Frame index for a video time t: round(t * 4).
#
# Filter chain: fps=4:round=up,scale=480:270:flags=area, -q:v 4. round=up keeps the last source frame at or before
# k/4 s (at most one 25 fps frame early). The original cloud frames used plain fps=4 (round=near), which keeps the
# LAST source frame that rounds to slot k, i.e. video time k/4 + 0.12 s: those frames were 0.12 s late (measured on
# the Mac, 27 Sep 2026, against exact decodes at 20, 339, 400, 700, 1130, 1500 s). Re-extract old data dirs.
# A partial or chunked extraction seeks with -ss (a multiple of 0.25 s) and numbers its first frame round(ss*4);
# chunks are cut with -frames:v, so they reproduce the frames of one full pass exactly (verified: same index =
# identical picture, see docs/handoff/data-verification.md). The video is copyrighted: never commit it or its frames.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
main_checkout() {
  local c
  if c="$(git -C "$REPO" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" && [ "$(basename "$c")" = .git ]; then
    dirname "$c"
  else
    case "$REPO" in */.claude/worktrees/*) echo "${REPO%%/.claude/worktrees/*}" ;; *) echo "$REPO" ;; esac
  fi
}
DATA="${ENDSHOW_DATA:-$(main_checkout)/../endshow-data}"
VIDEO="$DATA/video/endshow.mp4"
OUT="$DATA/f4"
SS=0
DUR=""
JOBS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --video) VIDEO="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --ss) SS="$2"; shift 2 ;;
    --dur | --t) DUR="$2"; shift 2 ;;
    --jobs) JOBS="$2"; shift 2 ;;
    -h | --help) sed -n '2,17p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

FF="${FFMPEG:-$(command -v ffmpeg || true)}"
[ -n "$FF" ] || { echo "ffmpeg not found (macOS: brew install ffmpeg; Linux: apt install ffmpeg)" >&2; exit 1; }
FP="${FFPROBE:-$(command -v ffprobe || true)}"
[ -f "$VIDEO" ] || { echo "video not found: $VIDEO (see HANDOFF.md, step 4)" >&2; exit 1; }
if [ -z "$JOBS" ]; then
  if [ "$(uname -s)" = "Darwin" ]; then JOBS="$(sysctl -n hw.ncpu)"; else JOBS="$(nproc 2>/dev/null || echo 4)"; fi
fi

# video length (s): ffprobe, else parse ffmpeg's banner
if [ -n "$FP" ]; then
  LEN="$("$FP" -v error -show_entries format=duration -of default=nw=1:nk=1 "$VIDEO")"
else
  LEN="$({ "$FF" -hide_banner -i "$VIDEO" 2>&1 || true; } | awk -F'[ ,:]+' '/Duration/ {print $3*3600+$4*60+$5; exit}')"
fi
[ -n "$LEN" ] || { echo "cannot read the video duration of $VIDEO" >&2; exit 1; }
[ -n "$DUR" ] || DUR="$(awk -v l="$LEN" -v s="$SS" 'BEGIN {print l - s}')"
# frame numbers: first = round(ss*4); count = frames whose time lies in [ss, ss+dur)
FIRST="$(awk -v s="$SS" 'BEGIN {printf "%d", s * 4 + 0.5}')"
TOTAL="$(awk -v d="$DUR" 'BEGIN {n = d * 4; c = int(n); if (c < n) c++; print c}')"
TILL_END="$(awk -v l="$LEN" -v s="$SS" -v d="$DUR" 'BEGIN {print (s + d >= l - 0.001) ? 1 : 0}')"
mkdir -p "$OUT"

one() { # $1 first frame index, $2 frame count ("" = until the end of the video)
  local first="$1" count="$2" ss
  ss="$(awk -v f="$first" 'BEGIN {printf "%.2f", f / 4}')"
  local seek=() lim=()
  [ "$first" -gt 0 ] && seek=(-ss "$ss")
  [ -n "$count" ] && lim=(-frames:v "$count")
  # ${a[@]+"${a[@]}"}: empty-array safe under set -u with the bash 3.2 that macOS ships
  nice "$FF" -nostdin -v error ${seek[@]+"${seek[@]}"} -i "$VIDEO" -an -vf "fps=4:round=up,scale=480:270:flags=area" -q:v 4 \
    ${lim[@]+"${lim[@]}"} -start_number "$first" "$OUT/%05d.jpg"
}

echo "extract-frames: $VIDEO -> $OUT  (video ${SS}s + ${DUR}s, frames $FIRST.., $JOBS jobs)"
T0=$(date +%s)
CH=$(( (TOTAL + JOBS - 1) / JOBS ))
[ "$CH" -lt 40 ] && CH=$TOTAL # short ranges: one pass
pids=()
k=0
while [ $((k * CH)) -lt "$TOTAL" ]; do
  f=$((FIRST + k * CH))
  n=$CH
  last=0
  [ $(((k + 1) * CH)) -ge "$TOTAL" ] && { n=$((TOTAL - k * CH)); last=1; }
  if [ "$last" = 1 ] && [ "$TILL_END" = 1 ]; then one "$f" "" & else one "$f" "$n" & fi
  pids+=($!)
  k=$((k + 1))
done
fail=0
for p in "${pids[@]}"; do wait "$p" || fail=1; done
[ "$fail" = 0 ] || { echo "extract-frames: an ffmpeg chunk failed" >&2; exit 1; }
N=$(find "$OUT" -name '[0-9][0-9][0-9][0-9][0-9].jpg' | wc -l | tr -d ' ')
[ "$FIRST" = 0 ] && [ "$TILL_END" = 1 ] && echo round-up > "$OUT/.timing"
echo "extract-frames: done in $(( $(date +%s) - T0 )) s; $N frames in $OUT"
