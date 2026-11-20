// VICE ATLAS tracker suite (Playwright). Run: node tests/smoke.mjs
// Serves app/ on :8123 and checks the tracker, SpoilerGuard (all three views),
// counters (steps + direct entry), export/import validation, keyboard shortcuts
// and the unconfirmed-trophy count. Exits non-zero if any check fails.
//
// Playwright resolves from a repo-local install first, then falls back to the
// shared copy under ~/workspace/makefun/gta6-01-work/node_modules.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  ({ chromium } = await import('/home/hatch/workspace/makefun/gta6-01-work/node_modules/playwright/index.mjs'));
}

const R = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = 8123;
const BASE = `http://localhost:${PORT}`;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: R, stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 1200));

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vice-atlas-smoke-'));
const tmpFile = path.join(tmpDir, 'import-test.json');

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ` | ${detail}` : ''}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const consoleErrors = [];
const requests = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`));
page.on('request', (r) => requests.push(r.url()));

await page.goto(`${BASE}/#/tracker`, { waitUntil: 'networkidle' });
await page.waitForSelector('.trophy-row', { timeout: 10000 });
const rows = await page.locator('.trophy-row').count();
check('tracker renders 55 rows', rows === 55, `rows=${rows}`);
check('no console errors on load', consoleErrors.length === 0, JSON.stringify(consoleErrors));
const external = requests.filter((u) => !u.startsWith(BASE));
check('zero external requests', external.length === 0, JSON.stringify(external));

const earnedText = await page.locator('#earnedCount').textContent();
check('fresh load 0 earned', earnedText.trim() === '0', earnedText);

// SpoilerGuard default ON: story rows hidden, placeholder readable (no blur).
const spoilerOn = await page.locator('#spoilerToggle').isChecked();
check('spoiler guard default ON', spoilerOn === true);
const hiddenNames = await page.locator('.spoilered .t-name').count();
check('12 story rows spoilered', hiddenNames === 12, `spoilered=${hiddenNames}`);
const firstSpoilerName = await page.locator('.spoilered .t-name').first().textContent();
check('spoiler placeholder text present', firstSpoilerName.includes('Hidden story trophy'), firstSpoilerName);
const filter = await page.locator('.spoilered .t-name').first().evaluate((e) => getComputedStyle(e).filter);
check('spoiler placeholder NOT blurred (readable)', filter === 'none', `filter=${filter}`);

// Search for a hidden story name must not reveal it.
await page.fill('#searchInput', 'Paradise Lost');
await page.waitForTimeout(300);
const searchRows = await page.locator('.trophy-row').count();
const searchName = searchRows ? await page.locator('.trophy-row .t-name').first().textContent() : '';
check('search finds story trophy but keeps name hidden', searchRows === 1 && searchName.includes('Hidden story trophy'), `rows=${searchRows} name=${searchName}`);
await page.fill('#searchInput', '');
await page.waitForTimeout(300);

// Tick PMA (id 28) via checkbox, reload, check persistence.
await page.locator('[data-trophy-id="28"] input[type="checkbox"]').check();
await page.waitForTimeout(300);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.trophy-row');
check('PMA checkbox still checked after reload', await page.locator('[data-trophy-id="28"] input[type="checkbox"]').isChecked());

// Counter: open Shootist (id 17), +1 three times, +10 once, type 25, reload.
await page.locator('[data-trophy-id="17"]').click();
await page.waitForTimeout(300);
const plus1 = page.getByLabel('Increase by 1', { exact: true });
await plus1.click(); await plus1.click(); await plus1.click();
await page.waitForTimeout(300);
check('counter +1 x3 gives 3', (await page.locator('.counter-input').inputValue()) === '3', await page.locator('.counter-input').inputValue());
await page.getByLabel('Increase by 10', { exact: true }).click();
await page.waitForTimeout(300);
check('counter +10 step gives 13', (await page.locator('.counter-input').inputValue()) === '13', await page.locator('.counter-input').inputValue());
await page.locator('.counter-input').fill('25');
await page.locator('.counter-input').blur();
await page.waitForTimeout(300);
check('counter numeric input sets 25', (await page.locator('.counter-input').inputValue()) === '25', await page.locator('.counter-input').inputValue());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.trophy-row');
await page.locator('[data-trophy-id="17"]').click();
await page.waitForTimeout(300);
check('counter persists across reload', (await page.locator('.counter-input').inputValue()) === '25', await page.locator('.counter-input').inputValue());

// Money counter: Dime on the Dollar (id 52) gets $1,000/$10,000 steps + input.
await page.locator('[data-trophy-id="52"]').click();
await page.waitForTimeout(300);
check('Dime counter has +$10,000 step', (await page.getByLabel('Increase by $10,000', { exact: true }).count()) === 1);
await page.getByLabel('Increase by $10,000', { exact: true }).click();
await page.waitForTimeout(300);
check('Dime +$10,000 gives 10000', (await page.locator('.counter-input').inputValue()) === '10000', await page.locator('.counter-input').inputValue());
await page.locator('.counter-input').fill('150000');
await page.locator('.counter-input').blur();
await page.waitForTimeout(300);
check('Dime numeric input sets 150000', (await page.locator('.counter-input').inputValue()) === '150000', await page.locator('.counter-input').inputValue());
const dimeTarget = await page.locator('.counter-target').textContent();
check('Dime target label shows $250,000', dimeTarget.includes('$250,000'), dimeTarget);

