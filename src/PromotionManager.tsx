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
  const [occasion, setOccasion] = useState("");
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
      <label>Occasion<select value={occasion} onChange={(event) => { setOccasion(event.target.value); if (event.target.value) setTitle((current) => current || event.target.value); }}><option value="">Choisir une occasion (facultatif)</option><option value="Tabaski">Tabaski</option><option value="Korité">Korité</option><option value="Fête des mères">Fête des mères</option><option value="Rentrée">Rentrée</option><option value="Fin de mois">Fin de mois</option><option value="Offre spéciale">Autre occasion</option></select></label>
      <label>Nom de l’offre<input required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Offre spéciale Tabaski" /></label>
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
          {expanded && <div className="promotion-recipients"><div className="promotion-recipients-heading"><div><h4>Clients à contacter</h4><p>Chaque client a son propre bouton. Le message est préparé ; vous gardez la main sur l’envoi.</p></div><span>{contacts.length} client(s)</span></div>
            {contacts.map((contact) => {
              const client = clients.find((item) => item.id === contact.clientId);
              if (!client) return <p key={contact.clientId} className="promotion-hint">Un client de cette campagne n’est plus présent dans le répertoire.</p>;
              const text = personalizedMessage(promotion.message, client, promotion);
              const number = internationalPhone(client.phone);
              const link = number ? "https://wa.me/" + number + "?text=" + encodeURIComponent(text) : null;
              return <div className="promotion-recipient" key={contact.clientId}>
                <div><b>{client.name}</b><small>{client.phone || "Téléphone non renseigné"}</small></div>
                <div className="promotion-recipient-actions">
                  {link ? <a className="whatsapp-contact-button" href={link} target="_blank" rel="noreferrer" aria-label={"Ouvrir WhatsApp pour contacter " + client.name}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M20.52 3.48A11.82 11.82 0 0 0 12.08 0C5.5 0 .15 5.35.15 11.93c0 2.1.55 4.15 1.6 5.96L.05 24l6.27-1.64a11.9 11.9 0 0 0 5.76 1.47h.01c6.58 0 11.93-5.35 11.93-11.93 0-3.19-1.24-6.19-3.5-8.42ZM12.09 21.8a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.72.98.99-3.63-.24-.37a9.85 9.85 0 1 1 8.37 4.61Zm5.41-7.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.21 5.09 4.5.71.31 1.27.5 1.7.64.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.08-.12-.27-.2-.57-.35Z"/></svg><span>Contacter sur WhatsApp</span></a> : <span className="whatsapp-missing-number">Numéro à compléter avec l’indicatif du pays (+221, +33…).</span>}
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
