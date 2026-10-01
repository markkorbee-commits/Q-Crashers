# Endshow audio (local, not committed)

The show engine syncs to an abstract audio track. For the full experience place the original
Endshow audio here as one of:

    endshow-2026.m4a | .mp3 | .ogg | .opus | .webm | .wav

It must be the audio of the official video "The Endshow | Defqon.1 2026" (Q-dance, YouTube id
`fLWY-Sxb1bE`, 26:21) starting at video time 00:00. If your file has extra silence at the start,
set `meta.audio.offset` in `public/show/endshow-2026.json` (audio time = show time + offset).

Helper (run on your own machine, requires yt-dlp):

    npm run fetch-audio

Copyrighted media is deliberately git-ignored: the project never redistributes it.
Without a local file the app offers: (1) pick a file from disk, (2) the official YouTube video as a
synced picture-in-picture source, (3) a synthesized rehearsal track.