// Notes persist.
await page.locator('[data-trophy-id="17"]').click();
await page.waitForTimeout(300);
await page.fill('#notesBox', 'audit note test');
await page.locator('#notesBox').blur();
await page.waitForTimeout(300);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.trophy-row');
await page.locator('[data-trophy-id="17"]').click();
await page.waitForTimeout(300);
const noteVal = await page.locator('#notesBox').inputValue();
check('note persists across reload', noteVal === 'audit note test', noteVal);

// Spoiler toggle off reveals story names.
await page.locator('#spoilerToggle').uncheck();
await page.waitForTimeout(300);
const revealed = await page.locator('.trophy-row .t-name', { hasText: 'Paradise Lost' }).count();
check('spoiler OFF reveals story names', revealed === 1, `revealed=${revealed}`);
await page.locator('#spoilerToggle').check();
await page.waitForTimeout(300);

// Filters: kind chip Story -> 12 rows (all spoilered).
await page.locator('[data-kind="story"]').click();
await page.waitForTimeout(300);
const storyRows = await page.locator('.trophy-row').count();
check('kind filter Story shows 12', storyRows === 12, `rows=${storyRows}`);
await page.locator('[data-kind="all"]').click();
await page.waitForTimeout(200);
await page.getByText('Missable / time-sensitive', { exact: true }).click();
await page.waitForTimeout(300);
const missRows = await page.locator('.trophy-row').count();
check('missable filter shows 2 (PMA + S&F)', missRows === 2, `rows=${missRows}`);
await page.getByText('Missable / time-sensitive', { exact: true }).click();
await page.waitForTimeout(200);
await page.locator('.filter-select').first().selectOption('silver');
await page.waitForTimeout(300);
const silverRows = await page.locator('.trophy-row').count();
check('grade filter Silver shows 6', silverRows === 6, `rows=${silverRows}`);
await page.locator('.filter-select').first().selectOption('all');
await page.locator('.filter-select').nth(1).selectOption('earned');
await page.waitForTimeout(300);
const earnedRows = await page.locator('.trophy-row').count();
check('status filter Earned shows 1', earnedRows === 1, `rows=${earnedRows}`);
await page.locator('.filter-select').nth(1).selectOption('all');
await page.waitForTimeout(200);

// SPOILER LEAK (M-2): Roadmap chips and Next Up rows must hide story names.
await page.goto(`${BASE}/#/roadmap`, { waitUntil: 'networkidle' });
await page.waitForSelector('.phase-chip');
const roadmapText = await page.textContent('main');
check('ROADMAP hides story names with guard ON',
  !roadmapText.includes('Paradise Lost') && !roadmapText.includes('Vice City, Baby!') && !roadmapText.includes('Snow Storm'),
  roadmapText.slice(0, 200));
const roadmapPlaceholders = await page.locator('.phase-chip.spoilered').count();
check('ROADMAP shows 12 placeholder chips', roadmapPlaceholders === 12, `placeholders=${roadmapPlaceholders}`);
check('ROADMAP phase 5 advice says Three trophies', roadmapText.includes('Three trophies have no confirmed unlock method'), roadmapText.slice(-300));
await page.goto(`${BASE}/#/next`, { waitUntil: 'networkidle' });
await page.waitForSelector('.next-row');
const nextText = await page.textContent('main');
check('NEXT UP hides story names with guard ON',
  !nextText.includes('Paradise Lost') && !nextText.includes('Vice City, Baby!') && !nextText.includes('Snow Storm'),
  nextText.slice(0, 300));
const nextPlaceholders = await page.locator('.next-row .t-name', { hasText: 'Hidden story trophy' }).count();
check('NEXT UP shows 12 placeholder rows', nextPlaceholders === 12, `placeholders=${nextPlaceholders}`);
const personalBest = page.locator('.next-row', { hasText: 'Personal Best' });
const pbWhy = await personalBest.locator('.next-why').textContent();
check('Personal Best is NOT a quick win', !pbWhy.includes('Quick win'), pbWhy);

// Missables view: PMA + 3 unconfirmed.
await page.goto(`${BASE}/#/missables`, { waitUntil: 'networkidle' });
await page.waitForSelector('.warn-card');
const missText = await page.textContent('main');
check('missables view shows PMA + 3 unconfirmed text', missText.includes('Positive Mental Attitude') && missText.includes('3 trophies'), missText.slice(0, 120));
const unconfirmedItems = await page.locator('.info-card').last().locator('li').count();
check('missables lists exactly 3 unconfirmed', unconfirmedItems === 3, `items=${unconfirmedItems}`);
check('missables no longer names GTABase', !missText.includes('GTABase'));

