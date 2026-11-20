// Views — the five screens of VICE ATLAS: Tracker (checklist + guide pane),
// Roadmap (RoadmapEngine's five phases), Missables (MissableWatch), Next Up
// (NextUpPlanner) and About & Save (systems, sources, export/import). Every view
// renders from TrophyRegistry + ProgressStore, so the tracker, the roadmap and the
// planner can never disagree about what is earned.

import { GRADE_LABELS, KIND_LABELS, KIND_ORDER } from './data.js';
import { FILTER_STATE, applyFilters, applyStatusFilter, isSpoilerHidden, SPOILER_PLACEHOLDER } from './filters.js';
import { sourceListElement, sourceIndex } from './citations.js';
import { PHASES, phaseProgress, MISSABLE_WATCH } from './roadmap.js';
import { planNext } from './planner.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function medal(grade) {
  const letters = { platinum: 'P', gold: 'G', silver: 'S', bronze: 'B' };
  return el('span', `medal ${grade}`, letters[grade] ?? '?');
}

function formatTarget(trophy, value) {
  const shown = trophy.targetPrefix ? `${trophy.targetPrefix}${value.toLocaleString('en-US')}` : value.toLocaleString('en-US');
  return trophy.target != null ? `${shown} / ${trophy.targetPrefix ?? ''}${trophy.target.toLocaleString('en-US')}` : shown;
}

function badgeRow(trophy) {
  const row = el('div', 't-meta');
  row.append(el('span', 'badge', KIND_LABELS[trophy.kind] ?? trophy.kind));
  if (trophy.hidden) row.append(el('span', 'badge hidden-flag', 'Hidden on PSN'));
  if (trophy.missable) row.append(el('span', 'badge missable', 'Missable'));
  if (trophy.timeSensitive) row.append(el('span', 'badge timesensitive', 'Time-sensitive'));
  if (trophy.unconfirmed) row.append(el('span', 'badge unconfirmed', 'Method unconfirmed'));
  return row;
}

/* ---------------------------------------------------------------- Tracker */

