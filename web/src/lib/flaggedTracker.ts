const STORAGE_KEY = "loocodes.flaggedIds";

function readIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    // ignore corrupt storage
  }
  return new Set();
}

export function hasFlaggedLocally(id: string): boolean {
  return readIds().has(id);
}

export function markFlaggedLocally(id: string): void {
  const ids = readIds();
  ids.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}