// Newly confirmed methods (M-1): Capital Offense + Truth guides are real guides.
await page.goto(`${BASE}/#/tracker`, { waitUntil: 'networkidle' });
await page.waitForSelector('.trophy-row');
await page.fill('#searchInput', 'Capital Offense');
await page.waitForTimeout(300);
await page.locator('[data-trophy-id="45"]').click();
await page.waitForTimeout(300);
const capitalGuide = await page.locator('.guide-text').textContent();
check('Capital Offense guide confirmed (Banshee)', capitalGuide.includes('Banshee') && !capitalGuide.includes('No confirmed unlock method'), capitalGuide.slice(0, 120));
await page.fill('#searchInput', 'The Truth Is Out There');
await page.waitForTimeout(300);
await page.locator('[data-trophy-id="50"]').click();
await page.waitForTimeout(300);
const truthGuide = await page.locator('.guide-text').textContent();
check('Truth guide confirmed (UFO)', truthGuide.includes('UFO') && !truthGuide.includes('No confirmed unlock method'), truthGuide.slice(0, 120));
await page.fill('#searchInput', '');
await page.waitForTimeout(200);

// About view + export/import round-trip.
await page.goto(`${BASE}/#/about`, { waitUntil: 'networkidle' });
await page.waitForSelector('.save-row');
const exported = await page.evaluate(() => localStorage.getItem('vice-atlas-v1'));
check('localStorage save exists with earned PMA', exported && JSON.parse(exported).earned.includes(28), exported);
await page.evaluate(() => localStorage.removeItem('vice-atlas-v1'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.trophy-row').catch(() => {});
check('after clearing storage, earned resets to 0', (await page.locator('#earnedCount').textContent()).trim() === '0');
fs.writeFileSync(tmpFile, exported);
await page.goto(`${BASE}/#/about`, { waitUntil: 'networkidle' });
await page.setInputFiles('.file-input', tmpFile);
await page.waitForTimeout(500);
const importStatus = await page.locator('.save-row + p').textContent();
check('import reports success', importStatus.includes('Imported'), importStatus);
check('import restores earned count to 1', (await page.locator('#earnedCount').textContent()).trim() === '1');
const saveCardText = await page.locator('.about-grid .info-card').first().locator('p').first().textContent();
check('About save card re-rendered after import', saveCardText.includes('1 of 55 earned'), saveCardText);
fs.writeFileSync(tmpFile, '{not json');
await page.setInputFiles('.file-input', tmpFile);
await page.waitForTimeout(500);
const importStatus2 = await page.locator('.save-row + p').textContent();
check('invalid JSON import rejected', importStatus2.includes('Import failed'), importStatus2);
check('earned still 1 after failed import', (await page.locator('#earnedCount').textContent()).trim() === '1');
fs.writeFileSync(tmpFile, '{}');
await page.setInputFiles('.file-input', tmpFile);
await page.waitForTimeout(500);
const importStatus3 = await page.locator('.save-row + p').textContent();
check('empty-object import rejected (no silent wipe)', importStatus3.includes('Import failed'), importStatus3);
check('earned still 1 after {} import', (await page.locator('#earnedCount').textContent()).trim() === '1');
fs.writeFileSync(tmpFile, '{"version":2,"earned":[]}');
await page.setInputFiles('.file-input', tmpFile);
await page.waitForTimeout(500);
const importStatus4 = await page.locator('.save-row + p').textContent();
check('wrong-version import rejected', importStatus4.includes('Import failed'), importStatus4);
check('earned still 1 after version-2 import', (await page.locator('#earnedCount').textContent()).trim() === '1');

// Keyboard: / focuses search, arrows move selection, Enter opens the guide.
await page.goto(`${BASE}/#/tracker`, { waitUntil: 'networkidle' });
await page.waitForSelector('.trophy-row');
await page.keyboard.press('/');
await page.waitForTimeout(200);
check('/ focuses search', await page.evaluate(() => document.activeElement && document.activeElement.id === 'searchInput'));
await page.locator('[data-trophy-id="1"]').click();
await page.waitForTimeout(200);
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(200);
const selectedAfterDown = await page.locator('.trophy-row.selected').getAttribute('data-trophy-id');
check('ArrowDown moves selection', selectedAfterDown !== null, `selected=${selectedAfterDown}`);
await page.locator('.result-count').click();
await page.waitForTimeout(200);
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
check('Enter focuses the guide pane', await page.evaluate(() => document.activeElement && document.activeElement.id === 'detailPane'));

// Whole-run hygiene: nothing after load errored or phoned home either.
check('no console errors across the whole run', consoleErrors.length === 0, JSON.stringify(consoleErrors));
const externalAll = requests.filter((u) => !u.startsWith(BASE));
check('zero external requests across the whole run', externalAll.length === 0, JSON.stringify(externalAll));

console.log('\n--- SUMMARY ---');
const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} passed; ${failed.length} failed`);
for (const f of failed) console.log(`FAILED: ${f.name}`);

await browser.close();
server.kill();
fs.rmSync(tmpDir, { recursive: true, force: true });
process.exit(failed.length ? 1 : 0);
