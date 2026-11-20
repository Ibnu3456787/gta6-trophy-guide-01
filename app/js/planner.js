// NextUpPlanner — what to chase next, in one ordered list. Deterministic, no
// guessing: the missable trophy first (it can be lost), then the next story trophy
// in roadmap order, then the time-sensitive strand, then one-session quick wins,
// then grinds nearest to completion, and the 100% / platinum cleanup last.

const QUICK_WIN_IDS = new Set([21, 20, 37, 38, 36, 39, 41, 46, 53, 54, 55]);

function bucketOf(trophy, store) {
  if (trophy.missable) return 0;
  if (trophy.kind === 'story') return 1;
  if (trophy.timeSensitive) return 2;
  if (QUICK_WIN_IDS.has(trophy.id)) return 3;
  if (trophy.target != null) return 4;
  if (trophy.kind === 'completion') return 6;
  return 5;
}

function reasonFor(trophy, store, bucket) {
  switch (bucket) {
    case 0:
      return 'MISSABLE — do Lucia\u2019s Chapter 1 balcony meditation before the chapter ends.';
    case 1:
      return `Story order — roadmap phase ${trophy.roadmap}. Unmissable; just play.`;
    case 2:
      return 'TIME-SENSITIVE — Race Against Yago (Chapter 3) has an hourglass window.';
    case 3:
      return 'Quick win — one session, no grind.';
    case 4: {
      const have = store.counter(trophy.id);
      return `Grind — ${have}/${trophy.target} ${trophy.targetLabel ?? ''} so far.`;
    }
    case 6:
      return 'Cleanup — falls out of the rest of the roadmap.';
    default:
      return `Side content — roadmap phase ${trophy.roadmap}.`;
  }
}

export function planNext(registry, store) {
  const missing = registry.trophies.filter((t) => !store.isEarned(t.id));
  const planned = missing.map((trophy) => {
    const bucket = bucketOf(trophy, store);
    const progress = trophy.target != null && trophy.target > 0
      ? store.counter(trophy.id) / trophy.target
      : 0;
    return { trophy, bucket, progress, reason: reasonFor(trophy, store, bucket) };
  });
  planned.sort((a, b) => {
    if (a.bucket !== b.bucket) return a.bucket - b.bucket;
    if (a.bucket === 4 && b.bucket === 4 && a.progress !== b.progress) return b.progress - a.progress;
    if (a.trophy.roadmap !== b.trophy.roadmap) return a.trophy.roadmap - b.trophy.roadmap;
    return a.trophy.id - b.trophy.id;
  });
  return planned;
}
