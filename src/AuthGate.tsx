import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { clearSession, createAtelier, listMyAteliers, readSession, refreshSession, signIn, signOut, signUp, supabaseReady, type YereSession } from "./lib/supabaseAuth";
import "./auth-gate.css";

type Atelier = { id: string; nom: string; telephone: string | null; ville: string | null };
type Props = { children: ReactNode };

function seedLocalProfile(userId: string, atelier: Atelier) {
  const suffix = `::${userId}`;
  window.sessionStorage.setItem("yere-user-scope", userId);
  window.sessionStorage.setItem("yere-active-atelier", atelier.id);
  window.localStorage.setItem(`yere-demo-atelier-v1${suffix}`, JSON.stringify({
    name: atelier.nom, phone: atelier.telephone ?? "", city: atelier.ville ?? "", activity: "tailleur", workMode: "independent", secondaryActivities: []
  }));
  window.localStorage.setItem(`yere-demo-onboarding-complete-v1${suffix}`, "true");
}

export default function AuthGate({ children }: Props) {
  const [session, setSession] = useState<YereSession | null>(null);
  const [atelier, setAtelier] = useState<Atelier | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [atelierName, setAtelierName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadWorkspace(activeSession: YereSession) {
    const workspaces = await listMyAteliers(activeSession);
    if (workspaces.length > 0) {
      seedLocalProfile(activeSession.user.id, workspaces[0]);
      setAtelier(workspaces[0]);
    } else {
      setAtelier(null);
    }
  }

  useEffect(() => {
    let active = true;
    async function initialize() {
      if (!supabaseReady) { setReady(true); return; }
      const saved = readSession();
      if (!saved) { setReady(true); return; }
      try {
        const current = saved.expires_at * 1000 <= Date.now() + 60_000 ? await refreshSession(saved) : saved;
        if (!active) return;
        setSession(current);
        await loadWorkspace(current);
      } catch {
        clearSession();
      } finally {
        if (active) setReady(true);
      }
    }
    void initialize();
    return () => { active = false; };
  }, []);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "signup") {
        const result = await signUp(email.trim().toLowerCase(), password);
        if (!result.session) {
          setMessage("Votre compte a été créé. Consultez votre messagerie pour confirmer votre adresse e-mail, puis connectez-vous.");
          setMode("login");
        } else {
          setSession(result.session);
          await loadWorkspace(result.session);
        }
      } else {
        const next = await signIn(email.trim().toLowerCase(), password);
        setSession(next);
        await loadWorkspace(next);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connexion impossible. Réessayez.");
    } finally { setBusy(false); }
  }

  async function submitAtelier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setBusy(true); setError("");
    try {
      const id = await createAtelier(session, { nom: atelierName.trim(), telephone: phone.trim(), ville: city.trim() });
      const created = (await listMyAteliers(session)).find((item) => item.id === id);
      if (!created) throw new Error("Atelier créé, mais impossible de le relire avec les droits du compte. Contactez l'assistance avant de poursuivre.");
      seedLocalProfile(session.user.id, created);
      setAtelier(created);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Création de l'atelier impossible.");
    } finally { setBusy(false); }
  }

  async function handleSignOut() {
    if (session) await signOut(session);
    setSession(null); setAtelier(null); setMessage(""); setError("");
  }

  if (!ready) return <main className="auth-loading"><span className="auth-mark">Y</span><p>Préparation de votre espace YÉRÉ…</p></main>;

  if (!supabaseReady) return <main className="auth-shell"><section className="auth-card"><span className="auth-mark">Y</span><p className="eyebrow">YÉRÉ · ATELIER</p><h1>Connexion indisponible</h1><p>La configuration Supabase manque sur ce déploiement. Aucun compte ne peut être créé pour le moment.</p></section></main>;

  if (!session) return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand"><span className="auth-mark">Y</span><span><strong>YÉRÉ</strong><small>ATELIER</small></span></div>
        <p className="eyebrow">VOTRE ESPACE PROFESSIONNEL</p>
        <h1>{mode === "login" ? "Heureux de vous retrouver." : "Créez votre compte YÉRÉ."}</h1>
        <p className="auth-intro">Un espace de travail sécurisé pour organiser votre activité de tailleur.</p>
        <form className="auth-form" onSubmit={submitAuth}>
          <label>Adresse e-mail<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@exemple.com" /></label>
          <label>Mot de passe<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8 caractères minimum" /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="auth-message" role="status">{message}</p>}
          <button className="primary-button auth-submit" disabled={busy} type="submit">{busy ? "Veuillez patienter…" : mode === "login" ? "Se connecter" : "Créer mon compte"} <span>→</span></button>
        </form>
        <p className="auth-switch">{mode === "login" ? "Vous n'avez pas encore de compte ?" : "Vous avez déjà un compte ?"} <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}>{mode === "login" ? "Créer un compte" : "Se connecter"}</button></p>
        <p className="auth-footnote">Votre compte est protégé par Supabase Auth. Ne partagez jamais votre mot de passe.</p>
      </section>
    </main>
  );

  if (!atelier) return (
    <main className="auth-shell">
      <section className="auth-card auth-workspace-card">
        <div className="auth-brand"><span className="auth-mark">Y</span><span><strong>YÉRÉ</strong><small>ATELIER</small></span><button className="auth-signout" type="button" onClick={() => void handleSignOut()}>Déconnexion</button></div>
        <p className="eyebrow">PREMIÈRE CONFIGURATION</p>
        <h1>Créons votre atelier.</h1>
        <p className="auth-intro">Votre compte est prêt. Renseignez les informations de votre atelier pour créer votre espace professionnel.</p>
        <form className="auth-form" onSubmit={submitAtelier}>
          <label>Nom de l'atelier<input required maxLength={120} value={atelierName} onChange={(event) => setAtelierName(event.target.value)} placeholder="Ex. Atelier Awa Couture" /></label>
          <label>Téléphone<input type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+221…" /></label>
          <label>Ville<input maxLength={100} value={city} onChange={(event) => setCity(event.target.value)} placeholder="Dakar, Thiès…" /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="primary-button auth-submit" disabled={busy} type="submit">{busy ? "Création en cours…" : "Créer mon atelier"} <span>→</span></button>
        </form>
        <p className="auth-footnote">Vous serez automatiquement désigné propriétaire de cet atelier.</p>
      </section>
    </main>
  );

  return (
    <>
      <div className="auth-session-bar">
        <span><strong>Connecté</strong> · {session.user.email} · {atelier.nom}</span>
        <button type="button" onClick={() => void handleSignOut()}>Déconnexion</button>
      </div>
      <div className="auth-local-warning" role="status">La connexion et votre atelier sont enregistrés sur le serveur. Les modules métier sont encore en cours de synchronisation : n'enregistrez pas encore de données réelles dans YÉRÉ.</div>
      {children}
    </>
  );
}
