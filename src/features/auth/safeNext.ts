import { routes } from "../../lib/routes";

/** Only paths on this site, so a sign-in link can't send anyone elsewhere. */
export function safeNext(next: string | null): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\") ||
    [...next].some((ch) => ch.charCodeAt(0) < 32) ||
    next.startsWith(routes.signIn)
  ) {
    return routes.account;
  }
  return next;
}
