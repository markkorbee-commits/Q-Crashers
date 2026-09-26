"""Shared paths for the video tools (imported by the scripts next to this file).

Data dir contract: $ENDSHOW_DATA (default: endshow-data next to the MAIN checkout) holds
  video/endshow.mp4, f4/NNNNN.jpg (4 fps, index = round(video_s*4)), features.npz, cuts.json,
  signals/NN.txt, spans/NN.json (+ index.json, source.json), work/ (renders, sheets, merged candidate shows),
  venv/ (Python with numpy + Pillow).
Nothing in it is ever committed. Inside a git worktree (e.g. <repo>/.claude/worktrees/<name>) the default is
resolved from the main checkout (git rev-parse --git-common-dir), so all worktrees share one data dir.
"""
import importlib.util
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
SHOW = os.path.join(REPO, 'public', 'show', 'endshow-2026.json')


def main_checkout():
    """the main checkout (== REPO unless this copy is a git worktree)"""
    try:
        common = subprocess.run(['git', 'rev-parse', '--path-format=absolute', '--git-common-dir'], cwd=REPO,
                                capture_output=True, text=True).stdout.strip()
        if common and os.path.basename(common) == '.git':
            return os.path.dirname(common)
    except OSError:
        pass
    m = re.match(r'^(.*?)[\\/]\.claude[\\/]worktrees[\\/]', REPO + os.sep)
    return m.group(1) if m else REPO


def data_dir():
    return os.path.abspath(os.environ.get('ENDSHOW_DATA') or os.path.join(main_checkout(), '..', 'endshow-data'))


def data(*parts):
    """a path inside the data dir (not created)"""
    return os.path.join(data_dir(), *parts)


def work(*parts):
    """a directory inside $ENDSHOW_DATA/work (created)"""
    p = data('work', *parts)
    os.makedirs(p, exist_ok=True)
    return p


def opt(argv, name, default=None):
    """--name value from argv"""
    return argv[argv.index('--' + name) + 1] if '--' + name in argv else default


def use_venv(*modules):
    """Make sure `modules` (e.g. 'numpy', 'PIL') import: if this interpreter lacks one, re-run the script with $PYTHON
    or $ENDSHOW_DATA/venv/bin/python (so `python3 tools/video/sheet.py ...` works from any shell), else exit with
    the fix. Call it before importing those modules."""
    missing = [m for m in modules if importlib.util.find_spec(m) is None]
    if not missing:
        return
    if not os.environ.get('ENDSHOW_REEXEC'):
        for cand in (os.environ.get('PYTHON'), data('venv', 'bin', 'python')):
            if cand and os.path.exists(cand) and os.path.abspath(cand) != os.path.abspath(sys.executable):
                os.environ['ENDSHOW_REEXEC'] = '1'
                os.execv(cand, [cand] + sys.argv)
    sys.exit(f"{sys.executable} lacks {', '.join(missing)} and no venv with it was found at {data('venv')}: "
             'create it (HANDOFF.md step 5) or set PYTHON / ENDSHOW_DATA')


def frames_dir_or_exit(frames):
    """the frames dir, or exit with a clear message (no silent black sheets)"""
    if not os.path.isdir(frames):
        env = os.environ.get('ENDSHOW_DATA')
        sys.exit(f"video frames dir not found: {frames}\n  ENDSHOW_DATA={env if env else '(unset -> ' + data_dir() + ')'}; "
                 'set ENDSHOW_DATA (echo $ENDSHOW_DATA), pass --frames, or run tools/video/prepare-data.sh')
    return frames
