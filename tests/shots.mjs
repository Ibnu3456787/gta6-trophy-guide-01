// VICE ATLAS screenshot shooter (Playwright). Run: node tests/shots.mjs
// Re-takes screenshots/1-4.jpg from the running app with a seeded save
// (13 earned, PMA counter 7/18, Shootist counter 12/42 + note) and rewrites
// shots.json with the real viewport of each shot. Each shot's viewport height
// is measured from the element its note claims must be visible, so the note
// can only describe what is actually on screen. Long side stays <= 1280 and
// each file stays <= 256 KiB (quality steps down until it fits).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  ({ chromium } = await import('/home/hatch/workspace/makefun/gta6-01-work/node_modules/playwright/index.mjs'));
}

const R = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = 8124;
const BASE = `http://localhost:${PORT}`;
const MAX_BYTES = 262144;
const MAX_SIDE = 1280;

// The seeded save: the same 13 earned trophies the original shots showed
// (195 trophy points, missable badge 2), so headers match shot to shot.
const SEED = {
  version: 1,
  earned: [2, 3, 4, 8, 16, 19, 20, 21, 33, 34, 35, 36, 37],
  counters: { 28: 7, 17: 12 },
  notes: { 17: '12 golds banked at Griffin — Rodgers courses next.' },
  spoiler: true,
};

const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: R, stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 1200));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript((seed) => {
  localStorage.setItem('vice-atlas-v1', JSON.stringify(seed));
}, SEED);
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`));

// Height the viewport needs for `selector`'s bottom edge to be on screen.
async function heightFor(selector, padding = 24) {
  const box = await page.locator(selector).last().boundingBox();
  if (!box) throw new Error(`no element for ${selector}`);
  return Math.ceil(box.y + box.height + padding);
}

async function shoot(file, height) {
  const h = Math.min(height, MAX_SIDE);
  await page.setViewportSize({ width: 1280, height: h });
  await page.waitForTimeout(300);
  const out = path.join(R, 'screenshots', file);
  for (const quality of [82, 75, 68, 60, 52]) {
    await page.screenshot({ path: out, type: 'jpeg', quality });
    const bytes = fs.statSync(out).size;
    console.log(`${file}: ${1280}x${h} q${quality} = ${bytes} bytes${bytes <= MAX_BYTES ? '' : ' (over cap, retrying)'}`);
    if (bytes <= MAX_BYTES) return { file, width: 1280, height: h, bytes, quality };
  }
  throw new Error(`${file} still over ${MAX_BYTES} bytes at q52`);
}

const shots = [];

// 1 — Cover: tracker, PMA guide open; counter box must be visible so the
// guide, its sources and its target counter are all on screen.
await page.goto(`${BASE}/#/tracker`, { waitUntil: 'networkidle' });
await page.waitForSelector('.trophy-row');
await page.waitForSelector('.detail .counter-box');
const h1 = await heightFor('.detail .counter-bar');
const sourcesBottom = await heightFor('.detail .sources', 8);
console.log(`shot 1: counter box needs h=${h1}, sources bottom h=${sourcesBottom}`);
shots.push({
  ...(await shoot('1-tracker.jpg', h1)),
  path: '/#/tracker',
  note: 'Cover: tracker with Spoiler Guard ON, 13 of 55 earned, filters and search visible, Positive Mental Attitude guide open in the detail pane with its missable flag, target counter (7/18) and cited sources.',
});

// 2 — The Shootist guide open: counter, progress bar, 100% note, sources, notes.
await page.locator('[data-trophy-id="17"]').click();
await page.waitForTimeout(400);
// Clicking the row scrolls the list; come back to the top so the header and
// filter deck frame the shot like the cover's.
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
const h2 = await heightFor('.detail-actions', 20);
console.log(`shot 2: detail actions need h=${h2}`);
shots.push({
  ...(await shoot('2-guide.jpg', h2)),
  path: '/#/tracker',
  note: 'The Shootist guide open: full cited guide, 42-challenge target counter (12/42) with progress bar, 100% note (all 42 gold medals), sources list and notes box.',
});

// 3 — Roadmap: the whole fifth phase card must be visible.
await page.goto(`${BASE}/#/roadmap`, { waitUntil: 'networkidle' });
await page.waitForSelector('.phase');
const h3 = await heightFor('.phase', 12);
console.log(`shot 3: last phase card needs h=${h3}`);
if (h3 > MAX_SIDE) console.log('WARNING: roadmap needs more than 1280px — shot will cut the last phase');
shots.push({
  ...(await shoot('3-roadmap.jpg', h3)),
  path: '/#/roadmap',
  note: 'Roadmap to Platinum: all five RoadmapEngine phases with progress bars, per-phase advice and trophy chips (story trophies hidden behind Spoiler Guard placeholders), missable trophy flagged.',
});

// 4 — Missables: the unconfirmed list at the bottom must be visible.
await page.goto(`${BASE}/#/missables`, { waitUntil: 'networkidle' });
await page.waitForSelector('.warn-card');
const h4 = await heightFor('.info-card', 28);
console.log(`shot 4: last card needs h=${h4}`);
if (h4 > MAX_SIDE) console.log('WARNING: missables needs more than 1280px — shot will cut the unconfirmed list');
shots.push({
  ...(await shoot('4-missables.jpg', h4)),
  path: '/#/missables',
  note: 'Missables & Save Discipline: MissableWatch on the one missable trophy (with reasoning), the time-sensitive strand, save discipline, cheats, and the three unconfirmed trophies.',
});

const shotsJson = shots.map((s) => ({
  file: s.file,
  note: s.note,
  path: s.path,
  viewport: { width: s.width, height: s.height },
}));
fs.writeFileSync(path.join(R, 'shots.json'), JSON.stringify(shotsJson));
console.log(`\nconsole errors during shoot: ${consoleErrors.length} ${JSON.stringify(consoleErrors)}`);
console.log('shots.json rewritten');

await browser.close();
server.kill();
