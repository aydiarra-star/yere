import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { clearSession, consumeAuthCallback, createAtelier, listMyAteliers, readSession, refreshSession, requestPasswordRecovery, signIn, signOut, signUp, supabaseReady, updatePassword, type YereSession } from "./lib/supabaseAuth";
import { acceptAtelierInvitation, declineAtelierInvitation, listMyAtelierInvitations, type AtelierInvitation } from "./lib/atelierTeam";
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
  const [workspaces, setWorkspaces] = useState<Atelier[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<AtelierInvitation[]>([]);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"login" | "signup" | "recovery">("login");
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [atelierName, setAtelierName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadWorkspace(activeSession: YereSession) {
    const [workspaces, invitations] = await Promise.all([
      listMyAteliers(activeSession), listMyAtelierInvitations(activeSession)
    ]);
    setWorkspaces(workspaces);
    setPendingInvitations(invitations.filter((item) =>
      item.email.toLowerCase() === (activeSession.user.email ?? "").toLowerCase()
      && !item.declinedAt
      && new Date(item.expiresAt).getTime() > Date.now()
    ));
    const savedAtelierId = window.sessionStorage.getItem("yere-active-atelier");
    const selectedAtelier = workspaces.find((item) => item.id === savedAtelierId) ?? workspaces[0];
    if (selectedAtelier) {
      seedLocalProfile(activeSession.user.id, selectedAtelier);
      setAtelier(selectedAtelier);
    } else {
      window.sessionStorage.removeItem("yere-active-atelier");
      setAtelier(null);
    }
  }

  async function refreshInvitationInbox() {
    if (!session) return;
    try {
      const invitations = await listMyAtelierInvitations(session);
      setPendingInvitations(invitations.filter((item) =>
        item.email.toLowerCase() === (session.user.email ?? "").toLowerCase()
        && !item.declinedAt
        && new Date(item.expiresAt).getTime() > Date.now()
      ));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d’actualiser les invitations reçues.");
    }
  }

  async function declineInvitation(invitation: AtelierInvitation) {
    if (!session) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await declineAtelierInvitation(session, invitation.id);
      setPendingInvitations((current) => current.filter((item) => item.id !== invitation.id));
      setMessage("Invitation refusée. L’atelier qui vous a invité ne pourra plus utiliser cette invitation.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de refuser cette invitation.");
    } finally { setBusy(false); }
  }

  async function acceptInvitation(invitation: AtelierInvitation) {
    if (!session) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const atelierId = await acceptAtelierInvitation(session, invitation.id);
      const workspaces = await listMyAteliers(session);
      setWorkspaces(workspaces);
      const accepted = workspaces.find((item) => item.id === atelierId);
      if (!accepted) throw new Error("Invitation acceptée, mais l’atelier n’est pas encore accessible. Reconnectez-vous.");
      seedLocalProfile(session.user.id, accepted);
      setAtelier(accepted);
      setPendingInvitations((current) => current.filter((item) => item.id !== invitation.id));
      setMessage("Vous avez rejoint l’atelier " + accepted.nom + ".");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d’accepter cette invitation.");
    } finally { setBusy(false); }
  }

  useEffect(() => {
    let active = true;
    async function initialize() {
      if (!supabaseReady) { setReady(true); return; }
      try {
        const recoveryCallback = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type") === "recovery";
        if (recoveryCallback) setPasswordRecovery(true);
        const callbackSession = await consumeAuthCallback();
        const saved = callbackSession ?? readSession();
        if (!saved) { setReady(true); return; }
        const current = saved.expires_at * 1000 <= Date.now() + 60_000 ? await refreshSession(saved) : saved;
        if (!active) return;
        setSession(current);
        await loadWorkspace(current);
      } catch (cause) {
        clearSession();
        if (active) {
          setSession(null); setAtelier(null);
          setError(cause instanceof Error ? cause.message : "La confirmation du compte a échoué. Demandez un nouveau lien.");
        }
      } finally {
        if (active) setReady(true);
      }
    }
    void initialize();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    const refresh = () => {
      if (document.visibilityState !== "hidden") {
        void listMyAtelierInvitations(session).then((invitations) => {
          if (!active) return;
          setPendingInvitations(invitations.filter((item) =>
            item.email.toLowerCase() === (session.user.email ?? "").toLowerCase()
            && !item.declinedAt
            && new Date(item.expiresAt).getTime() > Date.now()
          ));
        }).catch((cause) => {
          if (active) setError(cause instanceof Error ? cause.message : "Impossible d’actualiser les invitations reçues.");
        });
      }
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [session]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "recovery") {
        await requestPasswordRecovery(email.trim().toLowerCase());
        setMessage("Si un compte YÉRÉ correspond à cette adresse, un lien de récupération sera envoyé. Vérifiez aussi vos courriers indésirables.");
      } else if (mode === "signup") {
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

  async function submitNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setError(""); setMessage("");
    if (newPassword.length < 8) { setError("Le nouveau mot de passe doit contenir au moins 8 caractères."); return; }
    if (newPassword !== confirmPassword) { setError("Les deux mots de passe ne correspondent pas."); return; }
    setBusy(true);
    try {
      await updatePassword(session, newPassword);
      setPasswordRecovery(false);
      setNewPassword(""); setConfirmPassword(""); setPassword("");
      setMessage("Votre mot de passe a été modifié. Vous êtes connecté à YÉRÉ.");
      await loadWorkspace(session);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de modifier le mot de passe. Demandez un nouveau lien.");
    } finally { setBusy(false); }
  }

  async function submitAtelier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setBusy(true); setError("");
    try {
      const id = await createAtelier(session, { nom: atelierName.trim(), telephone: phone.trim(), ville: city.trim() });
      const workspaces = await listMyAteliers(session);
      setWorkspaces(workspaces);
      const created = workspaces.find((item) => item.id === id);
      if (!created) throw new Error("Atelier créé, mais impossible de le relire avec les droits du compte. Contactez l'assistance avant de poursuivre.");
      seedLocalProfile(session.user.id, created);
      setAtelier(created);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Création de l'atelier impossible.");
    } finally { setBusy(false); }
  }

  function switchAtelier(nextAtelierId: string) {
    if (!session) return;
    const nextAtelier = workspaces.find((item) => item.id === nextAtelierId);
    if (!nextAtelier || nextAtelier.id === atelier?.id) return;
    seedLocalProfile(session.user.id, nextAtelier);
    window.location.reload();
  }

  async function handleSignOut() {
    if (session) await signOut(session);
    setSession(null); setAtelier(null); setWorkspaces([]); setMessage(""); setError("");
  }

  if (!ready) return <main className="auth-loading"><span className="auth-mark">Y</span><p>Préparation de votre espace YÉRÉ…</p></main>;

  if (!supabaseReady) return <main className="auth-shell"><section className="auth-card"><span className="auth-mark">Y</span><p className="eyebrow">YÉRÉ · ATELIER</p><h1>Connexion indisponible</h1><p>La configuration Supabase manque sur ce déploiement. Aucun compte ne peut être créé pour le moment.</p></section></main>;

  if (passwordRecovery && session) return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand"><span className="auth-mark">Y</span><span><strong>YÉRÉ</strong><small>ATELIER</small></span></div>
        <p className="eyebrow">SÉCURITÉ DU COMPTE</p>
        <h1>Choisissez un nouveau mot de passe.</h1>
        <p className="auth-intro">Créez un mot de passe d’au moins 8 caractères pour retrouver votre espace YÉRÉ.</p>
        <form className="auth-form" onSubmit={submitNewPassword}>
          <label>Nouveau mot de passe<input type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="8 caractères minimum" /></label>
          <label>Confirmer le mot de passe<input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Saisissez-le à nouveau" /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="primary-button auth-submit" disabled={busy} type="submit">{busy ? "Modification en cours…" : "Enregistrer le nouveau mot de passe"} <span>→</span></button>
        </form>
        <p className="auth-footnote">Ce lien de récupération est temporaire et ne doit être partagé avec personne.</p>
      </section>
    </main>
  );

  if (!session) return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand"><span className="auth-mark">Y</span><span><strong>YÉRÉ</strong><small>ATELIER</small></span></div>
        <p className="eyebrow">VOTRE ESPACE PROFESSIONNEL</p>
        <h1>{mode === "login" ? "Heureux de vous retrouver." : mode === "recovery" ? "Récupérez votre accès." : "Créez votre compte YÉRÉ."}</h1>
        <p className="auth-intro">Un espace de travail sécurisé pour organiser votre activité de tailleur.</p>
        <form className="auth-form" onSubmit={submitAuth}>
          <label>Adresse e-mail<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@exemple.com" /></label>
          {mode !== "recovery" && <label>Mot de passe<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8 caractères minimum" /></label>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="auth-message" role="status">{message}</p>}
          <button className="primary-button auth-submit" disabled={busy} type="submit">{busy ? "Veuillez patienter…" : mode === "login" ? "Se connecter" : mode === "recovery" ? "Envoyer le lien de récupération" : "Créer mon compte"} <span>→</span></button>
        </form>
        <>{mode === "login" && <p className="auth-recovery-link"><button type="button" onClick={() => { setMode("recovery"); setError(""); setMessage(""); setPassword(""); }}>Mot de passe oublié ?</button></p>}<p className="auth-switch">{mode === "login" ? "Vous n'avez pas encore de compte ?" : mode === "recovery" ? "Vous vous souvenez de votre mot de passe ?" : "Vous avez déjà un compte ?"} <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}>{mode === "login" ? "Créer un compte" : "Se connecter"}</button></p></>
        <p className="auth-footnote">Votre compte est protégé par Supabase Auth. Ne partagez jamais votre mot de passe.</p>
      </section>
    </main>
  );

  if (!atelier) return (
    <main className="auth-shell">
      <section className="auth-card auth-workspace-card">
        {pendingInvitations.length > 0 && <div className="auth-invitation-list">
          <p className="eyebrow">INVITATIONS REÇUES</p><h2>Vous êtes invité à rejoindre un atelier.</h2>
          {pendingInvitations.map((invitation) => <article key={invitation.id} className="auth-invitation-item">
            <strong>{invitation.atelierName}</strong><span>{invitation.email} · {invitation.role === "gestionnaire" ? "Gestionnaire" : "Employé"}</span>
            <small>Expire le {new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium"}).format(new Date(invitation.expiresAt))}</small>
            <div className="auth-invitation-actions"><button className="primary-button auth-submit" type="button" disabled={busy} onClick={() => void acceptInvitation(invitation)}>{busy ? "Traitement…" : "Accepter l’invitation"}</button><button className="secondary-button" type="button" disabled={busy} onClick={() => void declineInvitation(invitation)}>Refuser</button></div>
          </article>)}
          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="auth-message" role="status">{message}</p>}
          <div className="auth-divider"><span>ou créer votre propre atelier</span></div>
        </div>}
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
        <span className="auth-session-identity"><strong>Connecté</strong> · {session.user.email}</span>
        {workspaces.length > 1 ? <label className="auth-workspace-switch"><span>Atelier actif</span><select aria-label="Choisir l’atelier actif" value={atelier.id} onChange={(event) => switchAtelier(event.target.value)}>{workspaces.map((item) => <option key={item.id} value={item.id}>{item.nom}{item.ville ? ` · ${item.ville}` : ""}</option>)}</select></label> : <span className="auth-session-workspace">{atelier.nom}</span>}
        <button type="button" onClick={() => void handleSignOut()}>Déconnexion</button>
      </div>
      <section className="auth-invitation-inbox" aria-labelledby="auth-invitation-inbox-title">
        <div className="auth-invitation-inbox-heading">
          <div><p className="eyebrow">BOÎTE DE RÉCEPTION</p><h2 id="auth-invitation-inbox-title">Invitations reçues</h2><p>Les invitations envoyées à cette adresse apparaissent ici. Aucun e-mail n’est envoyé automatiquement.</p></div>
          <button type="button" className="secondary-button" disabled={busy} onClick={() => void refreshInvitationInbox()}>Actualiser</button>
        </div>
        {pendingInvitations.length === 0 ? <p className="auth-invitation-empty">Aucune invitation en attente pour {session.user.email}.</p> : <div className="auth-invitation-cards">
          {pendingInvitations.map((item) => <article key={item.id} className="auth-invitation-item">
            <strong>{item.atelierName}</strong><span>{item.email} · {item.role === "gestionnaire" ? "Gestionnaire" : "Employé"}</span>
            <small>Invitation reçue · expire le {new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium"}).format(new Date(item.expiresAt))}</small>
            <div className="auth-invitation-actions">
              <button className="primary-button" type="button" disabled={busy} onClick={() => void acceptInvitation(item)}>{busy ? "Traitement…" : "Accepter l’invitation"}</button>
              <button className="secondary-button" type="button" disabled={busy} onClick={() => void declineInvitation(item)}>Refuser</button>
            </div>
          </article>)}
        </div>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        {message && <p className="auth-message" role="status">{message}</p>}
      </section>
      <div className="auth-local-warning" role="status">La connexion, les ateliers, les clients, les mensurations, les commandes, les versements, les dépenses, l’inventaire et les fournisseurs sont synchronisés sur le serveur. Les sauvegardes chiffrées sont opérationnelles ; leur restauration complète reste à tester. La marketplace publique est encore en développement : n’y saisissez pas de données réelles.</div>
      {children}
    </>
  );
}
