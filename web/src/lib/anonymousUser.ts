const STORAGE_KEY = "loocodes.userId";

function generateId(): string {
  return `anon-${crypto.randomUUID().slice(0, 8)}`;
}

export function getUserId(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = generateId();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

/** Deleting the "account" means forgetting this browser's identity — codes
 * already shared under the old id stay public, just no longer show as
 * "mine" here. Returns the fresh id. */
export function resetUserId(): string {
  const id = generateId();
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}
