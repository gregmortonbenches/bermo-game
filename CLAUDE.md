# GTA Bermondsey: notes for Claude

Wholesome GTA III-style 3D game set in real Bermondsey, London. three.js (0.160, jsdelivr importmap), no build step. Plain static files.

## Layout
- `index.html`: page shell, styles, ordered `<script src="js/...">` tags.
- `js/` classic scripts sharing ONE global scope. Load order: core, vehicles, player, world, audio, life, radio, jobs, crew, ui, render, main.
  - Top-level code must not use symbols from later files (functions are fine once called later). `hazard.mjs` checks this.
  - 2D pixel units, 1.3 px = 1 m. r3d.js converts with K = 1/1.3.
- `r3d.js`: ES module three.js renderer. `world3d.json`, `data.json`, `mly.json`, `grid.png`, `map.png`, `bg.jpg`: data.
- `ROADMAP.md`: phases, what is done, what is parked.

## Gotchas
- Global `G` is the game's grid. Never shadow it.
- `startGame()` opens an intro dialog that pauses the game; call `closeDlg()` in tests.
- Tile codes: 0 pavement, 1/7 road, 2 building, 3 water, 5/6 grass/plaza. Walkable = 0, 5, 6.
- Weather: see the Weather section. Tests: fix the Date, use `DBGWX`, `DBGRAIN`, `DBGH`, `DBGDOW`, `DBGCAM`.
- Sound is procedural Web Audio: music/sfx/amb buses with trims into a limiter. Driving numbers sit in `DRV_TUNE` (vehicles.js). Keep new sounds quiet; measure with `sndRms()`.
- Headless swiftshader timings are not representative of phones.
- Memory: iPhones kill the tab around 1 GB. Geometry builders (`GB()`/`VB()` in r3d.js) store into growing Float32Arrays (`FA`), never plain JS arrays; pass them to three.js with `F32(x.p)`. Check load memory with CDP `Performance.getMetrics` (JSHeapTotalSize); it was 1312 MB peak with plain arrays and is about 109 MB now.

## Publish routine
1. Test with Playwright (chromium at /opt/pw-browsers/chromium-1243/chrome-linux64/chrome, flags `--use-gl=swiftshader --enable-unsafe-swiftshader`).
2. Publish the files to the public artifact (slug a15e26a9-0d68-4a14-a30d-1eaf42b5698c, title "GTA Bermondsey", must stay public).
3. Commit and `git -c push.negotiate=true push origin main` so the repo matches the artifact.

## Preferences
- Wholesome tone. Story missions and online crew/sharing are parked until Greg says otherwise.
- Greg judges sound and driving by ear and feel, so say plainly when something is measured but not heard.

## Weather
Live London weather from Open-Meteo is read in js/life.js (`WX`, `wxNow()`); it falls back to the old date rule if blocked. Test with `DBGWX`, `DBGH` (hour) and `DBGDOW` (day of week).

## Radio and parachute
- `js/radio.js`: car radio from the Radio Browser directory (BAG menu, T = next station). Plays only in a vehicle, silences the jazz.
- `js/chute.js`: freefall then automatic parachute (jump out of the helicopter, leap from a roof edge). Low fences (`FLOW` grid in r3d.js, `hitJ` in core.js) can be cleared with a jump.
- three.js hides an object only when `visible === false`: never set `.visible` to undefined.
