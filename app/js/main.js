// VICE ATLAS — boot, routing and the header's platinum progress.
// Boots TrophyRegistry, wires ProgressStore to the header ring, routes the five
// views by hash, and owns the keyboard shortcuts. No network request is made at
// any point: the only fetch is data/trophies.json from the app's own files.

import { TrophyRegistry, TOTAL_POINTS } from './data.js';
import { ProgressStore } from './store.js';
import { renderTracker, renderRoadmap, renderMissables, renderNext, renderAbout } from './views.js';

const VIEWS = {
  tracker: renderTracker,
  roadmap: renderRoadmap,
  missables: renderMissables,
  next: renderNext,
  about: renderAbout,
};

const VIEW_TITLES = {
  tracker: 'Tracker',
  roadmap: 'Roadmap to Platinum',
  missables: 'Missables',
  next: 'Next Up',
  about: 'About & Save',
};

const RING_CIRCUMFERENCE = 188.5;

const ctx = {
  registry: null,
  store: null,
  selectedId: 28, // Positive Mental Attitude: the missable trophy, the guide to see first.
  visibleIds: [],
  currentView: 'tracker',
  viewHandle: null,
};

function viewFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  return VIEWS[hash] ? hash : 'tracker';
}

function renderHeader() {
  const { registry, store } = ctx;
  const earned = store.earnedCount;
  const total = registry.total;
  const ring = document.getElementById('ringFill');
  ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - earned / total));
  document.getElementById('ringText').textContent = `${earned}/${total}`;
  document.getElementById('earnedCount').textContent = String(earned);
  document.getElementById('pointsLine').textContent =
    `${registry.pointsFor(store.earned).toLocaleString('en-US')} / ${TOTAL_POINTS.toLocaleString('en-US')} trophy points`;
  const byGrade = ['platinum', 'gold', 'silver', 'bronze'].map((grade) => {
    const have = registry.trophies.filter((t) => t.grade === grade && store.isEarned(t.id)).length;
    return `${grade[0].toUpperCase()} ${have}/${registry.gradeCount(grade)}`;
  });
  document.getElementById('gradeLine').textContent = byGrade.join(' · ');
  const missing = registry.missables().filter((t) => !store.isEarned(t.id)).length
    + registry.timeSensitive().filter((t) => !store.isEarned(t.id)).length;
  document.getElementById('missableBadge').textContent = String(missing);
}

function renderView() {
  const root = document.getElementById('view');
  root.replaceChildren();
  window.scrollTo(0, 0); // hash navigation keeps the old scroll offset; each view starts at its top.
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('active', tab.dataset.view === ctx.currentView);
  }
  document.title = `VICE ATLAS — ${VIEW_TITLES[ctx.currentView]} | GTA VI Trophy Guide`;
  ctx.viewHandle = VIEWS[ctx.currentView](root, ctx);
  renderHeader();
}

function moveSelection(delta) {
  if (ctx.currentView !== 'tracker' || ctx.visibleIds.length === 0) return;
  const index = ctx.visibleIds.indexOf(ctx.selectedId);
  const next = index === -1
    ? (delta > 0 ? 0 : ctx.visibleIds.length - 1)
    : (index + delta + ctx.visibleIds.length) % ctx.visibleIds.length;
  ctx.selectedId = ctx.visibleIds[next];
  if (ctx.viewHandle) ctx.viewHandle.refresh();
  const row = document.querySelector(`[data-trophy-id="${ctx.selectedId}"]`);
  if (row) row.scrollIntoView({ block: 'nearest' });
}

function installKeys() {
  window.addEventListener('keydown', (event) => {
    const target = event.target;
    const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
    if (event.key === '/' && !typing) {
      event.preventDefault();
      if (ctx.currentView !== 'tracker') window.location.hash = '#/tracker';
      setTimeout(() => document.getElementById('searchInput')?.focus(), 0);
      return;
    }
    if (typing) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); moveSelection(1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); moveSelection(-1); }
    else if (event.key === 'Enter' && ctx.currentView === 'tracker'
      && !(target instanceof HTMLAnchorElement) && !(target instanceof HTMLButtonElement)) {
      // "Enter opens a guide": bring the selected trophy's guide pane into view
      // and focus it, so the guide itself is what the reader lands on.
      event.preventDefault();
      const detail = document.getElementById('detailPane');
      if (detail) {
        detail.scrollIntoView({ block: 'nearest' });
        detail.focus({ preventScroll: true });
      }
    } else if (event.key === ' ' && ctx.currentView === 'tracker') {
      event.preventDefault();
      ctx.store.toggle(ctx.selectedId);
    } else if (event.key === 's' || event.key === 'S') {
      ctx.store.setSpoiler(!ctx.store.spoiler);
      if (ctx.viewHandle) ctx.viewHandle.refresh();
    } else if (['1', '2', '3', '4', '5'].includes(event.key)) {
      const views = ['tracker', 'roadmap', 'missables', 'next', 'about'];
      window.location.hash = `#/${views[Number(event.key) - 1]}`;
    }
  });
}

async function boot() {
  try {
    ctx.registry = await TrophyRegistry.load();
  } catch (error) {
    document.getElementById('view').innerHTML =
      '<p>VICE ATLAS could not load its trophy data. Serve the app/ folder with a static server (for example: <code>node serve.ts</code>) and open it over http:// — browsers block data files when the page is opened straight from disk.</p>';
    console.error(error);
    return;
  }
  ctx.store = new ProgressStore(ctx.registry);
  ctx.store.onChange(renderHeader);
  window.addEventListener('hashchange', () => {
    ctx.currentView = viewFromHash();
    renderView();
  });
  ctx.currentView = viewFromHash();
  installKeys();
  renderView();
}

boot();
