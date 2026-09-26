# Overdracht: verder op je MacBook Pro (M4 Max)

Tot nu toe liep het werk in een cloudcontainer zonder GPU: elke render ging via SwiftShader (software) en kostte
20-90 s per frame. Op je MacBook Pro rendert Chrome via de GPU (Metal), dus renders, vergelijkingen en metingen gaan
tientallen keren sneller. Dit document zet alles stap voor stap klaar; daarna start je een lokale Claude Code-sessie
die met `CLAUDE.md` en dit bestand verder kan zonder de oude gesprekscontext.

Alle commando's zijn voor zsh (standaard op macOS) en kun je zo kopiëren. Tijden zijn schattingen voor een M4 Max.

## Overzicht: wat staat waar

| Waar | Wat |
|---|---|
| `~/Projects/Q-Crashers` | de repository (code, showbestand, documentatie, tools) |
| `~/Projects/endshow-data` | de lokale datamap (`ENDSHOW_DATA`): video, frames, features, werkbestanden; **nooit in git** |
| `research/video-timeline/data/` (in de repo) | afgeleide getallen: cutlijst, signaaltabellen, similarity-baseline |
| `tools/video/` | datapijplijn en side-by-side-tools |
| `tools/workflows/` | workflowscripts (video-match, judges, fixers) |
| `docs/handoff/findings/` | de laatste findings (ronde 4) en open cue/engine-gaten |

De datamap staat standaard naast de repo (`../endshow-data`); dan werkt alles ook zonder omgevingsvariabele.

## 1. Basissoftware (± 10 min)

Homebrew (sla over als `brew --version` al werkt):

