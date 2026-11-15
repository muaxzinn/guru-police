/**
 * Thai 3-byte UTF-8 safe truncation & code-point helpers (Lobe 3).
 * Never slices mid-code-point across 3-byte Thai UTF-8 sequences (0xE0)
 * or leaves dangling Thai combining vowel/tone marks without their cluster start.
 */
export function safeTruncateThai(input: string | null | undefined, maxChars = 120): string {
  if (!input) return '';
  const chars = Array.from(input);
  if (chars.length <= maxChars) return input;
  let cut = maxChars;
  // Avoid cutting right before a Thai combining mark (U+0E31, U+0E34-0E3A, U+0E47-0E4E)
  while (cut > 0) {
    const code = chars[cut]?.codePointAt(0) ?? 0;
    const isCombining =
      code === 0x0e31 ||
      (code >= 0x0e34 && code <= 0x0e3a) ||
      (code >= 0x0e47 && code <= 0x0e4e);
    if (!isCombining) break;
    cut--;
  }
  return `${chars.slice(0, Math.max(1, cut)).join('')}…`;
}

