/**
 * YÉRÉ's first safe offline milestone is read-only.
 * All writes to Supabase/public APIs are blocked before a request is sent when
 * the browser reports no network. We do not queue or replay mutations yet.
 */
export function assertNetworkForWrite(method: string | undefined, online: boolean): void {
  const normalizedMethod = (method ?? "GET").toUpperCase();
  if (normalizedMethod === "GET" || normalizedMethod === "HEAD" || normalizedMethod === "OPTIONS") return;
  if (!online) {
    throw new Error(
      "Vous êtes hors ligne. Cette modification n’a pas été envoyée ni enregistrée. " +
      "Reconnectez-vous à Internet avant de réessayer."
    );
  }
}