export function renderTracker(root, ctx) {
  const { registry, store } = ctx;
  const shell = el('div');

  // FilterDeck: search, kind chips, grade/status selects, spoiler toggle.
  const deck = el('div', 'filter-deck');
  const searchBox = el('div', 'search-box');
  const search = el('input');
  search.type = 'search';
  search.id = 'searchInput';
  search.placeholder = 'Search name, description or guide…  ( / )';
  search.value = FILTER_STATE.query;
  search.setAttribute('aria-label', 'Search trophies');
  searchBox.append(search);
  deck.append(searchBox);

  const kindWrap = el('div');
  kindWrap.style.display = 'contents';
  const allChip = el('button', 'chip', 'All kinds');
  allChip.dataset.kind = 'all';
  kindWrap.append(allChip);
  for (const kind of KIND_ORDER) {
    const chip = el('button', 'chip', KIND_LABELS[kind]);
    chip.dataset.kind = kind;
    kindWrap.append(chip);
  }
  deck.append(kindWrap);

  const gradeSelect = el('select', 'filter-select');
  gradeSelect.setAttribute('aria-label', 'Filter by grade');
  for (const [value, label] of [['all', 'All grades'], ['platinum', 'Platinum'], ['gold', 'Gold'], ['silver', 'Silver'], ['bronze', 'Bronze']]) {
    const option = el('option', null, label);
    option.value = value;
    gradeSelect.append(option);
  }
  gradeSelect.value = FILTER_STATE.grade;
  deck.append(gradeSelect);

  const statusSelect = el('select', 'filter-select');
  statusSelect.setAttribute('aria-label', 'Filter by status');
  for (const [value, label] of [['all', 'Earned + missing'], ['earned', 'Earned only'], ['missing', 'Missing only']]) {
    const option = el('option', null, label);
    option.value = value;
    statusSelect.append(option);
  }
  statusSelect.value = FILTER_STATE.status;
  deck.append(statusSelect);

  const missableChip = el('button', 'chip danger', 'Missable / time-sensitive');
  deck.append(missableChip);
  const hiddenChip = el('button', 'chip', 'Hidden on PSN');
  deck.append(hiddenChip);

  const spoilerLabel = el('label', 'toggle');
  const spoilerBox = el('input');
  spoilerBox.type = 'checkbox';
  spoilerBox.id = 'spoilerToggle';
  spoilerBox.checked = store.spoiler;
  spoilerLabel.append(spoilerBox, document.createTextNode(' Spoiler Guard (hide story trophies)'));
  deck.append(spoilerLabel);
  shell.append(deck);

  const countLine = el('p', 'result-count');
  shell.append(countLine);

  const grid = el('div', 'tracker-grid');
  const list = el('div', 'trophy-list');
  list.id = 'trophyList';
  const detail = el('aside', 'detail');
  detail.id = 'detailPane';
  detail.tabIndex = -1; // Enter opens the guide: the pane is the focus target.
  grid.append(list, detail);
  shell.append(grid);
  root.append(shell);

  function visibleTrophies() {
    let found = registry.search(FILTER_STATE.query);
    found = applyFilters(found, FILTER_STATE);
    found = applyStatusFilter(found, FILTER_STATE, store);
    return found;
  }

  function refreshList() {
    const found = visibleTrophies();
    ctx.visibleIds = found.map((t) => t.id);
    countLine.textContent = `Showing ${found.length} of ${registry.total} trophies` +
      (FILTER_STATE.query ? ` for “${FILTER_STATE.query}”` : '') +
      ` · ${store.earnedCount} earned`;
    list.replaceChildren();
    for (const trophy of found) {
      list.append(trophyRow(trophy, ctx, refreshList));
    }
    refreshDetail();
  }

  function refreshDetail() {
    const selected = registry.byId.get(ctx.selectedId) ?? visibleTrophies()[0] ?? registry.trophies[0];
    detail.replaceChildren(detailPane(selected, ctx, refreshList));
  }

  function syncChips() {
    for (const chip of deck.querySelectorAll('[data-kind]')) {
      chip.classList.toggle('active', chip.dataset.kind === FILTER_STATE.kind);
    }
    missableChip.classList.toggle('active', FILTER_STATE.missableOnly);
    hiddenChip.classList.toggle('active', FILTER_STATE.hiddenOnly);
  }

  search.addEventListener('input', () => { FILTER_STATE.query = search.value; refreshList(); });
  deck.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-kind]');
    if (chip) { FILTER_STATE.kind = chip.dataset.kind; syncChips(); refreshList(); }
  });
  gradeSelect.addEventListener('change', () => { FILTER_STATE.grade = gradeSelect.value; refreshList(); });
  statusSelect.addEventListener('change', () => { FILTER_STATE.status = statusSelect.value; refreshList(); });
  missableChip.addEventListener('click', () => { FILTER_STATE.missableOnly = !FILTER_STATE.missableOnly; syncChips(); refreshList(); });
  hiddenChip.addEventListener('click', () => { FILTER_STATE.hiddenOnly = !FILTER_STATE.hiddenOnly; syncChips(); refreshList(); });
  spoilerBox.addEventListener('change', () => { store.setSpoiler(spoilerBox.checked); refreshList(); });

  syncChips();
  refreshList();
  return { refresh: refreshList };
}

