import { Chord, Note } from "tonal";

/**
 * Robustly parses a chord name into a note array.
 * Cleans non-standard notation and falls back to triads if needed.
 */
export function parseNotesFromChord(chordName: string): string[] {
  if (!chordName) return [];

  // 1. Sanitize: Remove parentheses and extra spaces
  const sanitized = chordName.replace(/[()]/g, "").trim();

  // 2. Try parsing with sanitized version
  let chord = Chord.get(sanitized);

  // 3. If failed, attempt to find a root + minimal quality (Triad fallback)
  if (!chord.notes.length) {
    // Regex to match Root [A-G][b|#]? and Quality [m|min|maj|M|dim|aug]?
    const match = sanitized.match(/^([A-Ga-g][b#]?)(m|min|maj|dim|aug)?/);
    if (match) {
      const root = match[1];
      const quality = match[2] || ""; // Default to major if empty
      chord = Chord.get(`${root}${quality}`);
    }
  }

  // 4. Return notes scaled to 3rd octave for consistent visualization
  if (chord.notes.length) {
    return chord.notes.map(n => `${n}3`);
  }

  return [];
}
