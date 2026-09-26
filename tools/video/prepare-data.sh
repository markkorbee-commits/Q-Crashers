#!/usr/bin/env bash
# One-time preparation of the local video data for the video tools (run from anywhere):
#
#   tools/video/prepare-data.sh [--jobs N] [--force] [--skip-frames] [--skip-features]
#   tools/video/prepare-data.sh --ss 400 --dur 30        (smoke test: ~10 s, only frames + features of that window)
#
#   $ENDSHOW_DATA/video/endshow.mp4   (you put it there; default ENDSHOW_DATA = endshow-data next to the main checkout)
#     -> f4/NNNNN.jpg      4 fps 480x270 frames, index = round(video_s*4)      (tools/video/extract-frames.sh)
#     -> features.npz      25 fps per-frame features, N parallel chunks         (scripts/video-features.py + combine.py)
#     -> spans/            per-span cue files from the current show file        (tools/video/split.py; kept if present)
#     -> cuts.json, signals/NN.txt                                               (tools/video/signals.py)
#   and checks cuts.json / signals against the committed copies in research/video-timeline/data/
#   (tools/video/check-derived.py: identical, or small drift -> the committed copies are installed and the local
#   numbers kept as cuts.local.json / signals.local/, or a large difference -> exit 3: a different video?).
#
# --ss/--dur: smoke test of the toolchain on one window (video seconds): frames of that window into f4/ (same indices
#   as a full run) and features into work/smoke/features.npz; spans/cuts/signals/check are skipped.
# N (parallel chunks) defaults to the CPU count (macOS: sysctl -n hw.ncpu; Linux: nproc).
# Python: $PYTHON, else $ENDSHOW_DATA/venv/bin/python, else python3 (needs numpy + Pillow).
# Steps whose output exists are skipped; --force redoes frames and features (spans are never overwritten here:
# re-split explicitly with `python3 tools/video/split.py --force`).
# Exit status: 0 = done (read any WARNING line), 1 = error, 3 = cut list differs substantially from the committed one.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
# default data dir: next to the MAIN checkout (a git worktree such as .claude/worktrees/<name> shares it)
main_checkout() {
  local c
  if c="$(git -C "$REPO" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" && [ "$(basename "$c")" = .git ]; then
    dirname "$c"
  else
    case "$REPO" in */.claude/worktrees/*) echo "${REPO%%/.claude/worktrees/*}" ;; *) echo "$REPO" ;; esac
  fi
}
export ENDSHOW_DATA="${ENDSHOW_DATA:-$(main_checkout)/../endshow-data}"
mkdir -p "$ENDSHOW_DATA"
DATA="$(cd "$ENDSHOW_DATA" && pwd)"
export ENDSHOW_DATA="$DATA"
VIDEO="$DATA/video/endshow.mp4"
JOBS=""
FORCE=0
SKIP_FRAMES=0
SKIP_FEATURES=0
SS=""
DUR=""
while [ $# -gt 0 ]; do
  case "$1" in
    --jobs) JOBS="$2"; shift 2 ;;
    --force) FORCE=1; shift ;;
    --skip-frames) SKIP_FRAMES=1; shift ;;
    --skip-features) SKIP_FEATURES=1; shift ;;
    --ss) SS="$2"; shift 2 ;;
    --dur | --t) DUR="$2"; shift 2 ;;
    -h | --help) sed -n '2,24p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done
if [ -n "$SS$DUR" ] && { [ -z "$SS" ] || [ -z "$DUR" ]; }; then echo "--ss and --dur go together" >&2; exit 2; fi
if [ -z "$JOBS" ]; then
  if [ "$(uname -s)" = "Darwin" ]; then JOBS="$(sysctl -n hw.ncpu)"; else JOBS="$(nproc 2>/dev/null || echo 4)"; fi
fi
PY="${PYTHON:-}"
[ -n "$PY" ] || { [ -x "$DATA/venv/bin/python" ] && PY="$DATA/venv/bin/python"; } || true
[ -n "$PY" ] || PY=python3
export PYTHON="$PY"

step() { printf '\n== %s  [%s]\n' "$1" "$(date +%H:%M:%S)"; }
die() { echo "prepare-data: $*" >&2; exit 1; }

step "checks (data dir $DATA, $JOBS jobs, python $PY)"
[ -f "$VIDEO" ] || die "video not found: $VIDEO — download it (HANDOFF.md, step 4) and put it there"
command -v "${FFMPEG:-ffmpeg}" >/dev/null || die "ffmpeg not found (macOS: brew install ffmpeg)"
"$PY" -c 'import numpy, PIL' 2>/dev/null || die "$PY lacks numpy/Pillow: python3 -m venv \"$DATA/venv\" && \"$DATA/venv/bin/python\" -m pip install numpy pillow"
command -v node >/dev/null || die "node not found (brew install node@22)"
T_ALL=$(date +%s)

# smoke test: one window only
if [ -n "$SS" ]; then
  step "smoke test: frames of video ${SS}-$(awk -v s="$SS" -v d="$DUR" 'BEGIN {print s + d}') s -> $DATA/f4"
  "$HERE/extract-frames.sh" --video "$VIDEO" --out "$DATA/f4" --ss "$SS" --dur "$DUR" --jobs "$JOBS"
  step "smoke test: features of the same window -> $DATA/work/smoke/features.npz"
  mkdir -p "$DATA/work/smoke"
  "$PY" "$REPO/scripts/video-features.py" "$VIDEO" "$DATA/work/smoke/features.npz" --ss "$SS" --t "$DUR"
  "$PY" -c 'import sys, numpy as np; F = np.load(sys.argv[1]); print("features: %d frames at %d fps, mean luma %.3f" % (len(F["luma"]), int(F["fps"]), float(F["luma"].mean())))' "$DATA/work/smoke/features.npz"
  echo
  echo "prepare-data: smoke test OK in $(( $(date +%s) - T_ALL )) s. Now run the full preparation: tools/video/prepare-data.sh"
  exit 0
fi

# video duration (s)
if command -v ffprobe >/dev/null; then
  LEN="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$VIDEO")"
else
  LEN="$({ "${FFMPEG:-ffmpeg}" -hide_banner -i "$VIDEO" 2>&1 || true; } | awk -F'[ ,:]+' '/Duration/ {print $3*3600+$4*60+$5; exit}')"
fi
echo "video: $VIDEO ($LEN s)"

# 1. frames
NF=$({ find "$DATA/f4" -name '[0-9][0-9][0-9][0-9][0-9].jpg' 2>/dev/null || true; } | wc -l | tr -d ' ')
EXPECT=$(awk -v l="$LEN" 'BEGIN {print int(l * 4) - 2}') # the full video gives 6325 (1581.19 s); frames without f4/.timing (the old 0.12 s late extraction) are redone
if [ "$SKIP_FRAMES" = 1 ]; then
  step "frames: skipped (--skip-frames)"
elif [ "$FORCE" = 0 ] && [ "$NF" -ge "$EXPECT" ] && [ "$(cat "$DATA/f4/.timing" 2>/dev/null)" = round-up ]; then
  step "frames: $NF present in $DATA/f4 — skipped"
else
  step "frames -> $DATA/f4 (expect about $((EXPECT + 2)))"
  "$HERE/extract-frames.sh" --video "$VIDEO" --out "$DATA/f4" --jobs "$JOBS"
fi

# 2. features (parallel chunks; every chunk after the first starts one frame early so combine.py can drop it and
#    the cut metric of the chunk's first frame is measured against the true previous frame)
if [ "$SKIP_FEATURES" = 1 ]; then
  step "features: skipped (--skip-features)"
elif [ "$FORCE" = 0 ] && [ -f "$DATA/features.npz" ]; then
  step "features: $DATA/features.npz present — skipped"
else
  FD="$DATA/work/features"
  rm -rf "$FD"
  mkdir -p "$FD"
  CH=$(awk -v l="$LEN" -v j="$JOBS" 'BEGIN {c = l / j; n = int(c); if (n < c) n++; if (n < 30) n = 30; print n}')
  step "features: chunks of $CH s -> $FD (logs feat_K.log)"
  pids=()
  k=0
  while [ "$(awk -v k="$k" -v c="$CH" -v l="$LEN" 'BEGIN {print (k * c < l) ? 1 : 0}')" = 1 ]; do
    ss=$((k * CH))
    last=$(awk -v k="$k" -v c="$CH" -v l="$LEN" 'BEGIN {print ((k + 1) * c >= l) ? 1 : 0}')
    if [ "$k" = 0 ]; then a=(--ss 0); else a=(--ss "$(awk -v s="$ss" 'BEGIN {printf "%.2f", s - 0.04}')"); fi
    if [ "$last" = 0 ]; then
      if [ "$k" = 0 ]; then a+=(--t "$CH"); else a+=(--t "$(awk -v c="$CH" 'BEGIN {printf "%.2f", c + 0.04}')"); fi
    fi
    nice "$PY" "$REPO/scripts/video-features.py" "$VIDEO" "$FD/feat_$k.npz" "${a[@]}" > "$FD/feat_$k.log" 2>&1 &
    pids+=($!)
    k=$((k + 1))
  done
  fail=0
  for p in "${pids[@]}"; do wait "$p" || fail=1; done
  [ "$fail" = 0 ] || die "a feature chunk failed: see $FD/feat_*.log"
  "$PY" "$HERE/combine.py" --dir "$FD" --out "$DATA/features.npz"
fi

# 3. spans (the span workflow's working files: never overwritten here)
if [ -f "$DATA/spans/index.json" ]; then
  step "spans: $DATA/spans present — kept (re-split before a new video-match run: python3 tools/video/split.py --force)"
else
  step "spans <- public/show/endshow-2026.json"
  "$PY" "$HERE/split.py"
fi

# 4. cuts + signals
step "cuts + signals"
[ -f "$DATA/features.npz" ] || die "features.npz missing in $DATA: run without --skip-features"
"$PY" "$HERE/signals.py"

# 5. compare with the committed copies (numbers derived from the same video: identical, or a small drift from another
#    ffmpeg version / CPU architecture, in which case the committed copies are installed as the reference)
step "check against research/video-timeline/data/"
rc=0
"$PY" "$HERE/check-derived.py" || rc=$?
echo
if [ "$rc" = 0 ]; then
  echo "prepare-data: done in $(( $(date +%s) - T_ALL )) s. Data dir: $DATA"
else
  echo "prepare-data: FAILED the check against the committed copies (exit $rc): see the ERROR line above. Data dir: $DATA" >&2
fi
exit "$rc"
