# GTA Bermondsey — Roadmap

The big pieces of work beyond small tweaks, in the order to do them. The scheduled play-test rounds keep handling bugs and polish. This file is for the larger work that needs dedicated sessions.

**Parked for now:** story missions, sharing with real players and the online crew. They're kept at the bottom of this file for later.

Sizes: **S** = one session, **M** = two or three, **L** = a week or more of sessions.

---

## 0. Foundations: split the code (M) — DONE 26 Nov 2026

**Why:** All the game logic is in one 124 KB `index.html`, with about 160 functions in a single script. Each later phase (audio, driving, routines, streaming) needs a clean place to live. Without that, every change risks breaking something else.

**What to do**
- Move the script out of `index.html` into ES modules: `audio.js`, `vehicles.js`, `peds.js`, `world.js` (time and weather), `crew.js` (link-up), `save.js`, `ui.js`, and `main.js` to wire them together.
- Keep the behaviour exactly the same. This is a move, not a redesign.
- Keep the debug hooks the tester relies on (`step`, `ctxAct`, `DBGCAM`, `DBGH`, `DBGFOV`, `R3DBG`, `ready`, `startGame`) on `window`.
- Make sure the game still runs both from GitHub Pages and as the claude.ai artifact (same files, no build step).

**Done when:** the tester and the core-play checks pass unchanged, and no single file is over about 40 KB apart from the data files and `r3d.js`.

**Result:** the script now lives in ten plain script files under `js/` (core, vehicles, player, world, audio, jobs, crew, ui, render, main), loaded in that order by `index.html`, with the biggest at about 22 KB. They are classic scripts sharing one global scope rather than ES modules, so every debug hook and function name works exactly as before. A deterministic before-and-after run (fixed random numbers and clock, scripted walking, running and a helicopter flight) gave identical positions for every car and pedestrian. Moving to real ES modules can wait until a later phase needs it.

**Scheduled rounds:** update their file list and rules to the new layout once this lands.

---

## 2. Sound (M) — DONE 26 Nov 2026 (first pass)

**Why:** Sound does more than graphics to make a low-poly world feel alive. Right now the game has synthesised jazz and two sound effects (a horn and a bump crunch), and nothing else.

**What to do**
- **Player:** footsteps that change with the surface (pavement, grass, cobbles at Maltby Street, wooden decking), jump and land, and a door sound for shops.
- **Vehicles:** engine pitch that follows speed for each type (hatchback, van, e-bike hum, helicopter rotor), indicators, gentle braking, and EVs that are nearly silent.
- **Ambient zones:** trains over the railway arches (timed to the trains you can see), market chatter at Maltby Street and the Blue Market, birds and ducks at the Southwark Park lake, river and gulls near the Thames, pub murmur in the evening, rain on roofs.
- **Mix:** a simple mixer (music, effects and ambience volume) in the pause menu, ducking the music during conversations, and distance falloff.
- Keep everything procedural (Web Audio) or in small self-hosted files in the repo. No new external hosts.

**Done when:** a blind listen tells you whether you're in the park, at the market, by the arches or driving.

**Result (all in `js/audio.js`, no audio files):** engine sounds that follow speed with gear changes (hatchback, black cab, van, bus; a quiet whirr for e-bikes and scooters), helicopter rotor that spools up and fades with distance, tyre squeal on hard braking, indicator ticks, footsteps that change on grass, paving, cobbles (Maltby Street, Shad Thames) and plaza, jump and landing thumps, car door thuds and the shop doorbell. Ambience beds for traffic, rain, the river and lake, market chatter on weekday daytime hours, pub murmur in the evening, birdsong and ducks in the park, gulls by the Thames and trains rumbling past the railway. A mixer (Bag, then Sound levels) sets music, effects and ambience separately and is remembered; music dips while a dialogue is open; everything goes quiet when the map is open. It was checked by measuring the output level in each place and situation, not by ear, so it needs a proper listen from you. Not done yet: wooden decking footsteps, real train timings (there are no visible trains to match), indicators only tick while steering, and market chatter doesn't follow real market days yet (that's phase 4).

**Idea parked, needs your decision:** real London radio in cars. Best done with a short hand-checked list of station streams baked into the game (jazz and community stations), not a live lookup of the Radio Browser directory, with the jazz trio as fallback and a radio-off option. It means the game contacting each station's own server, so it breaks the "no new external hosts" rule.

---

## 3. Driving and camera feel (S–M) — DONE 26 Nov 2026 (first pass)

**Why:** In a GTA III-style game, how the car handles and how the camera follows it make up a lot of the experience.

