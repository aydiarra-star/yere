import { useEffect, useState, type FormEvent } from "react";
import {
  createMarketplaceReview, getMarketplaceReviewForOrder, getMarketplaceSellerType,
  listMarketplaceSellerReviews, replyToMarketplaceReview, reportMarketplaceReview,
  summarizeMarketplaceReviews, type MarketplaceOrder, type MarketplaceReview, type MarketplaceSeller,
} from "./lib/marketplace";
import type { YereSession } from "./lib/supabaseAuth";
import "./marketplace-reviews.css";

const criteriaFor = (type: MarketplaceSeller["sellerType"]) => type === "atelier"
  ? [
      ["couture", "Qualité de la couture"],
      ["mensurations", "Respect des mensurations"],
      ["finitions", "Finitions et détails"],
      ["delais", "Respect des délais"],
      ["communication", "Accueil et communication"],
    ]
  : [
      ["qualite", "Qualité des produits"],
      ["conformite", "Conformité à l'annonce"],
      ["disponibilite", "Disponibilité"],
      ["livraison", "Préparation et livraison"],
      ["communication", "Communication"],
    ];

function Stars({ value, onChange, label }: { value: number; onChange?: (value: number) => void; label: string }) {
  return <div className="pm-review-stars" role={onChange ? "group" : "img"} aria-label={label}>
    {[1, 2, 3, 4, 5].map((star) => onChange
      ? <button key={star} type="button" aria-label={`${star} étoile(s)`} aria-pressed={value === star} className={star <= value ? "is-filled" : ""} onClick={() => onChange(star)}>★</button>
      : <span key={star} className={star <= value ? "is-filled" : ""}>★</span>)}
  </div>;
}

export function MarketplaceSellerReviews({ sellerId, sellerType, session }: {
  sellerId: string; sellerType: MarketplaceSeller["sellerType"]; session: YereSession | null;
}) {
  const [reviews, setReviews] = useState<MarketplaceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reported, setReported] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    void listMarketplaceSellerReviews(sellerId).then((items) => {
      if (active) { setReviews(items); setError(""); }
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Les avis ne sont pas disponibles.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sellerId]);
  const summary = summarizeMarketplaceReviews(reviews);
  return <section className="pm-reviews" aria-label="Avis clients du vendeur">
    <div className="pm-reviews-heading">
      <div><span className="pm-eyebrow">RÉPUTATION DU VENDEUR</span><h3>Avis des clients</h3></div>
      <div className="pm-review-summary"><strong>{summary.count ? summary.average.toFixed(1).replace(".", ",") : "—"}/5</strong><Stars value={Math.round(summary.average)} label={`Note moyenne ${summary.average} sur 5`}/><small>{summary.count} avis vérifié{summary.count > 1 ? "s" : ""}</small></div>
    </div>
    {loading ? <p className="pm-review-muted">Chargement des avis…</p> : error ? <p className="pm-review-error">{error}</p> : reviews.length === 0
      ? <p className="pm-review-muted">Ce vendeur n'a pas encore reçu d'avis vérifié. Les avis apparaîtront après des commandes livrées.</p>
      : <div className="pm-review-list">{reviews.map((review) => <article className="pm-review-card" key={review.id}>
        <div className="pm-review-card-top"><Stars value={review.rating} label={`${review.rating} étoiles sur 5`}/><small>{new Date(review.createdAt).toLocaleDateString("fr-FR")}</small></div>
        <div className="pm-review-criteria">{criteriaFor(sellerType).filter(([key]) => review.criteria[key] !== undefined).map(([key, label]) => <span key={key}>{label} : <b>{review.criteria[key]}/5</b></span>)}</div>
        {review.comment && <p className="pm-review-comment">{review.comment}</p>}
        {review.sellerReply && <div className="pm-review-reply"><b>Réponse du vendeur</b><p>{review.sellerReply}</p></div>}
        {session && !reported.includes(review.id) && <button className="pm-review-report" type="button" onClick={() => void reportMarketplaceReview(session, review.id).then(() => setReported((current) => [...current, review.id])).catch((cause) => setError(cause instanceof Error ? cause.message : "Signalement impossible."))}>Signaler cet avis</button>}
        {reported.includes(review.id) && <small className="pm-review-muted">Signalement transmis à l'équipe YÉRÉ.</small>}
      </article>)}</div>}
  </section>;
}

