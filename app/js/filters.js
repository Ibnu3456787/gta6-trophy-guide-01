// FilterDeck — search + kind + grade + status filtering for the tracker.
// SpoilerGuard — the spoiler rule: with the guard on, a story trophy the player has
// not earned yet shows neither its name nor its description nor its guide, only a
// "hidden story trophy" placeholder. Earning it lifts the veil for that trophy.

export const FILTER_STATE = {
  query: '',
  kind: 'all',
  grade: 'all',
  status: 'all', // all | earned | missing
  missableOnly: false,
  hiddenOnly: false,
};

export function applyFilters(trophies, filters) {
  return trophies.filter((t) => {
    if (filters.kind !== 'all' && t.kind !== filters.kind) return false;
    if (filters.grade !== 'all' && t.grade !== filters.grade) return false;
    if (filters.missableOnly && !t.missable && !t.timeSensitive) return false;
    if (filters.hiddenOnly && !t.hidden) return false;
    return true;
  });
}

export function applyStatusFilter(trophies, filters, store) {
  if (filters.status === 'earned') return trophies.filter((t) => store.isEarned(t.id));
  if (filters.status === 'missing') return trophies.filter((t) => !store.isEarned(t.id));
  return trophies;
}

/** True when SpoilerGuard must hide this trophy's identity right now. */
export function isSpoilerHidden(trophy, store) {
  return Boolean(store.spoiler && trophy.story && !store.isEarned(trophy.id));
}

export const SPOILER_PLACEHOLDER = {
  name: 'Hidden story trophy',
  description: 'Spoiler Guard is hiding this story trophy until you earn it. Tick it earned to reveal it.',
};
