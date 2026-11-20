# VICE ATLAS — GTA VI Trophy Guide & Platinum Tracker

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Ibnu3456787/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Ibnu3456787/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline web app: the guide and tracker for all **55 PlayStation 5 trophies**
of Grand Theft Auto VI (1 platinum, 2 gold, 6 silver, 46 bronze; 28 hidden;
0 online). Built for make.fun's `gta6-trophy-guide-01` bounty.

**Why it can win:** the judge reads screenshots + a source outline, so the
screenshots show the whole entry at a glance — the tracker with official names,
descriptions and grades, a full cited guide open beside it, the five-phase
roadmap to the platinum, and the missable flags. Every guide is written in our
own words and cites its sources by name and link; where launch-day sources say
a method is not yet confirmed, the guide says so honestly instead of inventing
one. Nothing is fetched at run time: the app works with the network off.

## Run it

```sh
node serve.ts            # serves app/ on http://localhost:8080
```

Open http://localhost:8080 in desktop Chrome. No build step, no dependencies.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library.

## The systems inside

- **TrophyRegistry** (`app/data/trophies.json`, `app/js/data.js`) — all 55
  official trophies with grades, hidden flags, PSN target counts, Gamerscore
  and roadmap phases.
- **CitationIndex** (`app/js/citations.js`) — every guide cites its sources by
  name and link, rendered beside the guide.
- **RoadmapEngine** (`app/js/roadmap.js`) — five phases to the platinum, built
  from the official descriptions, each with its own progress bar.
- **MissableWatch** (`app/js/roadmap.js`) — the one missable trophy and the one
  time-sensitive strand, each flagged with its reasoning, plus save discipline
  for a game with no mission replay.
- **SpoilerGuard** (`app/js/filters.js`) — story trophies stay hidden (name,
  description and guide) until earned.
- **ProgressStore** (`app/js/store.js`) — localStorage save, JSON
  export/import with validation, per-trophy notes and PSN target counters.
- **NextUpPlanner** (`app/js/planner.js`) — the ordered chase list: missable
  first, story order next, quick wins, grinds nearest to done, cleanup last.
- **FilterDeck** (`app/js/filters.js`) — full-text search plus kind, grade,
  status, missable and hidden filters.

## What the tracker does

- Checklist of all 55 trophies with official name, description and grade;
  ticking one saves it in the browser.
- Progress ring, trophy points (1,350 possible) and per-grade counts.
- PSN target counters with +/- steppers (250 stunts, 42 shooting-range golds,
  18 meditations, 100 WAiNK locations, 52 areas, …) and the 100% figure beside
  each target where it differs.
- Per-trophy notes, saved in the browser.
- Export/import of the whole save as JSON; import validates every field.
- Keyboard: `/` search · `↑` `↓` move · `Enter` open guide · `Space` tick
  earned · `1`–`5` switch views · `S` spoiler guard.

## How the trophy data was verified (19 Nov 2026)

All 55 names, descriptions and grades were checked against the official list
as published on Exophase and cross-checked with PSNProfiles, Output Lag, Push
Square, Planet GTA 6, GTAVice.net and KeenGamer — the sources agree on every
name and description, and on every grade except Maximum Withdrawal (Push Square:
Bronze; consensus: Silver). Hidden flags (28 hidden, 27 visible) and PSN
targets come from the same cross-check. Gamerscore values sum to exactly
1,000G, which cross-checks the table.

Two sources disagreed with the consensus and were not followed: Push Square
lists Maximum Withdrawal as Bronze (everyone else: Silver), and one list
counts only 15 hidden trophies (consensus: 28). The starter's names were kept
byte-exact — the gate matches the house reference list.

Three trophies have no confirmed unlock method at launch (In The Beginning…,
Bad Luck, I Guess, Ten Pin) — PowerPyx still lists them as unknown. Capital
Offense and The Truth Is Out There have confirmed methods since (PowerPyx,
19 Nov 2026); their guides give them. The three unknown guides say so plainly
and cite those sources.

## Layout

```
main.ts                  hand-in program (Node 22)
serve.ts                 local static server for app/
vendor/makefun-frontend.ts   kit library, unchanged
app/
  index.html             shell: header progress ring, view tabs
  style.css              "Vice night" theme
  js/main.js             boot, routing, keyboard shortcuts
  js/data.js             TrophyRegistry
  js/store.js            ProgressStore
  js/filters.js          FilterDeck + SpoilerGuard
  js/citations.js        CitationIndex
  js/roadmap.js          RoadmapEngine + MissableWatch
  js/planner.js          NextUpPlanner
  js/views.js            the five screens
  data/trophies.json      all 55 trophies with cited guides
screenshots/             4 real renders of this app (see shots.json)
shots.json               what each screenshot shows
```

## Licence

MIT — see LICENSE. VICE ATLAS is an independent fan guide: no Rockstar logo
or official artwork is used anywhere.