export function MarketplaceOrderReview({ order, session, isSeller, sellerType: initialSellerType }: {
  order: MarketplaceOrder; session: YereSession; isSeller: boolean; sellerType?: MarketplaceSeller["sellerType"];
}) {
  const [review, setReview] = useState<MarketplaceReview | null>(null);
  const [sellerType, setSellerType] = useState<MarketplaceSeller["sellerType"]>(initialSellerType ?? "fournisseur");
  const [rating, setRating] = useState(5);
  const [criteria, setCriteria] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (order.status !== "livree") return;
    let active = true;
    void Promise.all([
      getMarketplaceReviewForOrder(session, order.id),
      initialSellerType ? Promise.resolve(initialSellerType) : getMarketplaceSellerType(session, order.sellerId),
    ]).then(([existing, kind]) => {
      if (!active) return;
      setReview(existing);
      setSellerType(kind);
      setReply(existing?.sellerReply ?? "");
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Impossible de charger l'avis de cette commande.");
    });
    return () => { active = false; };
  }, [order.id, order.status, order.sellerId, session, initialSellerType]);
  if (order.status !== "livree") return null;
  const isBuyer = order.buyerUserId === session.user.id && !isSeller;
  if (!isBuyer && !isSeller) return null;
  const criteriaList = criteriaFor(sellerType);
  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      await createMarketplaceReview(session, { orderId: order.id, sellerId: order.sellerId, rating,
        criteria: Object.fromEntries(criteriaList.map(([key]) => [key, criteria[key] ?? 5])), comment });
      setReview(await getMarketplaceReviewForOrder(session, order.id));
      setNotice("Merci ! Votre avis vérifié a été publié.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Votre avis n'a pas pu être enregistré."); }
    finally { setBusy(false); }
  }
  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!review) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await replyToMarketplaceReview(session, review.id, reply);
      setReview(await getMarketplaceReviewForOrder(session, order.id));
      setNotice("Votre réponse a été publiée.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Votre réponse n'a pas pu être enregistrée."); }
    finally { setBusy(false); }
  }
  return <div className="pm-order-review">
    <span className="pm-eyebrow">{isSeller ? "AVIS CLIENT SUR CETTE COMMANDE" : "VOTRE RETOUR COMPTE"}</span>
    {error && <p className="pm-review-error" role="alert">{error}</p>}
    {notice && <p className="pm-review-success" role="status">{notice}</p>}
    {!review && isBuyer && <form onSubmit={submitReview} className="pm-review-form">
      <label>Votre note globale</label><Stars value={rating} onChange={setRating} label="Choisir une note de 1 à 5 étoiles"/>
      <div className="pm-review-form-criteria">{criteriaList.map(([key, label]) => <label key={key}>{label}<select value={criteria[key] ?? 5} onChange={(event) => setCriteria((current) => ({ ...current, [key]: Number(event.target.value) }))}>{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></label>)}</div>
      <label>Votre commentaire (facultatif)<textarea maxLength={1200} rows={3} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Racontez votre expérience avec ce vendeur…"/></label>
      <button className="pm-cta" type="submit" disabled={busy}>{busy ? "Publication…" : "Publier mon avis vérifié"}</button>
    </form>}
    {review && <div className="pm-order-review-existing"><Stars value={review.rating} label={`Votre note : ${review.rating} sur 5`}/>{review.comment && <p>{review.comment}</p>}{review.sellerReply && <div className="pm-review-reply"><b>Réponse du vendeur</b><p>{review.sellerReply}</p></div>}</div>}
    {review && isSeller && <form className="pm-review-reply-form" onSubmit={submitReply}><label>Votre réponse publique<textarea rows={3} maxLength={1200} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Répondez avec courtoisie à votre client…"/></label><button className="pm-outline" type="submit" disabled={busy || !reply.trim()}>{busy ? "Enregistrement…" : review.sellerReply ? "Modifier ma réponse" : "Répondre à l'avis"}</button></form>}
    {!review && isSeller && <p className="pm-review-muted">Aucun avis publié pour cette commande pour le moment.</p>}
  </div>;
}
