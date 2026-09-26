#!/usr/bin/env bash
# Checks that the handoff really reached GitHub: the remote branch points at the local commit, and a checkout of it
# contains the files the Mac setup needs (HANDOFF.md steps 2-10).
#
#   tools/handoff/verify-pushed.sh [--clone] [branch] [remote]
#
# Defaults: branch claude/defqon-endshow-experience-wi4oos, remote origin. --clone additionally makes a fresh shallow
# clone of the remote branch in a temp dir and checks the files there (what the Mac will see). Exit 0 = OK.
set -euo pipefail
CLONE=0
[ "${1:-}" = "--clone" ] && { CLONE=1; shift; }
BRANCH="${1:-claude/defqon-endshow-experience-wi4oos}"
REMOTE="${2:-origin}"
cd "$(git rev-parse --show-toplevel)"
NEED=(HANDOFF.md CLAUDE.md tools/video/prepare-data.sh tools/video/extract-frames.sh tools/video/check-derived.py
  tools/workflows/qa-fix.js tools/workflows/video-match.js tools/setup/claude-env.mjs scripts/lib/data.mjs
  scripts/lib/browser.mjs research/video-timeline/data/cuts.json docs/handoff/wip/STATUS.md)
fail=0
local_sha="$(git rev-parse "$BRANCH")"
remote_sha="$(git ls-remote "$REMOTE" "refs/heads/$BRANCH" | cut -f1)"
echo "local  $BRANCH = $local_sha"
echo "remote $REMOTE/$BRANCH = ${remote_sha:-<missing>}"
[ "$local_sha" = "$remote_sha" ] || { echo "MISMATCH: push first: git push $REMOTE $BRANCH"; fail=1; }
check_tree() { # $1 = tree-ish, or a directory with --dir
  local missing=0
  for f in "${NEED[@]}"; do
    if [ "$1" = --dir ]; then [ -e "$2/$f" ] || { echo "  missing: $f"; missing=1; }
    else git cat-file -e "$1:$f" 2>/dev/null || { echo "  missing: $f"; missing=1; }; fi
  done
  return $missing
}
if [ -n "$remote_sha" ]; then
  git fetch -q "$REMOTE" "$BRANCH"
  echo "files in $REMOTE/$BRANCH:"
  check_tree FETCH_HEAD && echo "  all ${#NEED[@]} present" || fail=1
fi
if [ "$CLONE" = 1 ]; then
  tmp="$(mktemp -d)"
  url="$(git remote get-url "$REMOTE")"
  git clone -q --depth 1 --branch "$BRANCH" "$url" "$tmp/Q-Crashers"
  echo "fresh clone of $url ($BRANCH) at $(git -C "$tmp/Q-Crashers" rev-parse --short HEAD):"
  check_tree --dir "$tmp/Q-Crashers" && echo "  all ${#NEED[@]} present" || fail=1
  rm -rf "$tmp"
fi
[ "$fail" = 0 ] && echo "OK: the handoff is on $REMOTE/$BRANCH" || { echo "NOT OK"; exit 1; }
