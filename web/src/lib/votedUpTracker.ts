const STORAGE_KEY = "loocodes.votedUpIds";

function readIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    // ignore corrupt storage
  }
  return new Set();
}

export function hasVotedUpLocally(id: string): boolean {
  return readIds().has(id);
}

export function readVotedUpIds(): Set<string> {
  return readIds();
}

export function markVotedUpLocally(id: string): void {
  const ids = readIds();
  ids.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

/** Reverses a single id's local confirmation — used when this device flags a
 * listing, since a flag means a prior "It Works" tap may no longer hold. */
export function unmarkVotedUpLocally(id: string): void {
  const ids = readIds();
  if (!ids.delete(id)) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function clearVotedUpLocally(): void {
  localStorage.removeItem(STORAGE_KEY);
}
