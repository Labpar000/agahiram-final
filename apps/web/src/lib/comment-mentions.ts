export interface MentionCandidate {
  id: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
  isVerified?: boolean;
}

/** Active @mention query at cursor, or null if not in a mention. */
export function parseMentionQuery(
  text: string,
  cursorPos: number,
): { query: string; start: number } | null {
  const before = text.slice(0, cursorPos);
  const match = before.match(/@([a-zA-Z0-9_.]*)$/);
  if (!match) return null;
  return { query: match[1] ?? '', start: before.length - match[0].length };
}

export function insertMention(
  text: string,
  start: number,
  cursorPos: number,
  username: string,
): { text: string; cursor: number } {
  const before = text.slice(0, start);
  const after = text.slice(cursorPos);
  const insertion = `@${username} `;
  return { text: before + insertion + after, cursor: before.length + insertion.length };
}

export function commentContainsMention(
  content: string,
  username: string | null | undefined,
): boolean {
  if (!username) return false;
  const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`@${escaped}(?:\\s|$|[.,!?])`, 'i').test(content);
}
