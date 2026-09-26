# Defqon.1 2026 — The Endshow Experience

Interactieve, real-time 3D-reconstructie (hobby-tribute) van de Endshow van Defqon.1 2026: de show die op
zaterdag 27 juni 2026 op het lege Holy Grounds-terrein werd opgevoerd nadat het festival wegens extreme hitte
was afgelast. Loop vrij over het terrein, kijk vanaf de FOH, uit de show-camera of vanuit de lucht, en beleef
de volledige show (26:21) — licht, lasers, vlammen, vuurwerk, schermen, CO₂, rook en publiek — synchroon met de
muziek.

Geen officieel product; niet gelieerd aan Q-dance. Muziek en video zijn niet meegeleverd (zie *Audio*).

## Starten

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # typecheck + productiebuild in dist/
npm run preview        # dist/ lokaal serveren
npm run validate-show  # show-JSON controleren tegen het cue-contract
npm run build:artifact # sandbox-variant (claude.ai artifact) in dist-artifact/
```

Vereist een browser met WebGL2 (Chrome, Edge, Firefox, Safari 16+). Mobiel werkt in liggende stand met
touch-besturing; de kwaliteit schaalt automatisch.

## Audio

De show loopt op een abstracte audioklok. Plaats de originele Endshow-audio lokaal in
`public/assets/audio/` als `endshow-2026.m4a | .mp3 | .ogg | .opus | .webm | .wav` (begin = video 00:00).
De app kiest automatisch een formaat dat de browser kan decoderen. Zonder bestand kun je in de app een bestand
van schijf kiezen, de officiële YouTube-video als gesynchroniseerde bron gebruiken (alleen web-build), of een
gesynthetiseerde repetitietrack afspelen. Details: `public/assets/audio/README.md`.

Auteursrechtelijk beschermde media staan in `.gitignore` en worden nooit gecommit.

## Besturing

| Toets | Actie |
|---|---|
| W A S D / pijltjes | lopen · (vrije camera: vliegen) |
| muis | rondkijken (klik voor pointer-lock) |
| Shift | sprinten |
| Spatie / C | omhoog / omlaag (vrije camera) |
| V | first ↔ third person |
| 1 … 6 | camera: first person · third person · vrij · flyover · show-camera · foto |
| K | afspelen / pauzeren |
| J / L | 10 s terug / vooruit |
| T | naar een positie springen (FOH, pit, pilaren, bars, …) |
| E | interactie (bar bestellen) |
| X | perceptie-simulatie (alcohol / XTC-educatie / vergelijking) |
| G | publiek: *Tribe* (vol terrein) of *As filmed* (leeg terrein) + publieksgrootte |
| O | fotomodus |
| H | cinema-modus (UI verbergen) |
| M | geluid aan/uit |
| F | volledig scherm |
| ? | help |
| ` (backquote) | verborgen debugmenu |

## URL-parameters

`?t=<s>` start op tijd · `autostart` · `play` · `quality=ultra|high|medium|mobile` · `nogovernor` ·
`camera=<modus>` · `cam=x,y,z,yaw,pitch` · `spot=<id>` · `mode=filmed` · `off=<systeem,…>` · `nopost` ·
`debug` · `synth` · `analyze=0|force`.

## Architectuur (kort)

* **Three.js r186 / WebGL2, TypeScript strict, Vite.** Eigen GLSL voor vlammen, vuurwerk, lasers, volumetrische
  beams, rook en publiek.
* **Deterministische show-engine** — `public/show/endshow-2026.json` (secties, tempo-map, paletten, momenten en
  ~1.900 cues; contract in `docs/show-format.md`). Elk beeld is een pure functie van showtijd: zoeken, pauzeren
  en herstarten geven exact hetzelfde beeld.
* **Analytische GPU-deeltjes** (vuurwerk, vonken, CO₂, confetti) — positie in gesloten vorm in de vertex-shader.
* **LightEnv-bus** als goedkope GI: podiumkleur, publieks-wash, flitsen en strobes kleuren terrein en publiek.
* **HDR-postprocessing**: energie-behoudende bloom, tonemapping, perceptie-effecten en split-vergelijking.
* **Publiek** in drie LOD's (GPU-geskinde silhouetten dichtbij, instanced midden, impostors ver).
* **Kwaliteitspresets + PerfGovernor** (dynamische resolutie, dan preset-stap).

## Checks

Draai deze tegen een lopende dev-server (`npm run dev`, of `npx vite --port <poort>` + `--base`):

```bash
npx tsc --noEmit                               # TypeScript strict
node scripts/validate-show.mjs --quiet         # show-JSON tegen het cue-contract
node scripts/budget-check.mjs --base http://localhost:5173/
```

`scripts/budget-check.mjs` is de mobiele render-budgetcheck (CI): hij rendert de preset **mobile** op een
telefoonviewport (844×390, touch) op de zwaarste showmomenten (standaard `t=843` en `t=1515`), vanuit de
startcamera én een hoog overzicht over het hele terrein, en faalt (exit 1) zodra één frame meer dan
**110 draw calls** (alle draws van het frame: scène + post-processingpasses; de uitvoer splitst ze) of
**800k driehoeken** kost (budgetten uit `docs/performance.md`). Exit 3 = laad- of
paginafout. Opties: `--times 843,1515`, `--views default,overview`, `--calls 110`, `--triangles 800000`,
`--size 844x390`, `--json out.json`. Losse schermafbeelding met budgetcontrole:
`node scripts/shot.mjs "autostart&quality=mobile&t=843" .shots/m.png --mobile --budget`.

## Onderzoek

`research/` bevat de Design Bible (`design-bible.md`) en de onderbouwing per onderwerp (podium, terrein,
show, muziek, productie, publiek & bars, onzekerheden, bronnen). Beweringen zijn gelabeld als
FACT / INFERENCE / ASSUMPTION / UNKNOWN.

## Educatieve simulaties

De alcohol- en XTC-modi tonen uitsluitend waarneembare effecten en risico's ter voorlichting. Ze bevatten
geen dosering of gebruiksinformatie. Gebruik bevat risico's; zie bijvoorbeeld drugsinfo.nl of de
Drugs Infolijn (0900-1995).
