/** Profile URL for web app — prefers username slug when available. */
export function profilePath(username: string | null | undefined, userId: string): string {
  return username ? `/profile/${username}` : `/profile/${userId}`;
}