**What to do**
- One focused tuning session: acceleration curve, top speed per vehicle, grip and gentle drift, braking distance, and handbrake turns.
- Chase camera: lag and spring, looking ahead into turns, a wider field of view at speed, and auto-centring after you stop using the look stick.
- Make each vehicle feel different (hatchback, van, bus, e-bike, e-scooter, helicopter).
- Small touches: a body roll hint, wheel turn, light camera shake on kerbs.
- Expose the tuning numbers in one config object so they're easy to adjust later.

**Done when:** a lap of Jamaica Road → Tower Bridge Road → Southwark Park Road feels good on both keyboard and phone sticks.

**Result:** all the numbers are in one `DRV_TUNE` object at the top of the driving code in `js/vehicles.js`. Steering now eases in over about a tenth of a second (it used to snap instantly) and turns wider the faster you go (turning circle at top speed about 9 m instead of 6.5 m). Launch is snappier and the car eases into top speed instead of hitting a wall. The body leans out of turns and the nose lifts on launch and dips under braking. The camera pulls back, widens its view and looks ahead as speed rises, and lags a little more in fast turns. The sound mix was turned right down after the first version was too loud (effects and ambience now sit well under the music; Bag, then Sound levels, has headroom). It was checked by measurement and screenshots, not by feel, so it needs a proper drive from you. Left alone on purpose: braking is still very sharp (from top speed to a stop in about 2 m), and there is no sideways drift or handbrake turn.

---

## 4. A neighbourhood that lives (M–L) — first pass DONE 26 Nov 2026

**Why:** Locals will recognise the rhythm of the place, and it suits the wholesome tone better than chaos. Time of day already follows the real clock. Rain is currently faked (every third day of the month).

