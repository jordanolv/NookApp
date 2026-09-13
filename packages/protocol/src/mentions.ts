const RE_SPECIALS = /[.*+?^${}()|[\]\\]/g;

/** Matches `@name` for any of the given names. Longest first so "Jo" never shadows "Jordan". */
export function mentionRegex(names: string[]): RegExp | null {
  const parts = names
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(RE_SPECIALS, '\\$&'));
  return parts.length ? new RegExp(`@(${parts.join('|')})(?!\\w)`, 'gi') : null;
}

/** Resolves the @names written in a message to member ids. */
export function resolveMentions(
  content: string,
  members: readonly { id: string; name: string }[],
): string[] {
  const re = mentionRegex(members.map((m) => m.name));
  if (!re) return [];
  const named = new Set<string>();
  for (const match of content.matchAll(re)) named.add(match[1]!.toLowerCase());
  if (!named.size) return [];
  return [...new Set(members.filter((m) => named.has(m.name.toLowerCase())).map((m) => m.id))];
}
