// RoadmapEngine — the five-phase road to the platinum, built from the official
// descriptions: story chapters first (they unlock the systems the rest of the list
// needs), side stories next, then activities and robberies, then collectibles and
// the 100% cleanup. Each phase tracks its own earned count.
// MissableWatch — the missable and time-sensitive flags, each with its reasoning:
// only one trophy is missable, and one strand is time-sensitive.

export const PHASES = [
  {
    id: 1,
    title: 'Story I — Chapters 1–2',
    blurb: 'Play the opening and the first two chapters. Character switching opens after Breakfast Run, and the partner trophies become possible. Do Lucia\u2019s balcony meditation in Chapter 1 — it is the one thing in the game you can miss.',
    advice: 'Keep a manual save at the start of every chapter. There is no mission replay and no New Game Plus.',
  },
  {
    id: 2,
    title: 'Story II — Chapters 3–5',
    blurb: 'Finish the campaign: the last two chapter trophies, the remaining mission trophies and the gold for the final mission. Race Against Yago in Chapter 3 is time-sensitive — do it the moment it appears.',
    advice: 'Keep one untouched manual save from just before the final mission.',
  },
  {
    id: 3,
    title: 'Side stories & strangers',
    blurb: 'The six side-story finales (Andy, Kenton, Billy, Randy, Tyrone, Bret) plus 8 stranger strands. Every side story stays open after the credits, so nothing here can be missed — but Andy\u2019s, Billy\u2019s and Tyrone\u2019s strands do not count toward Strangers & Freaks.',
    advice: 'Check the Strangers & Freaks progress counter after each strand you finish.',
  },
  {
    id: 4,
    title: 'Activities, robberies & free roam',
    blurb: 'The long middle: shooting range golds, races, stunts, robberies, partner trophies, money and vehicles. Bank vaults unlock near the end of Chapter 4; jewelry robberies open in Chapter 3.',
    advice: 'Overshoot the trophy targets where 100% asks for more: 300 stunts, 70 Challenges, 8 vaults.',
  },
  {
    id: 5,
    title: 'Collectibles, 100% & platinum',
    blurb: 'Cards, WAiNK scans, meditation spots and map exploration, then the 100% checklist (it appears under Progress > Stats > 100% Completion after the story) and the platinum itself.',
    advice: 'Three trophies have no confirmed unlock method at launch — their guides say so plainly. Do not trust unverified launch-day claims.',
  },
];

export function phaseProgress(registry, store, phaseId) {
  const trophies = registry.ofRoadmapPhase(phaseId);
  const earned = trophies.filter((t) => store.isEarned(t.id)).length;
  return { total: trophies.length, earned };
}

export function overallRoadmap(registry, store) {
  return PHASES.map((phase) => ({ ...phase, ...phaseProgress(registry, store, phase.id) }));
}

// MissableWatch: the flags, with the reasoning the official descriptions support.
export const MISSABLE_WATCH = {
  missable: {
    heading: '1 missable trophy — Positive Mental Attitude',
    reasoning: 'The official description asks for meditation at every spot across Leonida. Output Lag and PowerPyx both report that Lucia\u2019s balcony meditation in Chapter 1 counts toward it and disappears once that chapter ends — and GTA VI has no mission replay. It is unconfirmed whether that one meditation is strictly required, so the safe play is to do it and keep a Chapter 1 save until the trophy pops.',
  },
  timeSensitive: {
    heading: '1 time-sensitive strand — Strangers & Freaks',
    reasoning: 'Race Against Yago, a Chapter 3 race in Yago\u2019s street racing strand, carries an hourglass icon: it is only available for a limited window, and its strand counts toward the 8 strands Strangers & Freaks needs. Save first, then race the moment it appears.',
  },
  saveAdvice: {
    heading: 'Save discipline (no mission replay)',
    reasoning: 'GTA VI has no mission replay and no New Game Plus at launch. The game has 15 manual save slots plus one autosave: keep one save at the start of each chapter and one untouched save from just before the final mission, and rotate the rest.',
  },
  cheats: {
    heading: 'Cheats switch trophies off',
    reasoning: 'Using any cheat is expected to disable both trophies and saving on that save. Keep cheats off your trophy save entirely; use a throwaway save if you want to try them.',
  },
};