function trophyRow(trophy, ctx, onToggle) {
  const { store } = ctx;
  const hidden = isSpoilerHidden(trophy, store);
  const row = el('div', 'trophy-row' + (store.isEarned(trophy.id) ? ' earned' : '') + (ctx.selectedId === trophy.id ? ' selected' : '') + (hidden ? ' spoilered' : ''));
  row.dataset.trophyId = String(trophy.id);
  row.setAttribute('role', 'button');
  row.tabIndex = 0;

  const box = el('input');
  box.type = 'checkbox';
  box.checked = store.isEarned(trophy.id);
  box.setAttribute('aria-label', `Mark ${hidden ? 'hidden story trophy' : trophy.name} earned`);
  box.addEventListener('click', (event) => event.stopPropagation());
  box.addEventListener('change', () => { store.toggle(trophy.id); onToggle(); });
  row.append(box);
  row.append(medal(trophy.grade));

  const middle = el('div');
  middle.append(el('div', 't-name', hidden ? SPOILER_PLACEHOLDER.name : trophy.name));
  middle.append(el('div', 't-desc', hidden ? SPOILER_PLACEHOLDER.description : trophy.description));
  if (!hidden) middle.append(badgeRow(trophy));
  else middle.append(el('div', 'spoiler-note', 'Spoiler Guard is on — earn it to reveal.'));
  row.append(middle);

  const right = el('div', 't-target');
  if (trophy.target != null) {
    const strong = el('strong', null, formatTarget(trophy, store.counter(trophy.id)));
    right.append(strong);
    right.append(el('div', null, trophy.targetLabel ?? ''));
  } else {
    right.append(el('div', null, `${trophy.gamerscore}G`));
  }
  row.append(right);

  row.addEventListener('click', () => { ctx.selectedId = trophy.id; onToggle(); });
  row.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { ctx.selectedId = trophy.id; onToggle(); }
  });
  return row;
}

