# Overdracht: verder op je MacBook Pro (M4 Max)

Tot nu toe liep het werk in een cloudcontainer zonder GPU: elke render ging via SwiftShader (software) en kostte
20-90 s per frame. Op je MacBook Pro rendert Chrome via de GPU (Metal), dus renders, vergelijkingen en metingen gaan
tientallen keren sneller. Dit document zet alles stap voor stap klaar; daarna start je een lokale Claude Code-sessie
die met `CLAUDE.md` en dit bestand verder kan zonder de oude gesprekscontext. Een lokale Claude-sessie kan deze
stappen ook zelf uitvoeren.

Alle commando's zijn voor zsh (standaard op macOS). Je kunt ze per blok kopiëren en plakken: ze bevatten bewust geen
`#`-commentaar, want een standaard-zsh geeft dat als extra argumenten aan het commando door. Toelichting staat
steeds in de tekst boven of onder een blok. Tijden zijn schattingen voor een M4 Max.

## Overzicht: wat staat waar

| Waar | Wat |
|---|---|
| `~/Projects/Q-Crashers` | de repository (code, showbestand, documentatie, tools) |
| `~/Projects/endshow-data` | de lokale datamap (`ENDSHOW_DATA`): video, frames, features, venv, werkbestanden; **nooit in git** |
| `research/video-timeline/data/` (in de repo) | afgeleide getallen: cutlijst, signaaltabellen, similarity-baseline |
| `tools/video/` | datapijplijn en side-by-side-tools |
| `tools/workflows/` | workflowscripts (video-match, judges, fixers) |
| `docs/handoff/findings/` | de laatste findings (ronde 4) en open cue/engine-gaten |
| `docs/handoff/wip/` | stand per fixergroep bij de overdracht (`STATUS.md`) en onafgemaakt werk als patch |

De datamap staat standaard naast de repo (`~/Projects/endshow-data`); de tools vinden hem ook vanuit de
git-worktrees van de fixers. Stap 4 en 5 zetten `ENDSHOW_DATA` en `PYTHON` daarnaast expliciet, voor de terminal
(`~/.zshrc`) en voor Claude Code (`.claude/settings.local.json`).

## 1. Basissoftware (± 10 min)

Controleer eerst dat de terminal native op Apple Silicon draait. Dit moet `arm64` geven; staat er `x86_64`, dan draait
Terminal onder Rosetta (Finder, Programma's, Hulpprogramma's, Terminal, Toon info: vink "Open met Rosetta" uit) en
open je een nieuw venster:

```zsh
uname -m
```

Homebrew (sla dit blok over als `brew --version` al werkt):

