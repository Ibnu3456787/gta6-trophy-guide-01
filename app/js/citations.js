// CitationIndex — every guide's sources, rendered beside the guide that uses them.
// A link opens only when the reader follows it; the app itself fetches nothing.
// The index also powers the About view's full source list with per-source counts.

export function sourceListElement(trophy) {
  const ul = document.createElement('ul');
  ul.className = 'sources';
  for (const source of trophy.sources) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = source.url;
    a.textContent = source.name;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    li.append(a);
    ul.append(li);
  }
  return ul;
}

/** All distinct sources across the registry, with how many guides cite each. */
export function sourceIndex(registry) {
  const counts = new Map();
  for (const trophy of registry.trophies) {
    for (const source of trophy.sources) {
      const key = source.url;
      const entry = counts.get(key) ?? { name: source.name, url: source.url, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}