**What to do**
- **Opening hours:** cafés, shops and pubs open and close, with lights on and off, shutters, and staff arriving.
- **Market days:** Maltby Street and the Blue Market are busy on their real trading days and quiet otherwise.
- **Daily routines:** a few named locals with simple schedules (the postie's round, the school run, dog walkers in the park at dawn and dusk, the evening pub crowd) whom players start to recognise.
- **Traffic and crowds that follow the clock:** rush hours, quiet nights, and busier weekends around the markets.
- **Better weather:** replace the "every third day" rule with a proper weather cycle (dry, overcast, drizzle, downpour, fog by the river) that changes during a play session. Optional: real London weather. That would need a new external host (for example Open-Meteo, which needs no key), so it's Greg's call.
- **Seasons:** Christmas lights in December and similar touches.

**Done when:** playing at 8am on a Saturday feels noticeably different from 10pm on a Tuesday.

**First pass (js/life.js):** real hours per shop type (locked door and "Opens at 9am" when shut, dimmed name tags, favours only from open shops); real market days (Maltby Street Fri 5.30–9pm / Sat 10–5 / Sun 11–4, Blue Market Mon–Sat 9–5, Bermondsey Square antiques Fri 6am–2pm, Spa Terminus Sat) with stalls only built on trading days and market chatter only then; pedestrian and traffic numbers follow the clock (quiet nights, rush hours, weekends); weekday school run (kids with parents walking to the real schools at 8–9am and out again at 3pm, skipping school holidays) and commuters to and from the tube and rail stations (7–9.30am, 5–7pm). Test with DBGH (hour) and DBGDOW (0=Sun). **Weather (live London, Open-Meteo, no key):** rain, drizzle, cloud, fog and the sound of rain follow the real conditions (refreshed every 15 minutes, cached, with the old date-based rain as a fallback if the request fails). The menu shows the current conditions. Wet road surfaces and puddles are built at load, so a session that sees rain start needs a reload for those. Tests can fake it with `DBGWX={rain,cloud,fog,wet}`. **Also done:** Friday antiques stalls in Bermondsey Square (6am–2pm), Christmas lights strung across the main streets from 1 Dec to 5 Jan (test with `DBGXMAS=1`), more dog walkers at dawn and teatime. Not yet: shop lights and shutters, thunder and snow looks, a Christmas tree. Stalls are built at page load, so a session that crosses opening time needs a reload.

---

## 5. Phones and loading (M)

**Why:** The game downloads about 2.4 MB up front, 1.6 MB of it `world3d.json`, before anything appears. On a mid-range phone, slow loading and low frame rates are where most players will give up.

**What to do**
- Measure first: load time and frame rate on a mid-range Android phone and an older iPhone, so there's a baseline.
- Split `world3d.json` into map tiles and load the tiles around the player first, the rest in the background.
- Show something playable early (a "nearly there" screen with the area around the starting point) instead of waiting for everything.
- Add a quality setting (auto, low, high) for draw distance, shadows, pixel ratio and crowd density. Auto-detect phones and pick a sensible default.
- Make it installable as a PWA (manifest and service worker) so repeat visits load from cache and it can sit on a home screen.

**Done when:** a mid-range phone is playable within 5 seconds on 4G and holds a steady 30 fps.

---

## Suggested order

| When | Work |
|---|---|
| Next | 0. Split the code |
| Then | 2. Sound and 3. Driving feel (either order, both quick wins) |
| After | 5. Phones and loading |
| After | 4. Living neighbourhood |
| Later | Real players, online crew everywhere, story missions (parked) |

## How the scheduled play-test rounds fit in

The 6-hourly rounds stay small: bugs, polish and the art backlog. Once a phase is finished, they should include it in their checks. For example, after phase 2 they flag missing or wrong sounds, and after phase 5 they flag frame-rate drops. They don't start roadmap phases on their own.

---

# Parked for later

## 1. Real players (parked)

**Why:** The automated tester finds bugs and ugly spots, but it can't tell if the game is fun.

**What to do**
- Send the GitHub Pages link to about five friends, ideally some who know Bermondsey.
- Watch one or two play without helping. Note where they get lost, bored, confused or delighted.
- Add a small "Send feedback" link in the pause menu that opens a GitHub issue form or an email. No new backend needed.
- Feed findings into this file and the play-test log's "Still open" list.

**Done when:** the finished phases above have each been seen by at least two real players.

---

## 6. Online crew everywhere (L, parked, needs a decision)

**Why:** The crew link-up (up to 8 players, gifts, seeing each other) only works in the claude.ai version, because it uses claude.ai's built-in storage and rooms. Players on GitHub Pages miss it.

**Decision for Greg:** which backend to use outside claude.ai. Options:
- **Firebase (free tier):** closest to how the current code works (collections and live updates). Needs a Google account and a public config. It's not a secret, but it does need security rules.
- **Supabase (free tier):** similar, with Postgres and realtime channels.
- **PartyKit / Cloudflare Durable Objects:** best for live "see each other move", with more setup.

**What to do**
- Put the link-up behind a small interface in `crew.js` with two implementations: claude.ai (current) and the chosen backend. Pick one automatically based on where the game is running.
- Start with what already exists (joining a crew, members, gifts), then add live positions so you see other players' Sams walk around.
- Add a few small wholesome extras: leave a note at a landmark for crew-mates, a shared fund for the coffee cart, and a wave emote.
- Keep it safe and kind: no free-text chat with strangers (only preset messages), crews by code only, and easy leave or block.

**Done when:** two players, one on GitHub Pages and one on claude.ai, can join the same crew and see each other.

---

# Ongoing (from Greg, 26 Nov 2026)
Keep improving design, accuracy to the local area, building design, physics and the engine, round by round (the scheduled play-test rounds cover this). Done recently: car radio (Radio Browser, js/radio.js), parachute jumps from the helicopter and rooftops (js/chute.js), jumping over low garden fences, and the fix for the player's avatar staying on the ground when getting into a vehicle (three.js only hides an object when `visible === false`, so always set it with a real boolean).


## LiDAR building heights (27 Nov 2026)
Building heights in `world3d.json` now come from Environment Agency open LiDAR (1 m composite first-return DSM minus DTM, via the Defra WCS) for 3,516 of 4,309 buildings: the 85th-percentile height inside each eroded footprint, capped at median+4 m so tree overhang and rooftop plant do not inflate it. Kept the old OSM height where LiDAR reads under 2.2 m, is wildly different (ratio outside 0.45-2.2), the footprint is under 15 m2, or it is a landmark or the viaduct. Scripts and method in `tools/lidar/` (fetch.py, heights.py, apply.py). Result: 2,283 buildings changed by 0.3 m or more, mean absolute change 1.5 m. Original file kept in git history.

## LiDAR alignment and roof shapes (27 Nov 2026)
- Footprint-vs-LiDAR overlap showed the game map drifts from the BNG grid: north-south shift runs from about -8 m (south edge) to +3 m (north edge), east-west is a steady +1 m. The pipeline now applies `row' = row + 0.0055*row - 9.4`, `E + 1` (see tools/lidar/heights.py, roofs.py). Overlap 0.330 -> 0.381, peaking at zero shift. Heights re-run: 4,166 buildings now take a LiDAR height (was 3,516), LiDAR vs OSM r = 0.92.
- Roof shapes: world3d.json building tuples gain element 11 (`rf`): -1 = flat in LiDAR (2,016), >0 = measured ridge rise in m (478 pitched), 0 = not measured (old guess). r3d.js uses it for hip roofs. Conservative on purpose; ambiguous roofs keep the old rule.
- Measured, not seen: how it looks street by street on a phone.

## Street View spot checks (27 Nov 2026)
Reference-only visits (West Lane / Bermondsey Wall East, Webb Street, Old Kent Road). Done: dark cast-iron wall-tie plates in rows on warehouse walls (`TIES` in r3d.js). Noted, not yet done: Thames Path fingerposts, white-on-black street name plates on poles, double yellow lines at kerbs, tactile paving at crossings, steep-gabled modern infill housing (Webb St).

## Thorburn Square (27 Nov 2026)
OSM had the whole estate as one solid 8,800 m2 "apartments" slab, so the courtyard and St Anne's Church were buried under a flat roof and unreachable. Now: four blocks (13 m deep, LiDAR height about 10.4 m) around an open green courtyard with 16 trees, church and hall as before, and a gateway through the north block. `grid.png` opened inside (653 cells grass, 13 cells gate). Gate position is a guess; the aerial view did not show where the real entrances are. Pre-edit copies were /tmp only; git history has the originals.

## Memory, round two (27 Nov 2026)
Phone reported memory trouble again. Headless JS heap was unchanged (about 102 MB) but that metric excludes typed arrays. Measured 7.6M vertices, about 250 MB of vertex data held twice (CPU and GPU). Today's LiDAR roofs and detail added about 3% (+208k vertices). Fix: release CPU copies after upload plus a one-off warm-up frame. Not fixed: peak during build (arrays all exist before first upload). Next ideas if it still fails: Int8 normals, Float16 uv, merge or reduce per-window geometry, lower draw detail on phones.

## Oversized-building scan, street details (27 Nov 2026)
- LiDAR scan for large footprints with bare ground inside found one real error besides Thorburn: a paved yard beside the St James's Road football pitch (building 2672) drawn as a 3.8 m block. Shrunk to a sub-pixel stub (indices are used by `WD.fronts` and `RIDX`, so never delete entries) and grid cells opened. The rest checked against satellite were real: Dock Shed (new Canada Water Leisure Centre), the Clements Road site, View Studios, the L-shaped block off Hawkstone Road, the Spa Road courtyard block. The LiDAR predates new builds, so "bare ground" there is not an error. The grid has no ghost walls (tile 2 with no building).
- Street-name plates: white plate on a black post at the end of each named street (about 1,350). Pooled: 14 live meshes relabelled as you move (`platesUpdate`), so no texture per street.
- Double yellow lines for the first ~10 m at each end of residential and unclassified streets (about +270k vertices, +8 MB).
- 2026-11-27: red blister tactile paving at both kerbs of every zebra crossing; small white fingerposts at the ends of the Thames Path and Shad Thames pedestrian ways (only 3 Thames Path ways exist in the data, at the map's north edge). Still on the Street View list: steep-gabled modern infill. Idea: real terrain heights from the EA LiDAR DTM (needs a shared ground-height function; start visual-only).

## Visual terrain (2026-11-27)
Ground heights from the EA LiDAR bare-earth model (tools/lidar/terrain.py -> `terrain` key in world3d.json: 8 m cells, median + 40 m blur, about 0.15 to 5 m above the river, most land 0.3 to 3 m). A global vertex-shader patch (`THREE.Material.prototype.onBeforeCompile` in r3d.js) lifts every mesh by `TH(x,z)`, including cars, people and shadows; the ground is now a tessellated grid; the camera and sun are lifted by `TH`. Physics stays flat. The Thames material is flagged `userData.noTerrain` so the river stays level; docks and ponds follow the local ground. Append `?flat` to the URL to switch it off. Known limits: normals are not changed (no slope shading), decals on big flat polygons could clip where the terrain bends, points/rain are not lifted, glass skyline materials are not lifted. Next steps if wanted: real physics heights (a shared ground-height function in core.js), slope-aware car tilt, a stronger bank/quay profile along the Thames.
- Parked 2026-11-27 (Greg): real terrain physics. Cheap middle option if revisited: put cars, people and camera at true ground height (y only, no tilt) via a shared ground-height function; full slope physics only if the terrain is strengthened (e.g. deeper Thames bank).
- 2026-11-27: radio now plays on foot as headphones (quieter than car speakers); T skips stations anywhere.

## Ground decals on terrain (2026-11-28)
The terrain shader only lifts vertices, so big flat triangles (park grass, ponds, paths, long road pieces) sank under the tessellated ground: the Southwark Park lake and its paths were invisible. `drape()` in r3d.js now splits any ground triangle that strays from the terrain by more than its layer tolerance (about +150k vertices, +1.8%). Footpaths moved up from y .03 to .044 so grass cannot poke through. New flat ground geometry should go through the `flatm` buckets. Still open: small ground slabs in `landmarks()` across the river and docks at the north edge may still clip.