```zsh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

Node 22, ffmpeg, git, Python, GitHub CLI en Google Chrome:

```zsh
brew install node@22 ffmpeg git python gh
brew install --cask google-chrome          # overslaan als Chrome al in /Applications staat
echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
node -v        # v22.x
ffmpeg -version | head -1
python3 --version
```

## 2. Repository klonen (± 1 min)

```zsh
mkdir -p ~/Projects && cd ~/Projects
gh auth login                               # alleen nodig als de repository privé is (GitHub.com, HTTPS, via browser)
git clone https://github.com/markkorbee-commits/Q-Crashers.git
cd ~/Projects/Q-Crashers
git checkout claude/defqon-endshow-experience-wi4oos
git pull
git log --oneline | head -5                 # laatste commits (o.a. ronde 4, zie "Stand van zaken")
```

## 3. npm install (< 1 min)

```zsh
cd ~/Projects/Q-Crashers
npm install
```

## 4. Datamap + video (1-5 min, afhankelijk van je verbinding)

```zsh
echo 'export ENDSHOW_DATA="$HOME/Projects/endshow-data"' >> ~/.zshrc
source ~/.zshrc
mkdir -p "$ENDSHOW_DATA/video"
open "https://drive.google.com/file/d/1fZ5OmmScJmbhAqEbqXeMqJstzHHU7Cax/view"
```

Download de video in de browser (589 MB; Google meldt dat het bestand niet op virussen gescand kan worden: kies
"Toch downloaden"). Verplaats hem daarna naar de datamap (pas de naam in Downloads aan als die anders is):

```zsh
mv ~/Downloads/endshow.mp4 "$ENDSHOW_DATA/video/endshow.mp4"
ls -l "$ENDSHOW_DATA/video/endshow.mp4"                 # 589415472 bytes
shasum -a 256 "$ENDSHOW_DATA/video/endshow.mp4"         # 397c0d90e37b2d45442c9106b79b165e9f2b23f5ae1c8a090315875e278068b5
```

Wijkt de checksum af, dan is het een andere encode: de tools werken wel, maar stap 7 meldt dan verschillen met de
vastgelegde cutlijst.

Optioneel: zet je eigen daglichtfoto's van het podium in `$ENDSHOW_DATA/refs/day/` (namen zoals in
`docs/handoff/findings/r4_pillars.md`, bv. `day2_axis.jpg`, `day3_aerial.jpg`, `day5_front.jpg`).

## 5. Python-omgeving (± 1 min)

De Python van macOS/Homebrew is "externally managed": installeer pakketten in een eigen venv in de datamap.

```zsh
python3 -m venv "$ENDSHOW_DATA/venv"
source "$ENDSHOW_DATA/venv/bin/activate"
pip install --upgrade pip numpy pillow scipy            # scipy alleen voor scripts/audio-onsets.py
```

Activeer de venv in elk nieuw terminalvenster waarin je de tools gebruikt:

```zsh
source "$ENDSHOW_DATA/venv/bin/activate"
```

(`tools/video/prepare-data.sh` vindt de venv ook zonder activeren.)

## 6. Audio (± 1 min)

De show loopt op de audio. Zet je mp3 in de (git-genegeerde) audiomap:

```zsh
cd ~/Projects/Q-Crashers
cp ~/Downloads/<jouw-bestand>.mp3 public/assets/audio/endshow-2026.mp3
```

Alternatief: `brew install yt-dlp && npm run fetch-audio` (haalt de audio van de officiële YouTube-video).

## 7. Videodata voorbereiden (± 2-4 min)

```zsh
cd ~/Projects/Q-Crashers
tools/video/prepare-data.sh
```

Dit maakt uit de video: `f4/` (6324 frames, 4 per seconde, 480x270; frame `NNNNN.jpg` = video-tijd `NNNNN/4` s),
`features.npz` (parallel in zoveel stukken als de Mac kernen heeft), `spans/` (werkbestanden per showdeel),
`cuts.json` en `signals/`. Aan het eind controleert het script de cutlijst en signaaltabellen tegen de versie in de
repo; verwacht: `cuts.json and signals/*.txt identical to the committed copies`.

Controle: `ls "$ENDSHOW_DATA/f4" | wc -l` geeft 6324.

## 8. Dev-server starten en de app openen

```zsh
cd ~/Projects/Q-Crashers
npm run dev
```

Open `http://localhost:5173/` in Chrome. Direct naar de show-camera op het eerste anthem-drop-moment:
`http://localhost:5173/?autostart&camera=showcam&t=415`. Laat deze terminal open; gebruik voor de volgende stappen
een tweede terminalvenster (Cmd+T).

GPU-check van de testharnas (de regel `[browser] WebGL renderer:` moet de Apple-GPU noemen, niet SwiftShader):

```zsh
cd ~/Projects/Q-Crashers
node scripts/shot.mjs "autostart&t=700&camera=showcam" .shots/gpu-test.png
open .shots/gpu-test.png
```

## 9. Similarity-baseline op 64 momenten (enkele minuten)

De objectieve meting vergelijkt de Show camera met de videoframes (kleur, licht, vorm). De cloud-baseline (52,0 %
ruw / 25,7 % na ijking) is met SwiftShader gemeten; leg op de Mac een eigen baseline vast en vergelijk voortaan
daarmee.

Eerst de meetstabiliteit (sommige beeldtoestand na een seek hangt af van het aantal gerenderde frames):

```zsh
cd ~/Projects/Q-Crashers
source "$ENDSHOW_DATA/venv/bin/activate"
T=411.5,1047.25,484.75,264.75,1463,1438.5,607,778.25
node scripts/similarity.mjs --port 5173 --times $T --settle 500 --min-frames 30 --out "$ENDSHOW_DATA/work/sim/stab_fast"
node scripts/similarity.mjs --port 5173 --times $T --settle 2000 --min-frames 120 --out "$ENDSHOW_DATA/work/sim/stab_slow"
```

Liggen beide binnen ± 1 punt, gebruik dan de snelle instelling voor de baseline:

```zsh
node scripts/similarity.mjs --port 5173 --settle 500 --min-frames 30 --out "$ENDSHOW_DATA/work/sim/mac_base"
open "$ENDSHOW_DATA/work/sim/mac_base/report.jpg"       # de 6 slechtste en 6 beste momenten (video | ons)
```

De uitvoer toont `overall` (ruw), `normalised` (na ijking) en de onderdelen kleur/licht/vorm, plus een score per
track. Noteer deze getallen: dat is het vertrekpunt voor de open punten.

Side-by-side kijken naar losse momenten (video links, onze Show camera rechts):

```zsh
node tools/video/vcompare.mjs --port 5173 --showcam --settle 600 --shots "348;361;411.5;447" --out mc.jpg
open "$ENDSHOW_DATA/work/compare/mc.jpg"
```

## 10. Claude Code starten

Start Claude Code in de repo, bij voorkeur vanuit een terminal waarin `ENDSHOW_DATA` gezet en de venv actief is.

- **Desktop-app:** open Claude Code in de Claude-app en kies als werkmap `~/Projects/Q-Crashers`.
- **CLI:**

  ```zsh
  curl -fsSL https://claude.ai/install.sh | bash        # eenmalig (of: npm install -g @anthropic-ai/claude-code)
  cd ~/Projects/Q-Crashers
  source "$ENDSHOW_DATA/venv/bin/activate"
  claude
  ```

Eerste prompt (plakken):

```text
Lees CLAUDE.md en HANDOFF.md en ga verder met de open punten.
```

Uitgebreidere variant:

```text
Lees CLAUDE.md en HANDOFF.md en ga verder met de open punten. De datamap staat in ~/Projects/endshow-data
(ENDSHOW_DATA), de venv in ~/Projects/endshow-data/venv, de dev-server draait op poort 5173. Begin met open punt 1:
controleer in de git-log of ronde 4 is gemerged, leg de Mac-baseline vast en rapporteer de getallen.
```

## Problemen oplossen

| Probleem | Oplossing |
|---|---|
| `No Chrome/Chromium found` | Installeer Chrome (`brew install --cask google-chrome`), of `npx playwright-core install chromium`, of wijs een browser aan: `export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`. |
| `[browser] WebGL renderer:` noemt SwiftShader | Probeer een zichtbaar venster: `HEADED=1 node scripts/similarity.mjs ...`, of `CHROME_ARGS="--use-angle=metal"`. Kijk in Chrome zelf op `chrome://gpu` of WebGL hardware-versneld is. `RENDERER=swiftshader` forceert bewust software (alleen voor vergelijking met de cloudmetingen). |
| Poort bezet (`Port 5173 is already in use`) | `lsof -nP -iTCP:5173 -sTCP:LISTEN` en `kill <PID>`, of neem een andere poort: `npx vite --port 5180 --strictPort` en geef de tools `--port 5180` (shot.mjs: `--base http://localhost:5180/`). |
| Ontbrekende frames (`frames dir not found`, zwarte linkerhelft in vcompare) | Controleer `ls "$ENDSHOW_DATA/f4" \| wc -l` (6324) en `echo $ENDSHOW_DATA`; opnieuw maken: `tools/video/extract-frames.sh`. |
| `No module named numpy` / `PIL` | Venv activeren (`source "$ENDSHOW_DATA/venv/bin/activate"`) of `export PYTHON="$ENDSHOW_DATA/venv/bin/python"`. |
| `error: externally-managed-environment` bij pip | Je installeert buiten de venv: zie stap 5. |
| `command not found: node` of verkeerde versie | `source ~/.zshrc` (PATH-regel uit stap 1), daarna `node -v`. |
| `permission denied` op een `.sh`-script | `chmod +x tools/video/*.sh` |
| `ffmpeg not found` | `brew install ffmpeg` |
| Geen geluid in de app | Controleer `ls public/assets/audio/` (stap 6); kies anders in de app een bestand of de synth-track. |

## Stand van zaken

Za 26 sep 2026, avond.

- Alle show-content is uit de video herbouwd (per span, met cameravolgorde = de officiële montage, één shot per cut).
- Muzieksync: steady tracks 876 hits 100 % binnen 20 ms van het grid; free-tempo delen 60 % binnen 100 ms van een
  gemeten onset.
- Objectieve gelijkenis (`scripts/similarity.mjs`, 64 momenten, Show camera vs video): baseline 52,0 % ruw / 25,7 %
  na ijking (ijking: video vs ander moment van zichzelf = 0 %, identiek = 100 %); onderdelen kleur 52,8 / licht 64,3
  / vorm 40,5. Per moment: `research/video-timeline/data/similarity-baseline.json`.
- Grootste gat: ons veld/vloer is 3-30x te licht (video: veld bijna zwart, licht zit in lucht/rook); lagere exposure
  alleen levert ~+3 punten (0,35 best op 32 momenten).
- Ronde 4 liep bij de overdracht: lichtbalans veld + bestrating, witte pilaren + FOH/camerapen, kasteelgevel/LED-look
  + mobiele draw calls — resultaat staat in de git-log (of als patch in `docs/handoff/wip/` als niet af). De
  opdrachten staan in `docs/handoff/findings/r4_*.md`.
- MC-close-ups 347-459 s volgen de MC via `camera.shot` `p.subject='mc'` (`docs/show-format-ext/core.md`).
- Podium beloopbaar (spots `dj`, `dancers`), lege DJ-booth met CDJ-achtige set zonder merklogo's, geen DJ in de show.
- Artifact (oude versie): https://claude.ai/artifact/8ZTMp8XW6hczruUKoiJhDi
- Meetkanttekening: dezelfde code gaf in de cloud op 1047,25 s eenmaal 27,3 % en eenmaal 12,1 % (zwaardere CPU-last,
  dus minder frames na de seek). Daarom bestaat `--min-frames` en begint stap 9 met een stabiliteitscheck.
- Tools zijn overgezet: datamap via `ENDSHOW_DATA`, browserkeuze via `scripts/lib/browser.mjs` (Chrome + GPU op de
  Mac), workflowscripts met alle paden als argumenten (`tools/workflows/`).

## Open punten (prioriteit)

1. Na ronde 4: 64-momenten meting (eerst Mac-baseline + stabiliteitscheck, stap 9); exposure/"filmed" look
   vastzetten in `src/postfx` (beste waarde uit de meting).
2. Schermen: `screens.content` mode `'color'` rendert als vlakke felle panelen achter de MC (348, 361, 369, 447 s);
   de video toont kasteelkunst/ornamenten — render als getinte kasteel-/ornamenttextuur op gematigd niveau.
3. Performerverlichting: MC egaal grijs belicht; video: sterk gekleurde key + tegenlicht in dichte haze (bv. 351,
   409-412 s).
4. Dansers/troupe-shots 641-740 s nog niet tegen de video gecontroleerd (zelfde aanpak als MC: subject-shots).
5. Contractverzoeken podium-walk: lighting rig blinder `T_BOOTH` naar (0, 4.05, -6.35), arch-spot focus via
   `stageFloorAt` (`src/world/stageWalk.ts`), near-camera fade in de beam-volume shader, CameraRig `floorAt` op
   trappen, design-bible §5.4/§5.13 maten vault/booth/podium.
6. Mobiel: draw calls 114-126 vs budget 110 (MainStage crown per materiaal, Bars, grounds).
7. Free-tempo sync verbeteren (Vivaldi, Discorecord-intro, bridge, Domitor, outro).
8. Resterende cue/engine-gaten uit `docs/handoff/findings/r2_show_contract.txt` (lambda 'trees'-laserpreset,
   hart-vuurwerk boog, flood zonder de set te verlichten, twin white V gerbs @76, towers_top dunne vlamkolommen,
   grotere vuurwolk 1508,8/1566).
9. Eindjudges (accuracy/stage/crowd/perception) en artifact opnieuw publiceren (`npm run build:artifact`; publiceren
   naar dezelfde artifact-URL).
