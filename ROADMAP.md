# GTA Bermondsey — Roadmap

The big pieces of work beyond small tweaks, in the order to do them. The scheduled play-test rounds keep handling bugs and polish. This file is for the larger work that needs dedicated sessions.

**Parked for now:** story missions. They come back once the work below is in place.

Sizes: **S** = one session, **M** = two or three, **L** = a week or more of sessions.

---

## 0. Foundations: split the code (M)

**Why:** All the game logic is in one 124 KB `index.html`, with about 160 functions in a single script. Each later phase (audio, driving, routines, streaming) needs a clean place to live. Without that, every change risks breaking something else.

**What to do**
- Move the script out of `index.html` into ES modules: `audio.js`, `vehicles.js`, `peds.js`, `world.js` (time and weather), `crew.js` (link-up), `save.js`, `ui.js`, and `main.js` to wire them together.
- Keep the behaviour exactly the same. This is a move, not a redesign.
- Keep the debug hooks the tester relies on (`step`, `ctxAct`, `DBGCAM`, `DBGH`, `DBGFOV`, `R3DBG`, `ready`, `startGame`) on `window`.
- Make sure the game still runs both from GitHub Pages and as the claude.ai artifact (same files, no build step).

**Done when:** the tester and the core-play checks pass unchanged, and no single file is over about 40 KB apart from the data files and `r3d.js`.

**Scheduled rounds:** update their file list and rules to the new layout once this lands.

---

## 1. Real players (ongoing, start now)

**Why:** The automated tester finds bugs and ugly spots, but it can't tell if the game is fun.

**What to do**
- Send the GitHub Pages link to about five friends, ideally some who know Bermondsey.
- Watch one or two play without helping. Note where they get lost, bored, confused or delighted.
- Add a small "Send feedback" link in the pause menu that opens a GitHub issue form or an email. No new backend needed.
- Feed findings into this file and the play-test log's "Still open" list.

**Done when:** each phase below has been seen by at least two real players before it's called finished.

---

## 2. Sound (M)

**Why:** Sound does more than graphics to make a low-poly world feel alive. Right now the game has synthesised jazz and two sound effects (a horn and a bump crunch), and nothing else.

**What to do**
- **Player:** footsteps that change with the surface (pavement, grass, cobbles at Maltby Street, wooden decking), jump and land, and a door sound for shops.
- **Vehicles:** engine pitch that follows speed for each type (hatchback, van, e-bike hum, helicopter rotor), indicators, gentle braking, and EVs that are nearly silent.
- **Ambient zones:** trains over the railway arches (timed to the trains you can see), market chatter at Maltby Street and the Blue Market, birds and ducks at the Southwark Park lake, river and gulls near the Thames, pub murmur in the evening, rain on roofs.
- **Mix:** a simple mixer (music, effects and ambience volume) in the pause menu, ducking the music during conversations, and distance falloff.
- Keep everything procedural (Web Audio) or in small self-hosted files in the repo. No new external hosts.

**Done when:** a blind listen tells you whether you're in the park, at the market, by the arches or driving.

---

## 3. Driving and camera feel (S–M)

**Why:** In a GTA III-style game, how the car handles and how the camera follows it make up a lot of the experience.

**What to do**
- One focused tuning session: acceleration curve, top speed per vehicle, grip and gentle drift, braking distance, and handbrake turns.
- Chase camera: lag and spring, looking ahead into turns, a wider field of view at speed, and auto-centring after you stop using the look stick.
- Make each vehicle feel different (hatchback, van, bus, e-bike, e-scooter, helicopter).
- Small touches: a body roll hint, wheel turn, light camera shake on kerbs.
- Expose the tuning numbers in one config object so they're easy to adjust later.

**Done when:** a lap of Jamaica Road → Tower Bridge Road → Southwark Park Road feels good on both keyboard and phone sticks, and playtesters say so.

---

## 4. A neighbourhood that lives (M–L)

**Why:** Locals will recognise the rhythm of the place, and it suits the wholesome tone better than chaos. Time of day already follows the real clock. Rain is currently faked (every third day of the month).

**What to do**
- **Opening hours:** cafés, shops and pubs open and close, with lights on and off, shutters, and staff arriving.
- **Market days:** Maltby Street and the Blue Market are busy on their real trading days and quiet otherwise.
- **Daily routines:** a few named locals with simple schedules (the postie's round, the school run, dog walkers in the park at dawn and dusk, the evening pub crowd) whom players start to recognise.
- **Traffic and crowds that follow the clock:** rush hours, quiet nights, and busier weekends around the markets.
- **Better weather:** replace the "every third day" rule with a proper weather cycle (dry, overcast, drizzle, downpour, fog by the river) that changes during a play session. Optional: real London weather. That would need a new external host (for example Open-Meteo, which needs no key), so it's Greg's call.
- **Seasons:** Christmas lights in December and similar touches.

**Done when:** playing at 8am on a Saturday feels noticeably different from 10pm on a Tuesday.

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

## 6. Online crew everywhere (L, needs a decision)

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

## Suggested order

| When | Work |
|---|---|
| Now | 1. Real players (keep going throughout) |
| Next | 0. Split the code |
| Then | 2. Sound and 3. Driving feel (either order, both quick wins) |
| After | 5. Phones and loading |
| After | 4. Living neighbourhood |
| When decided | 6. Online crew everywhere |
| Later | Story missions (parked) |

## How the scheduled play-test rounds fit in

The 6-hourly rounds stay small: bugs, polish and the art backlog. Once a phase is finished, they should include it in their checks. For example, after phase 2 they flag missing or wrong sounds, and after phase 5 they flag frame-rate drops. They don't start roadmap phases on their own.
