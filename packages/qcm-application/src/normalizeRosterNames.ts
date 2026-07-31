/**
 * Normalise une liste de noms : trim, ignore vides, déduplique (casse insensible),
 * conserve l’ordre de première apparition.
 */
export function normalizeRosterNames(raw: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of raw) {
    const name = String(entry ?? '').trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase('fr');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}
