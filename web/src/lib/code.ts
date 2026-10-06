/** Canonicalizes how a stored `code` string is shown. A blank code already
 * gets its own caller-specific placeholder ("FREE", etc.), but a code
 * someone actually typed as some casing of "n/a" should always render as
 * the canonical "N/A" rather than whatever casing they happened to type. */
export function displayCode(code: string): string {
  return code.trim().toUpperCase() === "N/A" ? "N/A" : code;
}
