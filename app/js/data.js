// TrophyRegistry — the 55-trophy dataset. Loads app/data/trophies.json (fetched from
// the app's own files, never the network) and indexes it for the tracker, the
// roadmap, the planner and the filters. Names, descriptions and grades are the
// official PlayStation 5 list; every guide is this entry's own words and carries
// its sources in CitationIndex form.

export const GRADE_POINTS = { platinum: 300, gold: 90, silver: 30, bronze: 15 };
export const TOTAL_POINTS = 1350; // 1x300 + 2x90 + 6x30 + 46x15

export const GRADE_LABELS = {
  platinum: 'Platinum',
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
};

export const KIND_LABELS = {
  story: 'Story',
  side: 'Side story',
  activity: 'Activity',
  collectible: 'Collectible',
  robbery: 'Robbery',
  freeroam: 'Free roam',
  completion: 'Completion',
};

export const KIND_ORDER = ['story', 'side', 'activity', 'collectible', 'robbery', 'freeroam', 'completion'];

export class TrophyRegistry {
  constructor(doc) {
    this.game = doc.game;
    this.platform = doc.platform;
    this.listNote = doc.list;
    this.trophies = doc.trophies;
    this.byId = new Map(doc.trophies.map((t) => [t.id, t]));
  }

  static async load() {
    const response = await fetch('data/trophies.json');
    if (!response.ok) throw new Error(`trophies.json failed to load (${response.status})`);
    return new TrophyRegistry(await response.json());
  }

  get total() { return this.trophies.length; }

  gradeCount(grade) {
    return this.trophies.filter((t) => t.grade === grade).length;
  }

  ofKind(kind) {
    return this.trophies.filter((t) => t.kind === kind);
  }

  ofRoadmapPhase(phase) {
    return this.trophies.filter((t) => t.roadmap === phase);
  }

  missables() {
    return this.trophies.filter((t) => t.missable);
  }

  timeSensitive() {
    return this.trophies.filter((t) => t.timeSensitive);
  }

  unconfirmed() {
    return this.trophies.filter((t) => t.unconfirmed);
  }

  /** Full-text search over name, description, guide and kind label. */
  search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return this.trophies;
    return this.trophies.filter((t) =>
      [t.name, t.description, t.guide, KIND_LABELS[t.kind] ?? t.kind, t.grade]
        .join(' ').toLowerCase().includes(q),
    );
  }

  pointsFor(earnedIds) {
    let points = 0;
    for (const id of earnedIds) {
      const t = this.byId.get(id);
      if (t) points += GRADE_POINTS[t.grade] ?? 0;
    }
    return points;
  }
}
