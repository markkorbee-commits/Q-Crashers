"""Shared paths for the video tools (imported by the scripts next to this file).

Data dir contract: $ENDSHOW_DATA (default: ../endshow-data next to the repository) holds
  video/endshow.mp4, f4/NNNNN.jpg (4 fps, index = round(video_s*4)), features.npz, cuts.json,
  signals/NN.txt, spans/NN.json (+ index.json), work/ (renders, sheets, merged candidate shows).
Nothing in it is ever committed.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
SHOW = os.path.join(REPO, 'public', 'show', 'endshow-2026.json')


def data_dir():
    return os.path.abspath(os.environ.get('ENDSHOW_DATA') or os.path.join(REPO, '..', 'endshow-data'))


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
