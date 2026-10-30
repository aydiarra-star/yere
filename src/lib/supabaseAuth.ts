export type YereUser = { id: string; email?: string };
export type YereSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: YereUser;
};

const SESSION_KEY = "yere.auth.session.v1";
const projectUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseReady = Boolean(projectUrl && publishableKey);

function apiUrl(path: string): string {
  if (!projectUrl) throw new Error("La connexion Supabase n'est pas configurée sur ce déploiement.");
  return `${projectUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function headers(accessToken?: string): HeadersInit {
  if (!publishableKey) throw new Error("La clé publique Supabase est absente.");
  return {
    apikey: publishableKey,
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
  };
}

function toSession(value: unknown): YereSession | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const user = item.user as Record<string, unknown> | undefined;
  if (typeof item.access_token !== "string" || typeof item.refresh_token !== "string" || !user || typeof user.id !== "string") return null;
  const expiresAt = typeof item.expires_at === "number"
    ? item.expires_at
    : Math.floor(Date.now() / 1000) + (typeof item.expires_in === "number" ? item.expires_in : 3600);
  return { access_token: item.access_token, refresh_token: item.refresh_token, expires_at: expiresAt, user: { id: user.id, email: typeof user.email === "string" ? user.email : undefined } };
}

function saveSession(session: YereSession): void {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.sessionStorage.setItem("yere-user-scope", session.user.id);
}

/**
 * Consumes Supabase's email-confirmation implicit-flow fragment.
 * The access token is validated against /auth/v1/user before it is stored.
 */
export async function consumeAuthCallback(): Promise<YereSession | null> {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const callbackError = params.get("error_description") || params.get("error");
  if (!accessToken && !callbackError) return null;

  // Remove credentials from the address bar before doing any further work.
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

  if (callbackError) throw new Error(decodeURIComponent(callbackError.replace(/\+/g, " ")));
  if (!accessToken || !refreshToken) throw new Error("Le lien de confirmation est incomplet. Demandez un nouvel e-mail de confirmation.");

  const response = await fetch(apiUrl("auth/v1/user"), { method: "GET", headers: headers(accessToken) });
  const user = await parseResponse(response) as Record<string, unknown>;
  if (typeof user.id !== "string") throw new Error("Supabase n'a pas confirmé l'identité du compte.");

  const expiresIn = Number(params.get("expires_in") || 3600);
  const session: YereSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Number(params.get("expires_at")) || Math.floor(Date.now() / 1000) + expiresIn,
    user: { id: user.id, email: typeof user.email === "string" ? user.email : undefined }
  };
  saveSession(session);
  return session;
}

export function readSession(): YereSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = toSession(JSON.parse(raw));
    if (session) window.sessionStorage.setItem("yere-user-scope", session.user.id);
    return session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem("yere-user-scope");
  window.sessionStorage.removeItem("yere-active-atelier");
}

async function parseResponse(response: Response): Promise<unknown> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = body as Record<string, unknown>;
    throw new Error(String(error.msg ?? error.message ?? error.error_description ?? error.error ?? `Erreur Supabase (${response.status})`));
  }
  return body;
}

export async function signUp(email: string, password: string): Promise<{ session: YereSession | null }> {
  // Supabase's redirect_to parameter overrides any localhost Site URL for this signup.
  const redirectTo = `${window.location.origin}/`;
  const response = await fetch(apiUrl(`auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}`), { method: "POST", headers: headers(), body: JSON.stringify({ email, password }) });
  const body = await parseResponse(response);
  const session = toSession(body);
  if (session) saveSession(session);
  return { session };
}

export async function signIn(email: string, password: string): Promise<YereSession> {
  const response = await fetch(apiUrl("auth/v1/token?grant_type=password"), { method: "POST", headers: headers(), body: JSON.stringify({ email, password }) });
  const session = toSession(await parseResponse(response));
  if (!session) throw new Error("Supabase n'a pas retourné de session valide.");
  saveSession(session);
  return session;
}

export async function refreshSession(session: YereSession): Promise<YereSession> {
  const response = await fetch(apiUrl("auth/v1/token?grant_type=refresh_token"), { method: "POST", headers: headers(), body: JSON.stringify({ refresh_token: session.refresh_token }) });
  const next = toSession(await parseResponse(response));
  if (!next) throw new Error("La session a expiré. Connectez-vous à nouveau.");
  saveSession(next);
  return next;
}

export async function signOut(session: YereSession): Promise<void> {
  try {
    await fetch(apiUrl("auth/v1/logout"), { method: "POST", headers: headers(session.access_token) });
  } finally {
    clearSession();
  }
}

export async function authenticatedFetch(session: YereSession, path: string, init: RequestInit = {}): Promise<Response> {
  let active = readSession() ?? session;
  if (active.expires_at * 1000 <= Date.now() + 60_000) active = await refreshSession(active);
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: { ...headers(active.access_token), ...(init.headers ?? {}) }
  });
  if (response.status === 401) {
    active = await refreshSession(active);
    return fetch(apiUrl(path), { ...init, headers: { ...headers(active.access_token), ...(init.headers ?? {}) } });
  }
  return response;
}

export async function listMyAteliers(session: YereSession): Promise<Array<{ id: string; nom: string; telephone: string | null; ville: string | null }>> {
  const response = await authenticatedFetch(session, "rest/v1/atelier?select=id,nom,telephone,ville&order=created_at.asc");
  const data = await parseResponse(response);
  return Array.isArray(data) ? data as Array<{ id: string; nom: string; telephone: string | null; ville: string | null }> : [];
}

export async function createAtelier(session: YereSession, input: { nom: string; telephone: string; ville: string }): Promise<string> {
  // Do not ask PostgREST to RETURNING the inserted row: the SELECT policy on
  // atelier is membership-based, and the owner membership is attached by an
  // AFTER INSERT trigger. Read the row in a separate request after that trigger
  // has completed instead.
  const response = await authenticatedFetch(session, "rest/v1/atelier", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ nom: input.nom, telephone: input.telephone || null, ville: input.ville || null })
  });
  await parseResponse(response);
  const workspaces = await listMyAteliers(session);
  const created = workspaces.find((item) =>
    item.nom === input.nom
    && item.telephone === (input.telephone || null)
    && item.ville === (input.ville || null)
  );
  if (!created) throw new Error("Atelier créé, mais non visible après son rattachement. Vérifiez les droits du compte avant de poursuivre.");
  return created.id;
}