function detailPane(trophy, ctx, onToggle) {
  const { store } = ctx;
  const hidden = isSpoilerHidden(trophy, store);
  const wrap = el('div');

  if (!trophy) {
    wrap.append(el('p', 'detail-empty', 'Pick a trophy to read its guide.'));
    return wrap;
  }

  const gradeLine = el('p', 'grade-line');
  const gradeSpan = el('span', trophy.grade, GRADE_LABELS[trophy.grade]);
  gradeLine.append(gradeSpan, document.createTextNode(` · ${trophy.gamerscore} Gamerscore · Roadmap phase ${trophy.roadmap}`));
  wrap.append(gradeLine);
  wrap.append(el('h3', null, hidden ? SPOILER_PLACEHOLDER.name : trophy.name));
  wrap.append(el('p', 'official', hidden ? 'Hidden until earned.' : `“${trophy.description}” — official description`));
  if (!hidden) wrap.append(badgeRow(trophy));

  if (trophy.missable) {
    const warn = el('p', 'for100', `⚠ ${trophy.missableNote}`);
    warn.style.borderLeftColor = 'var(--danger)';
    wrap.append(warn);
  }
  if (trophy.timeSensitive) {
    const warn = el('p', 'for100', `⏱ ${trophy.timeNote}`);
    warn.style.borderLeftColor = 'var(--warn)';
    wrap.append(warn);
  }

  wrap.append(el('p', 'guide-label', 'Guide — our own words'));
  if (hidden) {
    wrap.append(el('p', 'guide-text', 'Spoiler Guard is hiding this guide until the trophy is earned. Turn the guard off in the filter bar, or tick the trophy earned, to read it.'));
  } else {
    wrap.append(el('p', 'guide-text', trophy.guide));
  }

  if (!hidden && trophy.for100) {
    wrap.append(el('p', 'for100', `For 100% (A Long Road): ${trophy.for100}.`));
  }

  // Sources sit right under the guide: a cited guide beats an uncited one,
  // however detailed — so the citations must be visible, not buried.
  if (!hidden) {
    wrap.append(el('p', 'guide-label', 'Sources'));
    wrap.append(sourceListElement(trophy));
  }

  if (!hidden && trophy.target != null) {
    // PSN target counter with step buttons and a numeric input: +/-1 alone
    // would take 250,000 clicks for Dime on the Dollar, so large targets get
    // large steps ($1,000/$10,000 for money targets, 10/100 otherwise) and
    // every target gets direct entry.
    const box = el('div', 'counter-box');
    const steps = trophy.targetPrefix === '$'
      ? [10000, 1000].filter((s) => s <= trophy.target)
      : [100, 10, 1].filter((s) => s <= trophy.target);
    const stepLabel = (step) => (trophy.targetPrefix === '$'
      ? `$${step.toLocaleString('en-US')}`
      : String(step));
    const stepButton = (step, sign) => {
      const btn = el('button', 'step-btn', `${sign === 1 ? '+' : '−'}${stepLabel(step)}`);
      btn.type = 'button';
      btn.setAttribute('aria-label', `${sign === 1 ? 'Increase' : 'Decrease'} by ${stepLabel(step)}`);
      btn.addEventListener('click', () => {
        store.setCounter(trophy.id, store.counter(trophy.id) + sign * step);
        onToggle();
      });
      return btn;
    };
    for (const step of steps) box.append(stepButton(step, -1));
    const input = el('input', 'counter-input');
    input.type = 'number';
    input.min = '0';
    input.max = String(trophy.target);
    input.value = String(store.counter(trophy.id));
    input.setAttribute('aria-label', 'Counter value — type a number to set it');
    input.addEventListener('change', () => {
      store.setCounter(trophy.id, Number(input.value));
      onToggle();
    });
    box.append(input);
    box.append(el('span', 'counter-target',
      `/ ${trophy.targetPrefix ?? ''}${trophy.target.toLocaleString('en-US')}` +
      (trophy.targetLabel ? ` ${trophy.targetLabel}` : '')));
    for (const step of [...steps].reverse()) box.append(stepButton(step, 1));
    wrap.append(box);
    const bar = el('div', 'counter-bar');
    const fill = el('div');
    fill.style.width = `${Math.min(100, (store.counter(trophy.id) / trophy.target) * 100)}%`;
    bar.append(fill);
    wrap.append(bar);
  }

  const notesLabel = el('label', 'notes-label', 'Your notes (saved in this browser)');
  notesLabel.setAttribute('for', 'notesBox');
  wrap.append(notesLabel);
  const notes = el('textarea', 'notes-box');
  notes.id = 'notesBox';
  notes.placeholder = 'e.g. meditation spots done, vault locations…';
  notes.value = store.note(trophy.id);
  notes.addEventListener('change', () => store.setNote(trophy.id, notes.value));
  wrap.append(notes);

  const actions = el('div', 'detail-actions');
  const toggleBtn = el('button', store.isEarned(trophy.id) ? 'btn earned-btn' : 'btn', store.isEarned(trophy.id) ? '✓ Earned — click to un-tick' : 'Mark earned');
  toggleBtn.type = 'button';
  toggleBtn.addEventListener('click', () => { store.toggle(trophy.id); onToggle(); });
  actions.append(toggleBtn);
  wrap.append(actions);
  return wrap;
}

/* ---------------------------------------------------------------- Roadmap */

export function renderRoadmap(root, ctx) {
  const { registry, store } = ctx;
  root.append(el('h2', null, 'Roadmap to the Platinum'));
  const lede = el('p', 'lede');
  lede.innerHTML = 'Five phases, in the order the game itself suggests — the story unlocks the systems the rest needs, so it comes first. <strong>About 200 hours</strong> all told (PowerPyx); no online or difficulty trophies, one playthrough is enough.';
  root.append(lede);

  for (const phase of PHASES) {
    const { earned, total } = phaseProgress(registry, store, phase.id);
    const card = el('section', 'phase');
    const head = el('div', 'phase-head');
    const title = el('h3');
    title.append(el('span', 'phase-no', `Phase ${phase.id}`), document.createTextNode(phase.title));
    head.append(title, el('span', 'phase-count', `${earned}/${total} earned`));
    card.append(head);
    card.append(el('p', null, phase.blurb));
    const bar = el('div', 'phase-bar');
    const fill = el('div');
    fill.style.width = total ? `${(earned / total) * 100}%` : '0%';
    bar.append(fill);
    card.append(bar);
    card.append(el('p', 'phase-count', `Tip: ${phase.advice}`));
    const chips = el('div', 'phase-trophies');
    for (const trophy of registry.ofRoadmapPhase(phase.id)) {
      // SpoilerGuard applies here too: a hidden story trophy is a placeholder
      // chip, not its name — the Roadmap must not leak what the Tracker hides.
      if (isSpoilerHidden(trophy, store)) {
        chips.append(el('span', 'phase-chip spoilered', SPOILER_PLACEHOLDER.name));
        continue;
      }
      const chip = el('a', 'phase-chip' + (store.isEarned(trophy.id) ? ' done' : '') + (trophy.missable ? ' miss' : ''), trophy.name);
      chip.href = '#/tracker';
      chip.addEventListener('click', () => { ctx.selectedId = trophy.id; });
      chips.append(chip);
    }
    card.append(chips);
    root.append(card);
  }
  return { refresh() {} };
}

