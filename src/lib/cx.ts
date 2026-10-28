/** Joins class names, skipping empty values. Components keep their own styles; callers pass layout classes only. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
