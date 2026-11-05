import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Client, Order } from "./domain";
import { authenticatedFetch, readSession } from "./lib/supabaseAuth";

type ContactStatus = "a_contacter" | "contacte" | "interesse" | "commande";
type Contact = { clientId: string; status: ContactStatus; contactedAt?: string };
type Promotion = {
  id: string; titre: string; type_remise: "pourcentage" | "montant"; valeur: number;
  date_debut: string; date_fin: string; message: string; cible: "tous" | "anciens" | "inactifs";
  suivi: Contact[]; created_at: string;
};

async function responseData(response: Response): Promise<unknown> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = data as Record<string, unknown>;
    throw new Error(String(error.message ?? error.details ?? error.hint ?? "Erreur serveur."));
  }
  return data;
}
function discountLabel(p: Pick<Promotion, "type_remise" | "valeur">): string {
  return p.type_remise === "pourcentage" ? p.valeur + "% de réduction"
    : new Intl.NumberFormat("fr-FR").format(p.valeur) + " FCFA de réduction";
}
function personalizedMessage(template: string, client: Client, promotion: Promotion): string {
  const end = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(promotion.date_fin + "T12:00:00"));
  return template.split("{nom}").join(client.name).split("{offre}").join(promotion.titre)
    .split("{remise}").join(discountLabel(promotion)).split("{date_fin}").join(end);
}
function internationalPhone(phone: string): string | null {
  const value = phone.trim();
  if (!value.startsWith("+") && !value.startsWith("00")) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export default function PromotionManager({ clients, orders, canManage }: { clients: Client[]; orders: Order[]; canManage: boolean }) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [discountType, setDiscountType] = useState<"pourcentage" | "montant">("pourcentage");
  const [discountValue, setDiscountValue] = useState("20");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [audience, setAudience] = useState<"tous" | "anciens" | "inactifs">("tous");
  const [message, setMessage] = useState("Bonjour {nom} ! Profitez de notre offre {offre} : {remise} sur vos nouvelles commandes jusqu’au {date_fin}. Contactez-nous pour préparer votre prochaine tenue. À bientôt !");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const session = readSession();
  const atelierId = typeof window !== "undefined" ? window.sessionStorage.getItem("yere-active-atelier") : null;

  const audienceClients = useMemo(() => {
    if (audience === "tous") return clients;
    const cutoff = new Date(Date.now() - (audience === "anciens" ? 90 : 180) * 86400000).toISOString().slice(0, 10);
    const latestByClient = new Map<string, string>();
    for (const order of orders) {
      if (!order.orderedAt) continue;
      const previous = latestByClient.get(order.clientId);
      if (!previous || order.orderedAt > previous) latestByClient.set(order.clientId, order.orderedAt);
    }
    return clients.filter((client) => {
      const lastOrder = latestByClient.get(client.id);
      return Boolean(lastOrder && lastOrder <= cutoff);
    });
  }, [clients, orders, audience]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!session || !atelierId || !canManage) { setPromotions([]); setLoading(false); return; }
      try {
        const response = await authenticatedFetch(session, "rest/v1/atelier_promotion?select=id,titre,type_remise,valeur,date_debut,date_fin,message,cible,suivi,created_at&atelier_id=eq." + encodeURIComponent(atelierId) + "&order=created_at.desc");
        const data = await responseData(response);
        if (active) setPromotions(Array.isArray(data) ? data as Promotion[] : []);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Impossible de charger les promotions.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [canManage, atelierId, session?.user.id]);

  async function createPromotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(discountValue);
    if (!session || !atelierId) { setError("Reconnectez-vous à votre atelier."); return; }
    if (!canManage) { setError("Action réservée au propriétaire et au gestionnaire."); return; }
    if (!title.trim() || !Number.isSafeInteger(value) || value <= 0
      || (discountType === "pourcentage" && value > 100) || endDate < startDate || audienceClients.length === 0) {
      setError("Vérifiez le titre, la réduction, les dates et les clients concernés."); return;
    }
    setBusy(true); setError("");
    try {
      const response = await authenticatedFetch(session, "rest/v1/atelier_promotion?select=id,titre,type_remise,valeur,date_debut,date_fin,message,cible,suivi,created_at", {
        method: "POST", headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          atelier_id: atelierId, titre: title.trim(), type_remise: discountType, valeur: value,
          date_debut: startDate, date_fin: endDate, message: message.trim(), cible: audience,
          suivi: audienceClients.map((client) => ({ clientId: client.id, status: "a_contacter" }))
        })
      });
      const data = await responseData(response);
      const created = Array.isArray(data) ? data[0] as Promotion | undefined : undefined;
      if (!created?.id) throw new Error("Le serveur n’a pas confirmé l’enregistrement.");
      setPromotions((current) => [created, ...current]);
      setTitle(""); setExpandedId(created.id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Promotion non enregistrée."); }
    finally { setBusy(false); }
  }

  async function updateContact(promotion: Promotion, clientId: string, status: ContactStatus) {
    if (!session || !atelierId || !canManage) return;
    const tracking = promotion.suivi.map((item) => item.clientId === clientId
      ? { ...item, status, contactedAt: status === "a_contacter" ? undefined : new Date().toISOString() }
      : item);
    setBusy(true); setError("");
    try {
      const response = await authenticatedFetch(session, "rest/v1/atelier_promotion?id=eq." + encodeURIComponent(promotion.id) + "&atelier_id=eq." + encodeURIComponent(atelierId), {
        method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ suivi: tracking })
      });
      const data = await responseData(response);
      if (!Array.isArray(data) || data.length !== 1) throw new Error("Le serveur n’a pas confirmé le suivi.");
      setPromotions((current) => current.map((item) => item.id === promotion.id ? { ...item, suivi: tracking } : item));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Suivi non enregistré."); }
    finally { setBusy(false); }
  }

  if (!canManage) return <section className="content-card promotion-panel"><h2>Promotions et offres spéciales</h2><p>La création et le suivi des campagnes sont réservés au propriétaire et au gestionnaire de l’atelier.</p></section>;

  return <section className="content-card promotion-panel" aria-labelledby="promotion-title">
    <div className="section-heading"><div><p className="eyebrow">DÉVELOPPEMENT COMMERCIAL</p><h2 id="promotion-title">Promotions et offres spéciales</h2><p>Préparez une offre, choisissez vos clients et contactez-les individuellement.</p></div><span className="promotion-count">{promotions.length} offre(s)</span></div>
    {error && <p className="promotion-error" role="alert">{error}</p>}
    <form className="promotion-form" onSubmit={createPromotion}>
      <h3>Créer une promotion</h3>
      <label>Nom de l’offre<input required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Offre spéciale du mois" /></label>
      <div className="promotion-form-grid">
        <label>Type de réduction<select value={discountType} onChange={(event) => setDiscountType(event.target.value as "pourcentage" | "montant")}><option value="pourcentage">Pourcentage</option><option value="montant">Montant fixe (FCFA)</option></select></label>
        <label>Réduction<input required type="number" min="1" max={discountType === "pourcentage" ? 100 : undefined} step="1" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} /></label>
        <label>Début de l’offre<input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label>Fin de l’offre<input required type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
      </div>
      <label>Clients concernés<select value={audience} onChange={(event) => setAudience(event.target.value as typeof audience)}><option value="tous">Tous les clients ({clients.length})</option><option value="anciens">Sans commande depuis 90 jours</option><option value="inactifs">Sans commande depuis 180 jours</option></select></label>
      <label>Message à personnaliser<textarea rows={4} maxLength={1200} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
      <p className="promotion-hint">Variables : {"{nom}"}, {"{offre}"}, {"{remise}"}, {"{date_fin}"}. Offre valable uniquement sur les nouvelles commandes pendant la période indiquée. Le propriétaire confirme et saisit le prix remisé lors de la nouvelle commande ; les commandes déjà enregistrées ne changent jamais de prix.</p>
      <div className="promotion-form-footer"><span>{audienceClients.length} client(s) ciblé(s)</span><button className="primary-button" type="submit" disabled={busy || loading}>{busy ? "Enregistrement…" : "Créer la promotion"}</button></div>
    </form>
    <div className="promotion-history"><h3>Historique des promotions</h3>
      {loading ? <p>Chargement des offres enregistrées…</p> : promotions.length === 0 ? <p>Aucune promotion créée pour le moment.</p> : promotions.map((promotion) => {
        const contacts = promotion.suivi ?? [];
        const counts = { a_contacter: 0, contacte: 0, interesse: 0, commande: 0 };
        contacts.forEach((item) => { counts[item.status] += 1; });
        const expanded = expandedId === promotion.id;
        return <article className="promotion-history-card" key={promotion.id}>
          <button type="button" className="promotion-history-toggle" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : promotion.id)}>
            <span><b>{promotion.titre}</b><small>{discountLabel(promotion)} · du {promotion.date_debut} au {promotion.date_fin}</small></span><span className="promotion-progress">{counts.commande}/{contacts.length} commande(s) <i>{expanded ? "−" : "+"}</i></span>
          </button>
          {expanded && <div className="promotion-recipients"><p className="promotion-hint">Aucun envoi automatique. Contactez uniquement les clients qui acceptent de recevoir des offres ; envoyez vous-même chaque message, puis mettez à jour le suivi.</p>
            {contacts.map((contact) => {
              const client = clients.find((item) => item.id === contact.clientId);
              if (!client) return <p key={contact.clientId} className="promotion-hint">Un client de cette campagne n’est plus présent dans le répertoire.</p>;
              const text = personalizedMessage(promotion.message, client, promotion);
              const number = internationalPhone(client.phone);
              const link = number ? "https://wa.me/" + number + "?text=" + encodeURIComponent(text) : null;
              return <div className="promotion-recipient" key={contact.clientId}>
                <div><b>{client.name}</b><small>{client.phone || "Téléphone non renseigné"}</small></div>
                <div className="promotion-recipient-actions">
                  {link ? <a className="secondary-button" href={link} target="_blank" rel="noreferrer">WhatsApp</a> : <span className="promotion-hint">Indicatif pays requis pour WhatsApp (+221, +33…).</span>}
                  {client.phone && <a className="secondary-button" href={"tel:" + client.phone.replace(/[^\d+]/g, "")}>Appeler</a>}
                  <select aria-label={"Suivi de " + client.name} disabled={busy} value={contact.status} onChange={(event) => void updateContact(promotion, client.id, event.target.value as ContactStatus)}>
                    <option value="a_contacter">À contacter</option><option value="contacte">Contacté</option><option value="interesse">Intéressé</option><option value="commande">Commande obtenue</option>
                  </select>
                  <button type="button" className="text-button" onClick={() => { if (!navigator.clipboard?.writeText) { setError("Copie indisponible : sélectionnez le message manuellement."); return; } void navigator.clipboard.writeText(text).then(() => setError("Message copié. Vérifiez-le avant de l’envoyer."), () => setError("Copie indisponible : sélectionnez le message manuellement.")); }}>Copier</button>
                </div>
                <details className="promotion-message"><summary>Voir le message personnalisé</summary><p>{text}</p></details>
              </div>;
            })}
          </div>}
        </article>;
      })}
    </div>
  </section>;
}