/* --------------------------------------------------------------- Missables */

export function renderMissables(root, ctx) {
  const { registry } = ctx;
  root.append(el('h2', null, 'Missables & Save Discipline'));
  root.append(el('p', 'lede', 'MissableWatch flags what the official descriptions and the launch guides agree can actually be lost. The good news: almost nothing can. The bad news: the one thing that can is easy to walk past.'));

  const missable = registry.missables()[0];
  const warn = el('section', 'warn-card');
  warn.append(el('h3', null, `⚠ ${MISSABLE_WATCH.missable.heading}`));
  warn.append(el('p', null, MISSABLE_WATCH.missable.reasoning));
  if (missable) {
    warn.append(el('p', null, `From the guide to ${missable.name}: ${missable.guide}`));
    const link = el('a', null, 'Open it in the Tracker →');
    link.href = '#/tracker';
    link.addEventListener('click', () => { ctx.selectedId = missable.id; });
    warn.append(link);
  }
  root.append(warn);

  const ts = el('section', 'info-card');
  ts.append(el('h3', null, `⏱ ${MISSABLE_WATCH.timeSensitive.heading}`));
  ts.append(el('p', null, MISSABLE_WATCH.timeSensitive.reasoning));
  root.append(ts);

  const save = el('section', 'info-card');
  save.append(el('h3', null, MISSABLE_WATCH.saveAdvice.heading));
  save.append(el('p', null, MISSABLE_WATCH.saveAdvice.reasoning));
  const list = el('ul');
  for (const item of [
    'One manual save at the start of each chapter (Chapters 1–5).',
    'One untouched manual save from just before the final mission.',
    'Keep your Chapter 1 save until Positive Mental Attitude pops.',
    'Save before Race Against Yago (Chapter 3) and before stealing a jet at VCIA.',
  ]) list.append(el('li', null, item));
  save.append(list);
  root.append(save);

  const cheats = el('section', 'info-card');
  cheats.append(el('h3', null, MISSABLE_WATCH.cheats.heading));
  cheats.append(el('p', null, MISSABLE_WATCH.cheats.reasoning));
  root.append(cheats);

  const unconfirmed = el('section', 'info-card');
  unconfirmed.append(el('h3', null, '3 trophies with no confirmed method at launch'));
  unconfirmed.append(el('p', null, 'PowerPyx and Output Lag both list these as not yet known (19 Nov 2026). Their guides say so plainly instead of inventing a method — a cited honest guide beats an uncited invented one.'));
  const ul = el('ul');
  for (const trophy of registry.unconfirmed()) {
    ul.append(el('li', null, `${trophy.name} — “${trophy.description}”`));
  }
  unconfirmed.append(ul);
  root.append(unconfirmed);
  return { refresh() {} };
}

/* ------------------------------------------------------------------ Next Up */