```zsh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

Node, ffmpeg, git, Python en de GitHub CLI (wat al geïnstalleerd is, slaat brew over):

```zsh
brew install node ffmpeg git python gh
node -v
node -p process.arch
brew --prefix
ffmpeg -version | head -1
python3 --version
```

Verwacht: Node `v22` of nieuwer, `arm64`, `/opt/homebrew`. Google Chrome is nodig voor de meetscripts. Staat Chrome
nog niet in `/Applications`, installeer hem dan:

```zsh
brew install --cask google-chrome
```

## 2. Repository klonen of bijwerken (± 1 min)

Is de repository privé, log dan eerst in met `gh auth login` (kies GitHub.com, HTTPS, inloggen via de browser).

Nog geen kopie op de Mac:

```zsh
mkdir -p ~/Projects
cd ~/Projects
git clone https://github.com/markkorbee-commits/Q-Crashers.git
```

Daarna (en ook als je de repository al eerder had gekloond):

```zsh
cd ~/Projects/Q-Crashers
git fetch origin
git checkout claude/defqon-endshow-experience-wi4oos
git pull
ls HANDOFF.md CLAUDE.md tools/video/prepare-data.sh tools/setup/claude-env.mjs docs/handoff/wip/STATUS.md
git log --oneline -8
```

Meldt `ls` bij een van die bestanden `No such file or directory`, dan is de overdracht nog niet gepusht: wacht op
de melding van de cloudsessie en herhaal dit blok.

## 3. npm install (< 1 min)

```zsh
cd ~/Projects/Q-Crashers
npm install
```

## 4. Datamap + video (1-5 min, afhankelijk van je verbinding)

```zsh
echo 'export ENDSHOW_DATA="$HOME/Projects/endshow-data"' >> ~/.zshrc
source ~/.zshrc
echo $ENDSHOW_DATA
mkdir -p "$ENDSHOW_DATA/video"
open "https://drive.google.com/file/d/1fZ5OmmScJmbhAqEbqXeMqJstzHHU7Cax/view"
```

Download de video in de browser (589 MB; Google meldt dat het bestand niet op virussen gescand kan worden: kies
"Toch downloaden"). Het volgende blok zoekt de download in `~/Downloads` op zijn exacte grootte (de bestandsnaam
maakt dus niet uit), zet hem op de juiste plek en controleert hem:

```zsh
DL="$(find ~/Downloads -maxdepth 1 -name '*.mp4' -size 589415472c | head -1)"
echo "$DL"
mv "$DL" "$ENDSHOW_DATA/video/endshow.mp4"
ls -l "$ENDSHOW_DATA/video/endshow.mp4"
shasum -a 256 "$ENDSHOW_DATA/video/endshow.mp4"
```

Verwacht: `ls` toont 589415472 bytes en `shasum` geeft
`397c0d90e37b2d45442c9106b79b165e9f2b23f5ae1c8a090315875e278068b5`. Toont `echo "$DL"` een lege regel, dan is de
download nog niet klaar of staat hij ergens anders: kijk met `ls -l ~/Downloads/*.mp4` en zet daarna zelf
`DL=~/Downloads/` gevolgd door de bestandsnaam, en voer de regels vanaf `mv` opnieuw uit. Wijkt de checksum af, dan
is het een andere encode: de tools werken wel, maar stap 7 stopt dan met een melding over de cutlijst.

Optioneel: zet je eigen daglichtfoto's van het podium in `$ENDSHOW_DATA/refs/day/` (namen zoals in
`docs/handoff/findings/r4_pillars.md`, bv. `day2_axis.jpg`, `day3_aerial.jpg`, `day5_front.jpg`).

## 5. Python-omgeving + Claude-omgeving (± 1 min)

De Python van macOS/Homebrew is "externally managed": de pakketten gaan in een eigen venv in de datamap. Bestaat
die venv al (eerder aangemaakt), dan laat de eerste regel hem ongemoeid. Een pip-melding over een nieuwere pip-versie
kun je negeren. `scipy` is alleen nodig voor `scripts/audio-onsets.py`.

```zsh
python3 -m venv "$ENDSHOW_DATA/venv"
"$ENDSHOW_DATA/venv/bin/python" -m pip install --upgrade pip numpy pillow scipy
"$ENDSHOW_DATA/venv/bin/python" -c 'import numpy, PIL; print("numpy", numpy.__version__, "Pillow", PIL.__version__)'
echo 'export PYTHON="$ENDSHOW_DATA/venv/bin/python"' >> ~/.zshrc
source ~/.zshrc
cd ~/Projects/Q-Crashers
node tools/setup/claude-env.mjs
```

De laatste regel schrijft `ENDSHOW_DATA` en `PYTHON` in `.claude/settings.local.json` van de repo (git-genegeerd).
Daardoor krijgt elke Claude Code-sessie in dit project, ook de desktop-app die `~/.zshrc` niet leest, en elke
subagent in een git-worktree dezelfde datamap en dezelfde Python. Een venv hoef je niet te activeren: de tools kiezen
zelf `$PYTHON` of `$ENDSHOW_DATA/venv/bin/python`.

## 6. Audio (± 1 min)

De show loopt op de audio, en de sync is gemeten op jouw mp3 (48 kHz stereo, 25298732 bytes). Het blok zoekt die mp3
op grootte in Downloads, Muziek en Bureaublad, zet hem in de (git-genegeerde) audiomap en controleert hem:

```zsh
cd ~/Projects/Q-Crashers
MP3="$(find ~/Downloads ~/Music ~/Desktop -maxdepth 2 -name '*.mp3' -size 25298732c 2>/dev/null | head -1)"
echo "$MP3"
cp "$MP3" public/assets/audio/endshow-2026.mp3
ls -l public/assets/audio/
shasum -a 256 public/assets/audio/endshow-2026.mp3
```

Verwacht: `shasum` geeft `9b7f48cd9537cfc6f66a18362c2971014d579e799771b05826132c28129567b6`, en in
`public/assets/audio/` staan naast `README.md` alleen `endshow-2026.mp3` en eventueel `*.analysis.json`. Staat er
ook een `endshow-2026.m4a`, `.webm`, `.ogg` of `.opus`, verwijder die dan: de app kiest zo'n bestand vóór de mp3.
Toont `echo "$MP3"` een lege regel, zoek de mp3 dan met `ls -l ~/Downloads/*.mp3`, zet `MP3=` gevolgd door het pad en
voer de regels vanaf `cp` opnieuw uit. Een andere versie van de mp3 kan een paar tientallen ms verschoven zijn: meld
een afwijkende checksum aan Claude.

Alleen als je de mp3 niet hebt: `brew install yt-dlp` en daarna `npm run fetch-audio`. Dat haalt de audio van de
officiële YouTube-video als `.m4a`; die ligt ongeveer 36 ms achter op de mp3 waarop de sync is gemeten.

## 7. Videodata voorbereiden (± 2-4 min)

Eerst een snelle proef op 30 seconden video (± 10 s; eindigt met `smoke test OK`):

```zsh
cd ~/Projects/Q-Crashers
tools/video/prepare-data.sh --ss 400 --dur 30
```

Dan de volledige voorbereiding, met als controle het aantal frames (verwacht 6325):

```zsh
tools/video/prepare-data.sh
ls "$ENDSHOW_DATA/f4" | wc -l
```

Dit maakt uit de video: `f4/` (6325 frames, 4 per seconde, 480x270; frame `NNNNN.jpg` = video-tijd `NNNNN/4` s),
`features.npz` (parallel in zoveel stukken als de Mac kernen heeft), `spans/` (werkbestanden per showdeel),
`cuts.json` en `signals/`. Aan het eind vergelijkt het script de cutlijst en signaaltabellen met de versie in de repo
(`research/video-timeline/data/`); die vastgelegde versie blijft de referentie. Drie mogelijke uitkomsten:

- `identical to the committed copies`: klaar.
- `WARNING: small differences ...`: normaal op de Mac, want ffmpeg-versie en processorarchitectuur verschillen van de
  cloud. Het script heeft de vastgelegde cutlijst en signalen al als `cuts.json` en `signals/` geïnstalleerd (de
  eigen uitkomst staat in `cuts.local.json` en `signals.local/`). Niets meer te doen.
- `ERROR: the cut list differs substantially ...` en exitcode 3: waarschijnlijk een andere video. Controleer de
  checksum uit stap 4.

## 8. Dev-server starten en de app openen

```zsh
cd ~/Projects/Q-Crashers
npm run dev -- --strictPort
```

Vite meldt `Local: http://localhost:5173/`. Open dat adres in Chrome. Direct naar de show-camera op het eerste
anthem-drop-moment: `http://localhost:5173/?autostart&camera=showcam&t=415`. Laat deze terminal open; gebruik voor de
volgende stappen een tweede terminalvenster (Cmd+T). Stopt Vite met `Port 5173 is already in use`, zie "Problemen
oplossen".

GPU-check van de testharnas (de regel `[browser] WebGL renderer:` moet de Apple-GPU noemen, niet SwiftShader):

```zsh
cd ~/Projects/Q-Crashers
node scripts/shot.mjs "autostart&t=700&camera=showcam" .shots/gpu-test.png
open .shots/gpu-test.png
```

## 9. Similarity-baseline op 64 momenten (enkele minuten)

De objectieve meting vergelijkt de Show camera met de videoframes (kleur, licht, vorm). De cloud-baseline (52,0 %
ruw / 25,7 % na ijking) is met SwiftShader en vóór ronde 4 gemeten; leg op de Mac een eigen baseline vast en
vergelijk voortaan daarmee.

Eerst de meetstabiliteit (sommige beeldtoestand na een seek hangt af van het aantal gerenderde frames):

```zsh
cd ~/Projects/Q-Crashers
T=411.5,1047.25,484.75,264.75,1463,1438.5,607,778.25
node scripts/similarity.mjs --port 5173 --times $T --settle 500 --min-frames 30 --out "$ENDSHOW_DATA/work/sim/stab_fast"
node scripts/similarity.mjs --port 5173 --times $T --settle 2000 --min-frames 120 --out "$ENDSHOW_DATA/work/sim/stab_slow"
```

Liggen beide binnen ± 1 punt, gebruik dan de snelle instelling voor de baseline. Het rapport toont de 6 slechtste en
de 6 beste momenten, steeds video links en onze render rechts:

```zsh
node scripts/similarity.mjs --port 5173 --settle 500 --min-frames 30 --out "$ENDSHOW_DATA/work/sim/mac_base"
open "$ENDSHOW_DATA/work/sim/mac_base/report.jpg"
```

De uitvoer toont `overall` (ruw), `normalised` (na ijking) en de onderdelen kleur/licht/vorm, plus een score per
track. Noteer deze getallen: dat is het vertrekpunt voor de open punten. Ontbreekt een videoframe, dan stopt het
script vóór het renderen (een baseline over minder momenten is niet vergelijkbaar).

Side-by-side kijken naar losse momenten (video links, onze Show camera rechts):

```zsh
node tools/video/vcompare.mjs --port 5173 --showcam --settle 600 --shots "348;361;411.5;447" --out mc.jpg
open "$ENDSHOW_DATA/work/compare/mc.jpg"
```

## 10. Claude Code starten

**Desktop-app:** open Claude Code in de Claude-app en kies als werkmap `~/Projects/Q-Crashers`. `ENDSHOW_DATA` en
`PYTHON` komen uit `.claude/settings.local.json` (stap 5); herstart de app als hij al open stond.

**CLI:** installeer Claude Code (alternatief: `npm install -g @anthropic-ai/claude-code`), zet de installatiemap in je
PATH en start de sessie. `caffeinate -dims` houdt de Mac wakker zolang Claude draait:

```zsh
curl -fsSL https://claude.ai/install.sh | bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
claude --version
cd ~/Projects/Q-Crashers
caffeinate -dims claude
```

Workflows met veel agents lopen soms uren. Laat de Mac dan aan de lader en met het deksel open. Gebruik je de
desktop-app, start dan in een apart terminaltabblad `caffeinate -dims` en stop dat later met Ctrl+C.

Eerste prompt (plakken):

```text
Lees CLAUDE.md en HANDOFF.md en ga verder met de open punten. Controleer eerst met echo $ENDSHOW_DATA $PYTHON dat de
datamap en de venv-Python zijn gezet.
```

Uitgebreidere variant:

```text
Lees CLAUDE.md en HANDOFF.md en ga verder met de open punten. De datamap staat in ~/Projects/endshow-data
(ENDSHOW_DATA), de venv in ~/Projects/endshow-data/venv (PYTHON), de dev-server draait op poort 5173. Begin met open
punt 1: lees docs/handoff/wip/STATUS.md, rond ronde 4 af, leg de Mac-baseline vast en rapporteer de getallen.
```

## Problemen oplossen

| Probleem | Oplossing |
|---|---|
| `No Chrome/Chromium found` | Installeer Chrome (`brew install --cask google-chrome`), of `npx playwright-core install chromium`, of wijs een browser aan met `CHROME_PATH` (zie onder de tabel). |
| `[browser] WebGL renderer:` noemt SwiftShader | Probeer een zichtbaar venster: `HEADED=1 node scripts/similarity.mjs ...`. Kijk in Chrome zelf op `chrome://gpu` of WebGL hardware-versneld is. `RENDERER=swiftshader` forceert bewust software (alleen voor vergelijking met de cloudmetingen). |
| `Protocol error`, `Target closed` of een screenshot-timeout met Google Chrome | Chrome werkt zichzelf bij en kan te nieuw zijn voor de meegeleverde playwright-core. Gebruik de bijpassende Chromium: zie het blok onder de tabel. |
| `Port 5173 is already in use` (met `--strictPort`) | Er draait al een server: `lsof -nP -iTCP:5173 -sTCP:LISTEN` en `kill` gevolgd door het PID, of start op een andere poort (`npx vite --port 5180 --strictPort`) en geef de tools `--port 5180` (shot.mjs en budget-check: `--base http://localhost:5180/`). Zonder `--strictPort` meldt Vite `Port 5173 is in use, trying another one...` en draait hij stil op een andere poort: dan praten de tools met de verkeerde server. |
| `video frames dir not found` of `ENDSHOW_DATA=(unset -> ...)` | De datamap is niet gezet in deze terminal of Claude-sessie: `echo $ENDSHOW_DATA`. Terminal: `source ~/.zshrc`. Claude Code: `node tools/setup/claude-env.mjs` en herstart Claude. Frames tellen: zie stap 7; opnieuw maken: `tools/video/extract-frames.sh`. |
| `No module named numpy` / `PIL` | Stap 5 overgeslagen of venv kapot. Controleer `echo $PYTHON` en `"$PYTHON" -c 'import numpy, PIL'`; maak de venv zo nodig opnieuw (stap 5). |
| `error: externally-managed-environment` bij pip | Je installeert buiten de venv: gebruik `"$ENDSHOW_DATA/venv/bin/python" -m pip install ...` (stap 5). |
| `command not found: node` of `claude` | `source ~/.zshrc`, of open een nieuw terminalvenster. Geeft een erg nieuwe Node fouten, gebruik dan Node 22: `brew install node@22` en `echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc`. |
| `prepare-data` eindigt met exitcode 3 | Andere video dan de cloudversie: controleer de checksum (stap 4). |
| `STALE SPANS ... refused` van `tools/video/merge.py` | De spanbestanden zijn gesplitst uit een oudere showversie. Splits opnieuw vóór een nieuwe video-match-ronde: `python3 tools/video/split.py --force` (CLAUDE.md). |
| `zsh: command not found: #`, `unknown file attribute` of `no matches found` bij eigen commando's | Je plakt een regel met `#`-commentaar of haakjes. Laat het commentaar weg, of zet eenmalig `setopt interactivecomments`. |
| `permission denied` op een `.sh`-script | `chmod +x tools/video/*.sh tools/handoff/*.sh` |
| `ffmpeg not found` | `brew install ffmpeg` |
| Geen geluid in de app | Controleer `ls public/assets/audio/` (stap 6); kies anders in de app een bestand of de synth-track. |

Chromium van Playwright gebruiken in plaats van Google Chrome (daarna in dezelfde terminal de meting opnieuw starten;
zet de `export`-regel ook in `~/.zshrc` als het helpt):

```zsh
cd ~/Projects/Q-Crashers
npx playwright-core install chromium
export CHROME_PATH="$(node -e "import('playwright-core').then(m => console.log(m.chromium.executablePath()))")"
echo $CHROME_PATH
```

## Stand van zaken

Zo 27 sep 2026, ± 00:40 (CEST), lokaal op de MacBook Pro (M4 Max, GPU-render).

- Stap 1-9 zijn op de Mac uitgevoerd (video + mp3 met kloppende checksums, cutlijst identiek aan de referentie).
- Gelijkenis op de Mac-GPU (64 momenten, `--settle 500 --min-frames 30`), per moment in
  `research/video-timeline/data/similarity-mac-*.json`:

  | Stand | ruw | na ijking | kleur / licht / vorm |
  |---|---|---|---|
  | Mac-baseline (`a69bc09`) | 52,1 % | 25,6 % | 52,3 / 63,8 / 42,0 |
  | + stage-WIP ronde 4 gemerged | 53,6 % | 27,9 % | 54,4 / 64,9 / 42,9 |
  | + Show-camera-exposure 0,5 (`SHOWCAM_EXPOSURE`) | 57,5 % | 34,0 % | 55,6 / 71,3 / 48,7 |
  | + ronde 5 (schermen, performers, pyro, atmosfeer) | 61,0 % | 39,4 % | 59,8 / 76,2 / 50,1 |
  | + ronde 6 (show/sync, camera, pyro, licht, stage) | 65,5 % | 46,4 % | 65,3 / 79,6 / 54,0 |
  | meetinstrument gecorrigeerd: exacte frametijden + seeds los van de bestandspositie (zelfde code) | 64,7 % | 46,5 % | 63,7 / 79,4 / 53,8 |
  | + ronde 7 (8 groepen: show, camera, pyro, fx, lighting, lasers, env, stage) | 67,1 % | 50,2 % | 67,9 / 80,5 / 54,8 |

- Ronde 5 (findings `docs/handoff/findings/r5_*.md`): schermen tonen kasteelprint i.p.v. vlakke panelen; MC met
  gekleurde key + backlight, close-ups houden de haze, troupe-choreografie en -shots 641-740 s herzien; pyro met
  verlichte rook (flares, serpents, gerb-wolken), lichten per cluster; beam-storm zonder witte sluier, blauwe
  laserlucht, glare-lift weg, hemel naar de video gekeyd, laserzee op showtijd (determinisme), stage-walk-restpunten.
  `scripts/similarity.mjs` doet nu standaard een pre-roll (seek naar t-2 s, 6 frames, dan t).
- Ronde 6 (findings `r6_*.md`): check-sync scoort vuurwerk op het zichtbare moment (break), vrije tempo 60 → 71 %
  binnen 100 ms (rest onderbouwd in `research/video-timeline/sync-r6.md`); MC-tegenlicht in haze 409-412 s (411,5:
  7 → 61 %); roze waaiers 558 s; kadrering van de zwakste momenten (camera); maskers, garlands, FOH-key (stage);
  witte gerb-licht, rook-flits (pyro); backlight/arch-glow (licht). Samengevoegd showbestand: camera-cues van de
  cameragroep, overige cues van de showgroep (op cue-niveau samengevoegd).

- Meetinstrument (27 sep, 00:40): de referentieframes `f4` toonden video-tijd k/4 + 0,12 s (ffmpeg `fps=4` houdt het
  laatste bronframe per slot); nu `fps=4:round=up` (exact, `f4/.timing`). Cue-seeds hangen niet meer af van de
  positie in het showbestand (samenvoegen of een cue toevoegen gooit de rest niet meer om). Nieuwe baseline:
  `similarity-mac-r7.json`; per moment niet vergelijkbaar met eerdere baselines.

- Ronde 7 (findings `r7_*.md`, 27 sep ± 01:40): kleuren van de looks naar de video (o.a. 167 groen/paars-flikker,
  509,25 violet, 1047,25, 289,25), blauwe MC-close-ups, eruptie 1508 en rode sluier 1565 ingekort, kasteel/kroon
  (geverfde kroonschaal, vinnen), troupe-verlichting ontdubbeld, lasers, wash-fallback-bug, grondflits, halo's.
  Showbestand op cue-niveau samengevoegd met `tools/video/merge-show-cues.py`.

Eerdere stand (cloud, vóór de overdracht):

- Alle show-content is uit de video herbouwd (per span, met cameravolgorde = de officiële montage, één shot per cut).
- Muzieksync: steady tracks 876 hits 100 % binnen 20 ms van het grid; free-tempo delen 60 % binnen 100 ms van een
  gemeten onset.
- Objectieve gelijkenis (`scripts/similarity.mjs`, 64 momenten, Show camera vs video), gemeten vóór ronde 4:
  baseline 52,0 % ruw / 25,7 % na ijking (ijking: video vs ander moment van zichzelf = 0 %, identiek = 100 %);
  onderdelen kleur 52,8 / licht 64,3 / vorm 40,5. Per moment: `research/video-timeline/data/similarity-baseline.json`.
- Grootste gat vóór ronde 4: ons veld/vloer was 3-30x te licht (video: veld bijna zwart, licht zit in lucht/rook);
  lagere exposure alleen leverde ~+3 punten (0,35 best op 32 momenten).
- Ronde 4: witte pilaren + FOH/camerapen gemerged in `2e077b0`; lichtbalans veld + bestrating (met laserzee, lucht en
  rook) gemerged in `4c75707`. Resultaat lichtbalans (64 momenten, gemeten door die agent): 52,0 → 54,1 % ruw,
  25,7 → 29,0 % na ijking (kleur 54,3 / licht 67,3 / vorm 42,8). Daarna nog `5c9a882` (pyro-vloerlicht op de nieuwe
  bestrating afgestemd, +0,2 op 6 momenten). Groep stage (kasteelgevel/LED-look + mobiele draw calls) is op jouw
  verzoek halverwege gestopt: 6 WIP-commits t/m `9e6a659` plus `uncommitted.diff` staan in `docs/handoff/wip/stage/`
  (ongetest; eerst meten, dan houden wat winst geeft). De stand per groep staat in `docs/handoff/wip/STATUS.md`.
  De opdrachten staan in `docs/handoff/findings/r4_*.md`, de contractverzoeken van ronde 4 in
  `docs/handoff/findings/r4_contracts_*.txt` en het plan voor de volgende ronde in `docs/handoff/findings/r5_next.md`.
- MC-close-ups 347-459 s volgen de MC via `camera.shot` `p.subject='mc'` (`docs/show-format-ext/core.md`).
- Podium beloopbaar (spots `dj`, `dancers`), lege DJ-booth met CDJ-achtige set zonder merklogo's, geen DJ in de show.
- Artifact: https://claude.ai/artifact/8ZTMp8XW6hczruUKoiJhDi — bijgewerkt za 26 sep ± 21:25 (versie 4, stand `eb182d9`, zonder de stage-patch)
- Meetkanttekening: dezelfde code gaf in de cloud op 1047,25 s eenmaal 27,3 % en eenmaal 12,1 % (zwaardere CPU-last,
  dus minder frames na de seek). Daarom bestaat `--min-frames` en begint stap 9 met een stabiliteitscheck.
- Tools zijn overgezet: datamap via `ENDSHOW_DATA`, browserkeuze via `scripts/lib/browser.mjs` (Chrome + GPU op de
  Mac), workflowscripts met alle paden als argumenten (`tools/workflows/`).

## Nieuwe wensen van de gebruiker (26 sep 2026, avond)

Gepland voor ronde 7-8 (na de metriekrondes, met eigen groepen en een controle achteraf):

- Perception: XTC- en alcoholeffecten duidelijk sterker (analyse loopt), en ketamine als derde optie met
  educatieve risicowaarschuwing in dezelfde stijl als XTC (Trimbos/Jellinek-bronnen, nooit gebruiks-, doserings- of
  aankoopinformatie). De Show-camera blijft onaangetast.
- Reuzenrad (`src/world/landmarks.ts`, `FERRIS_WHEEL` in `src/world/site.ts`): erheen lopen, instappen (E / tik),
  rit met gondel-schommel en uitzicht op de show, uitstappen; spot "Reuzenrad"; rotatie als functie van de showtijd.
- Fotomodus verwijderen (camera 'photo', `src/ui/PhotoPanel.ts`, DOF/bokeh in postfx, UI-knoppen/sneltoetsen);
  de spot "Photo terrace" (uitzichtpunt) blijft.
- Vergelijkmodus: split-screen met de officiële YouTube-video (embed, gesynchroniseerd met de showtijd; niets van de
  video wordt verspreid). Werkt lokaal; in de claude.ai-artifact kan een YouTube-iframe geblokkeerd zijn.
- Geluid met afstandsvertraging: knallen van pyro/vuurwerk komen verder weg later aan (343 m/s).
- Lichtgevoeligheid: waarschuwing bij de start + optie "minder flitsen".
- Niet nodig (besloten): VR/WebXR, deelbare momenten-menu. Advies over rechten (audio, merken) is genoteerd: de
  artifact blijft privé.

## Open punten (prioriteit)

Het uitgewerkte plan met meetpunten en bestanden staat in `docs/handoff/findings/r5_next.md`; kort:

1. ~~Ronde 4 afronden~~ klaar op de Mac (26 sep): baseline, stage-patch gemerged, Show-camera-exposure 0,5.
   Punten 2-4 en delen van 5/7 zijn in ronde 5 aangepakt; restpunten en contractverzoeken van ronde 5 staan in
   `docs/handoff/findings/r6_*.md` (ronde 6).
2. Schermen: `screens.content` mode `'color'` rendert als vlakke felle panelen achter de MC (348, 361, 369, 447 s);
   de video toont kasteelkunst/ornamenten — render als getinte kasteel-/ornamenttextuur op gematigd niveau.
3. Performerverlichting: MC egaal grijs belicht; video: sterk gekleurde key + tegenlicht in dichte haze (bv. 351,
   409-412 s).
4. Dansers/troupe-shots 641-740 s: 8 momenten gecontroleerd; fout gekadreerd zijn 660,9 (video: close-up danseres
   met waaiers op het podium), 669,5 (camera in een danseres) en 723,8 (danseres loopt naar de camera). Aanpak als bij
   de MC: `subject` uitbreiden naar 'lead' / dansers.
4b. Determinisme na een seek: 1243 s rendert per run anders (schone beam-storm vs witte haze); vermoedelijk
   deeltjes/rook die van het vorige moment blijven hangen. Reproduceren en oplossen (r5_next.md §6).
5. Contractverzoeken podium-walk: lighting rig blinder `T_BOOTH` naar (0, 4.05, -6.35), arch-spot focus via
   `stageFloorAt` (`src/world/stageWalk.ts`), near-camera fade in de beam-volume shader, CameraRig `floorAt` op
   trappen, design-bible §5.4/§5.13 maten vault/booth/podium.
6. Mobiel: draw calls 114-126 vs budget 110 (MainStage crown per materiaal, Bars, grounds); deels in de stage-patch.
7. Free-tempo sync verbeteren (Vivaldi, Discorecord-intro, bridge, Domitor, outro).
8. Resterende cue/engine-gaten uit `docs/handoff/findings/r2_show_contract.txt` (lambda 'trees'-laserpreset,
   hart-vuurwerk boog, flood zonder de set te verlichten, twin white V gerbs @76, towers_top dunne vlamkolommen,
   grotere vuurwolk 1508,8/1566).
9. Eindjudges (accuracy/stage/crowd/perception) en artifact opnieuw publiceren (`npm run build:artifact`; publiceren
   naar dezelfde artifact-URL).
