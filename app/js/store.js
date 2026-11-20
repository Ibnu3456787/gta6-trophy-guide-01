// ProgressStore — the player's save. One localStorage record holds earned trophies,
// per-trophy PSN target counters, per-trophy notes and the spoiler setting. Export
// writes the same record as JSON; import reads it back and validates every field
// before it replaces the save, so a bad file can never corrupt progress.

export const STORE_KEY = 'vice-atlas-v1';
export const STORE_VERSION = 1;

const blank = () => ({
  version: STORE_VERSION,
  earned: [],
  counters: {},
  notes: {},
  spoiler: true,
});

function clean(raw, registry) {
  const data = blank();
  if (!raw || typeof raw !== 'object') return data;
  const ids = new Set(registry.trophies.map((t) => t.id));
  if (Array.isArray(raw.earned)) {
    data.earned = [...new Set(raw.earned.filter((id) => ids.has(id)))];
  }
  if (raw.counters && typeof raw.counters === 'object') {
    for (const [key, value] of Object.entries(raw.counters)) {
      const id = Number(key);
      if (ids.has(id) && Number.isFinite(value) && value >= 0) {
        const trophy = registry.byId.get(id);
        const cap = trophy.target ?? value;
        data.counters[id] = Math.min(Math.floor(value), cap);
      }
    }
  }
  if (raw.notes && typeof raw.notes === 'object') {
    for (const [key, value] of Object.entries(raw.notes)) {
      const id = Number(key);
      if (ids.has(id) && typeof value === 'string' && value.trim()) {
        data.notes[id] = value.slice(0, 2000);
      }
    }
  }
  if (typeof raw.spoiler === 'boolean') data.spoiler = raw.spoiler;
  return data;
}

export class ProgressStore {
  constructor(registry) {
    this.registry = registry;
    let parsed = null;
    try {
      parsed = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
    } catch {
      parsed = null;
    }
    this.data = clean(parsed, registry);
    this.earned = new Set(this.data.earned);
    this.listeners = new Set();
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  save() {
    this.data.earned = [...this.earned];
    localStorage.setItem(STORE_KEY, JSON.stringify(this.data));
    for (const listener of this.listeners) listener();
  }

  isEarned(id) { return this.earned.has(id); }

  toggle(id) {
    if (this.earned.has(id)) this.earned.delete(id);
    else this.earned.add(id);
    this.save();
  }

  setEarned(id, earned) {
    if (earned) this.earned.add(id);
    else this.earned.delete(id);
    this.save();
  }

  get earnedCount() { return this.earned.size; }

  counter(id) { return this.data.counters[id] ?? 0; }

  setCounter(id, value) {
    const trophy = this.registry.byId.get(id);
    if (!trophy || trophy.target == null) return;
    if (!Number.isFinite(value)) return; // a blank or mistyped counter input changes nothing
    const clamped = Math.max(0, Math.min(Math.floor(value), trophy.target));
    if (clamped === 0) delete this.data.counters[id];
    else this.data.counters[id] = clamped;
    this.save();
  }

  note(id) { return this.data.notes[id] ?? ''; }

  setNote(id, text) {
    if (text.trim()) this.data.notes[id] = text.slice(0, 2000);
    else delete this.data.notes[id];
    this.save();
  }

  get spoiler() { return this.data.spoiler; }

  setSpoiler(on) {
    this.data.spoiler = Boolean(on);
    this.save();
  }

  exportJSON() {
    return JSON.stringify({ ...this.data, earned: [...this.earned] }, null, 2);
  }

  /** Returns { ok, imported, errors } — never throws on bad input. */
  importJSON(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, imported: 0, errors: ['The file is not valid JSON.'] };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, imported: 0, errors: ['The file is not a VICE ATLAS save (expected a JSON object).'] };
    }
    if ('version' in parsed && parsed.version !== STORE_VERSION) {
      return { ok: false, imported: 0, errors: [`This save is version ${parsed.version}; VICE ATLAS reads version ${STORE_VERSION} saves.`] };
    }
    // An object with no save data at all ({} included) must not silently wipe
    // the current save: it is not a save, so it is rejected, not imported blank.
    const hasSaveData = ['earned', 'counters', 'notes', 'spoiler'].some((key) => key in parsed);
    if (!hasSaveData) {
      return { ok: false, imported: 0, errors: ['The file has no VICE ATLAS save data (no earned, counters, notes or spoiler setting).'] };
    }
    const cleaned = clean(parsed, this.registry);
    this.data = cleaned;
    this.earned = new Set(cleaned.earned);
    this.save();
    return { ok: true, imported: this.earned.size, errors: [] };
  }

  reset() {
    this.data = blank();
    this.earned = new Set();
    this.save();
  }
}