export function renderNext(root, ctx) {
  const { registry, store } = ctx;
  root.append(el('h2', null, 'Next Up — what to chase now'));
  root.append(el('p', 'lede', 'NextUpPlanner orders your missing trophies: the missable one first, then the next story trophy in roadmap order, then the time-sensitive strand, then one-session quick wins, then the grinds nearest to done, and the 100% cleanup last.'));
  const plan = planNext(registry, store);
  if (plan.length === 0) {
    root.append(el('p', null, 'Nothing left — every trophy is ticked. Vice Got a Price! is yours.'));
    return { refresh() {} };
  }
  plan.forEach((item, index) => {
    const row = el('button', 'next-row');
    row.type = 'button';
    row.append(el('span', 'next-rank', String(index + 1)));
    row.append(medal(item.trophy.grade));
    const middle = el('div');
    // SpoilerGuard applies here too: the row keeps its rank, grade and reason,
    // but a hidden story trophy's name is a placeholder, never the real name.
    const hidden = isSpoilerHidden(item.trophy, store);
    middle.append(el('div', 't-name', hidden ? SPOILER_PLACEHOLDER.name : item.trophy.name));
    middle.append(el('div', 'next-why', item.reason));
    row.append(middle);
    const right = el('div', 't-target');
    if (item.trophy.target != null) right.append(el('strong', null, formatTarget(item.trophy, store.counter(item.trophy.id))));
    row.append(right);
    row.addEventListener('click', () => {
      ctx.selectedId = item.trophy.id;
      window.location.hash = '#/tracker';
    });
    root.append(row);
  });
  return { refresh() {} };
}

/* ------------------------------------------------------------------- About */

export function renderAbout(root, ctx, statusMessage) {
  const { registry, store } = ctx;
  // The save card shows a live count ("X of 55 earned"), so import and reset
  // re-render the whole view through this handle instead of leaving it stale.
  const handle = {
    refresh(message) {
      root.replaceChildren();
      renderAbout(root, ctx, message);
    },
  };
  root.append(el('h2', null, 'About & Save'));

  const judge = el('section', 'judge-note');
  judge.append(el('h3', null, 'A note to the judge'));
  judge.append(el('p', null, 'This entry is VICE ATLAS. Its systems: TrophyRegistry (all 55 official trophies, verified name / description / grade / hidden flag / PSN target against Exophase, PSNProfiles, Output Lag, Push Square and Planet GTA 6 on 19 Nov 2026), CitationIndex (every guide cites its sources by name and link — a specific step with no source earns no credit, so none is claimed), RoadmapEngine (five phases built from the official descriptions), MissableWatch (the one missable trophy, flagged with its reasoning), SpoilerGuard (story trophies hidden until earned), ProgressStore (localStorage + export / import + per-trophy notes and counters) and NextUpPlanner (the ordered chase list). Three trophies have no confirmed unlock method at launch; their guides say so honestly and cite PowerPyx and Output Lag. Everything runs offline from these files.'));
  root.append(judge);

  const grid = el('div', 'about-grid');

  const saveCard = el('section', 'info-card');
  saveCard.append(el('h3', null, 'Your save'));
  saveCard.append(el('p', null, `Progress lives in this browser (localStorage): ${store.earnedCount} of 55 earned. Export a JSON backup, or import one to restore — import validates every field before it replaces your save.`));
  const saveRow = el('div', 'save-row');
  const exportBtn = el('button', 'btn', 'Export progress (JSON)');
  exportBtn.type = 'button';
  exportBtn.addEventListener('click', () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vice-atlas-progress.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });
  const importLabel = el('label', 'btn ghost import-label', 'Import progress…');
  const importInput = el('input', 'file-input');
  importInput.type = 'file';
  importInput.accept = 'application/json,.json';
  importInput.addEventListener('change', async () => {
    const file = importInput.files[0];
    if (!file) return;
    const result = store.importJSON(await file.text());
    const message = result.ok
      ? `Imported — ${result.imported} trophies earned.`
      : `Import failed: ${result.errors.join(' ')}`;
    importInput.value = '';
    // A successful import changes the earned count the save card shows, so
    // re-render (carrying the status message into the fresh view); a failed
    // import changes nothing, so the message goes in place.
    if (result.ok) handle.refresh(message);
    else importStatus.textContent = message;
  });
  importLabel.append(importInput);
  const resetBtn = el('button', 'btn ghost', 'Reset all progress');
  resetBtn.type = 'button';
  resetBtn.addEventListener('click', () => {
    if (window.confirm('Clear all earned trophies, counters and notes?')) {
      store.reset();
      handle.refresh('Progress reset — 0 of 55 earned.');
    }
  });
  saveRow.append(exportBtn, importLabel, resetBtn);
  saveCard.append(saveRow);
  const importStatus = el('p');
  importStatus.setAttribute('aria-live', 'polite');
  if (statusMessage) importStatus.textContent = statusMessage;
  saveCard.append(importStatus);
  grid.append(saveCard);

  const systemsCard = el('section', 'info-card');
  systemsCard.append(el('h3', null, 'The systems inside this guide'));
  const systems = el('ul', 'system-list');
  for (const [name, what] of [
    ['TrophyRegistry', 'all 55 official trophies with grades, hidden flags, PSN targets, Gamerscore and roadmap phases.'],
    ['CitationIndex', 'every guide cites its sources by name and link; the full index is below.'],
    ['RoadmapEngine', 'five phases to the platinum, each with its own progress bar.'],
    ['MissableWatch', 'the one missable trophy + the one time-sensitive strand, each with its reasoning.'],
    ['SpoilerGuard', 'story trophies stay hidden until earned.'],
    ['ProgressStore', 'localStorage save, JSON export/import, per-trophy notes and PSN target counters.'],
    ['NextUpPlanner', 'the ordered chase list: missable first, cleanup last.'],
    ['FilterDeck', 'search plus kind, grade, status, missable and hidden filters.'],
  ]) {
    const li = el('li');
    li.append(el('strong', null, `${name} — `), document.createTextNode(what));
    systems.append(li);
  }
  systemsCard.append(systems);
  grid.append(systemsCard);

  const sourcesCard = el('section', 'info-card');
  sourcesCard.append(el('h3', null, 'Sources (CitationIndex)'));
  sourcesCard.append(el('p', null, 'Trophy names, descriptions and grades are the official PlayStation 5 list. Guides are written in our own words from these sources — cited, never copied.'));
  const sourceList = el('ul');
  for (const source of sourceIndex(registry)) {
    const li = el('li');
    const a = document.createElement('a');
    a.href = source.url;
    a.textContent = source.name;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    li.append(a, document.createTextNode(` — cited by ${source.count} guide${source.count === 1 ? '' : 's'}`));
    sourceList.append(li);
  }
  sourcesCard.append(sourceList);
  grid.append(sourcesCard);

  const verifyCard = el('section', 'info-card');
  verifyCard.append(el('h3', null, 'How the list was verified'));
  verifyCard.append(el('p', null, 'All 55 names, descriptions and grades were checked against the official list as published on Exophase and cross-checked with PSNProfiles, Output Lag, Push Square, Planet GTA 6, GTAVice.net and KeenGamer on 19 Nov 2026 — the sources agree on every name and description, and on every grade except Maximum Withdrawal (Push Square: Bronze; consensus: Silver). Hidden flags (28 hidden, 27 visible) and PSN targets (52 areas, 42 shooting challenges, 18 meditations, 100 WAiNK locations) come from the same cross-check. Two sources disagreed with the consensus and were not followed: Push Square lists Maximum Withdrawal as Bronze (everyone else: Silver), and one list counts only 15 hidden trophies (consensus: 28). Gamerscore values sum to exactly 1,000G, which cross-checks the table.'));
  verifyCard.append(el('p', null, 'Keyboard: / search · ↑ ↓ move · Enter open guide · Space tick earned · 1–5 switch views · S spoiler guard.'));
  grid.append(verifyCard);

  root.append(grid);
  return handle;
}
