import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createMarketplaceOrder, createMarketplaceSeller, getMyMarketplaceSeller,
  listMyMarketplaceOrders, listPublicMarketplaceListings, saveMarketplaceListing,
  updateMarketplaceOrderStatus, type MarketplaceOrder, type MarketplaceSeller,
  type PublicMarketplaceListing
} from "./lib/marketplace";
import {
  consumeAuthCallback, readSession, refreshSession, signIn, signOut, signUp,
  supabaseReady, type YereSession
} from "./lib/supabaseAuth";
import "./marketplace-public.css";

const categories = ["Tout le Market", "Boubous & tenues", "Mode femme", "Tissus", "Mercerie"];
const money = (value: number) => new Intl.NumberFormat("fr-FR").format(value) + " FCFA";

export default function PublicMarket() {
  const [session, setSession] = useState<YereSession | null>(null);
  const [seller, setSeller] = useState<MarketplaceSeller | null>(null);
  const [listings, setListings] = useState<PublicMarketplaceListing[]>([]);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [category, setCategory] = useState("Tout le Market");
  const [query, setQuery] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [showAccount, setShowAccount] = useState(false);
  const [showSellerForm, setShowSellerForm] = useState(false);
  const [showListingForm, setShowListingForm] = useState(false);
  const [selectedListing, setSelectedListing] = useState<PublicMarketplaceListing | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sellerForm, setSellerForm] = useState({ businessName: "", contactName: "", phone: "", city: "", category: "Tissus & mercerie", description: "" });
  const [listingForm, setListingForm] = useState({ title: "", category: "Tissus", description: "", price: "", stock: "" });
  const [orderForm, setOrderForm] = useState({ quantity: "1", name: "", phone: "", city: "", note: "" });

  async function refreshCatalogue() {
    const items = await listPublicMarketplaceListings();
    setListings(items);
  }

  async function loadAccount(active: YereSession) {
    const [ownSeller, ownOrders] = await Promise.all([
      getMyMarketplaceSeller(active).catch((cause) => {
        // A buyer account without a seller profile is a valid state.
        const message = cause instanceof Error ? cause.message : "";
        if (/permission|marketplace_vendeur|seller/i.test(message)) return null;
        throw cause;
      }),
      listMyMarketplaceOrders(active)
    ]);
    setSeller(ownSeller);
    setOrders(ownOrders);
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (!supabaseReady) throw new Error("Le Market n’est pas encore configuré sur ce déploiement.");
        const callback = await consumeAuthCallback();
        let current = callback ?? readSession();
        if (current && current.expires_at * 1000 <= Date.now() + 60_000) current = await refreshSession(current);
        if (active && current) {
          setSession(current);
          await loadAccount(current);
        }
        await refreshCatalogue();
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Impossible de charger le Market.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const visibleListings = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("fr");
    return listings.filter((item) => {
      const categoryMatch = category === "Tout le Market" || item.category.toLocaleLowerCase("fr").includes(category.toLocaleLowerCase("fr").split(" ")[0]);
      const searchMatch = !term || [item.title, item.description, item.category, item.sellerName, item.city].join(" ").toLocaleLowerCase("fr").includes(term);
      return categoryMatch && searchMatch;
    });
  }, [listings, category, query]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const next = authMode === "login"
        ? await signIn(email.trim().toLowerCase(), password)
        : (await signUp(email.trim().toLowerCase(), password, "/market")).session;
      if (!next) {
        setNotice("Compte créé. Consultez votre e-mail pour confirmer l’adresse, puis revenez sur le Market pour vous connecter.");
        setAuthMode("login");
        return;
      }
      setSession(next);
      await loadAccount(next);
      setShowAccount(false);
      setPassword("");
      setNotice("Connexion réussie. Vous pouvez maintenant commander ou gérer votre boutique.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connexion impossible.");
    } finally { setBusy(false); }
  }

  async function handleSignOut() {
    if (!session) return;
    setBusy(true);
    try {
      await signOut(session);
      setSession(null); setSeller(null); setOrders([]);
      setNotice("Vous êtes déconnecté du Market.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Déconnexion impossible.");
    } finally { setBusy(false); }
  }

  async function submitSeller(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) { setShowAccount(true); setNotice("Connectez-vous ou créez un compte pour ouvrir votre boutique."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const created = await createMarketplaceSeller(session, {
        sellerType: "fournisseur", atelierId: null, ...sellerForm
      });
      setSeller(created);
      setShowSellerForm(false);
      setNotice("Votre boutique indépendante est créée. Vous pouvez publier votre première offre.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Création de la boutique impossible.");
    } finally { setBusy(false); }
  }

  async function submitListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !seller) return;
    const price = Number(listingForm.price);
    const stock = listingForm.stock.trim() === "" ? null : Number(listingForm.stock);
    if (!Number.isSafeInteger(price) || price <= 0 || (stock !== null && (!Number.isSafeInteger(stock) || stock < 0))) {
      setError("Vérifiez le prix et la quantité en stock.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      await saveMarketplaceListing(session, {
        sellerId: seller.id, title: listingForm.title, category: listingForm.category,
        description: listingForm.description, priceXof: price, unit: "piece",
        city: seller.city, photos: [], saleMode: "les_deux", status: "publiee", stockAvailable: stock
      });
      await refreshCatalogue();
      setShowListingForm(false);
      setListingForm({ title: "", category: "Tissus", description: "", price: "", stock: "" });
      setNotice("Votre offre est publiée dans le Market.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Publication impossible.");
    } finally { setBusy(false); }
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedListing) { setShowAccount(true); return; }
    const quantity = Number(orderForm.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1) { setError("Indiquez une quantité valide."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const id = await createMarketplaceOrder(session, {
        listingId: selectedListing.id, quantity, buyerName: orderForm.name.trim(),
        buyerPhone: orderForm.phone.trim(), deliveryCity: orderForm.city.trim(), buyerNote: orderForm.note.trim()
      });
      const ownOrders = await listMyMarketplaceOrders(session);
      setOrders(ownOrders);
      setSelectedListing(null);
      setNotice("Commande enregistrée. Référence : " + id);
      await refreshCatalogue();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "La commande n’a pas été enregistrée.");
    } finally { setBusy(false); }
  }

  async function moveOrder(order: MarketplaceOrder, status: MarketplaceOrder["status"]) {
    if (!session) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await updateMarketplaceOrderStatus(session, order.id, status);
      setOrders(await listMyMarketplaceOrders(session));
      setNotice("Statut de commande actualisé.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Mise à jour impossible.");
    } finally { setBusy(false); }
  }

  return (
    <main className="public-market">
      <header className="pm-header">
        <a className="pm-brand" href="/market" aria-label="YÉRÉ Market, accueil"><span className="pm-mark">Y</span><span><b>YÉRÉ</b><small>MARKET</small></span></a>
        <nav className="pm-nav"><a href="#catalogue">Catalogue</a><a href="#vendeurs">Vendeurs</a>{session && <a href="#commandes">Mes commandes</a>}</nav>
        <div className="pm-header-actions">
          {session ? <><span className="pm-user">{session.user.email}</span><button className="pm-outline" type="button" onClick={() => void handleSignOut()} disabled={busy}>Déconnexion</button></> :
            <button className="pm-outline" type="button" onClick={() => { setShowAccount((v) => !v); setError(""); }}>Se connecter</button>}
          <a className="pm-cta" href="#vendeurs">Vendre sur YÉRÉ</a>
        </div>
      </header>

      <section className="pm-hero">
        <div className="pm-hero-copy"><span className="pm-eyebrow">LE MARCHÉ DE LA COUTURE</span><h1>La mode et la mercerie<br/><em>à portée de main.</em></h1><p>Découvrez les créations des ateliers, trouvez tissus et fournitures, et échangez directement avec les vendeurs.</p><a className="pm-hero-button" href="#catalogue">Explorer le catalogue <span>→</span></a><div className="pm-hero-trust"><span>✦ Créations & tenues</span><span>✦ Tissus & mercerie</span><span>✦ Vendeurs indépendants</span></div></div>
        <div className="pm-hero-art" aria-hidden="true"><div className="pm-art-circle"></div><div className="pm-art-card pm-art-card-one"><span>YÉRÉ</span><b>Le savoir-faire<br/>à l’honneur</b><small>MODE · TISSUS · MERCERIE</small></div><div className="pm-art-card pm-art-card-two"><span>✦</span><b>Créé avec soin</b><small>PAR LES ARTISANS</small></div></div>
      </section>

      {showAccount && <section className="pm-panel pm-account-panel"><div><span className="pm-eyebrow">ESPACE CLIENT</span><h2>{authMode === "login" ? "Heureux de vous retrouver." : "Créer un compte Market"}</h2><p>Un compte est nécessaire pour passer commande et retrouver vos achats. Aucun atelier n’est requis.</p></div><form onSubmit={submitAuth}><label>E-mail<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>Mot de passe<input type="password" minLength={8} required autoComplete={authMode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} /></label><button className="pm-cta" disabled={busy}>{busy ? "Veuillez patienter…" : authMode === "login" ? "Se connecter" : "Créer mon compte"}</button><button type="button" className="pm-text-button" onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>{authMode === "login" ? "Créer un compte" : "J’ai déjà un compte"}</button></form></section>}

      {error && <p className="pm-alert pm-error" role="alert">{error}</p>}
      {notice && <p className="pm-alert pm-notice" role="status">{notice}</p>}

      <section id="catalogue" className="pm-catalogue">
        <div className="pm-section-heading"><div><span className="pm-eyebrow">LA SÉLECTION YÉRÉ</span><h2>Explorez le Market</h2><p>Des offres publiées par des vendeurs inscrits sur YÉRÉ.</p></div><label className="pm-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un article, une ville…" /></label></div>
        <div className="pm-categories">{categories.map((item) => <button key={item} type="button" className={category === item ? "is-active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
        {loading ? <div className="pm-empty">Chargement du catalogue…</div> : visibleListings.length === 0 ? <div className="pm-empty"><span>✦</span><h3>Le catalogue se construit.</h3><p>Aucune annonce publiée ne correspond pour le moment. Revenez bientôt ou ouvrez votre boutique pour proposer vos articles.</p><a href="#vendeurs">Devenir vendeur →</a></div> :
          <div className="pm-products">{visibleListings.map((item) => <article className="pm-product" key={item.id}><div className="pm-product-art"><span>{item.category.toLowerCase().includes("tissu") ? "TISSUS" : item.category.toUpperCase()}</span><b>Y</b></div><div className="pm-product-copy"><small>{item.category}</small><h3>{item.title}</h3><p>{item.description || "Une offre proposée par un vendeur YÉRÉ."}</p><strong>{money(item.priceXof)}</strong><div className="pm-product-meta"><span>{item.sellerName}</span><span>{item.city || item.sellerCity}</span></div><button type="button" className="pm-buy" onClick={() => { setSelectedListing(item); setError(""); if (!session) setShowAccount(true); }}>Commander <span>→</span></button></div></article>)}</div>}
      </section>

      <section id="vendeurs" className="pm-seller-section">
        <div className="pm-seller-copy"><span className="pm-eyebrow">VOUS ÊTES FOURNISSEUR ?</span><h2>Votre boutique mérite<br/>sa place sur YÉRÉ.</h2><p>Créez votre vitrine indépendante, publiez vos tissus, fournitures et accessoires. Vous n’avez pas besoin de posséder un atelier de couture.</p><ul><li>Une boutique rattachée à votre compte</li><li>Des annonces visibles dans le catalogue public</li><li>Des commandes regroupées dans votre espace</li></ul></div>
        <div className="pm-seller-card"><span className="pm-seller-icon">✦</span><h3>{seller ? "Votre boutique est prête" : "Ouvrir une boutique"}</h3><p>{seller ? seller.businessName + " · " + seller.city : "Inscrivez-vous ou connectez-vous, puis renseignez les informations de votre activité."}</p>{seller ? <button className="pm-cta" type="button" onClick={() => setShowListingForm((v) => !v)}>＋ Publier une offre</button> : <button className="pm-cta" type="button" onClick={() => { setShowSellerForm((v) => !v); if (!session) setShowAccount(true); }}>Créer ma boutique indépendante</button>}</div>
      </section>

      {showSellerForm && !seller && <section className="pm-panel"><div><span className="pm-eyebrow">INSCRIPTION VENDEUR</span><h2>Les informations de votre boutique</h2><p>Votre compte Market reste indépendant de tout atelier.</p></div><form onSubmit={submitSeller}><label>Nom de la boutique<input required maxLength={120} value={sellerForm.businessName} onChange={(e) => setSellerForm({ ...sellerForm, businessName: e.target.value })}/></label><label>Nom du responsable<input required maxLength={120} value={sellerForm.contactName} onChange={(e) => setSellerForm({ ...sellerForm, contactName: e.target.value })}/></label><label>Téléphone<input required type="tel" maxLength={40} value={sellerForm.phone} onChange={(e) => setSellerForm({ ...sellerForm, phone: e.target.value })}/></label><label>Ville<input required maxLength={100} value={sellerForm.city} onChange={(e) => setSellerForm({ ...sellerForm, city: e.target.value })}/></label><label>Activité<select value={sellerForm.category} onChange={(e) => setSellerForm({ ...sellerForm, category: e.target.value })}><option>Tissus & mercerie</option><option>Fournitures de couture</option><option>Accessoires de mode</option><option>Prêt-à-porter</option></select></label><label className="pm-wide">Présentation<textarea maxLength={500} value={sellerForm.description} onChange={(e) => setSellerForm({ ...sellerForm, description: e.target.value })}/></label><button className="pm-cta" disabled={busy || !session}>{busy ? "Création…" : "Créer ma boutique"}</button></form></section>}

      {showListingForm && seller && <section className="pm-panel"><div><span className="pm-eyebrow">NOUVELLE ANNONCE</span><h2>Publier une offre</h2><p>Les annonces sont immédiatement visibles après validation par la base.</p></div><form onSubmit={submitListing}><label>Nom de l’article<input required maxLength={140} value={listingForm.title} onChange={(e) => setListingForm({ ...listingForm, title: e.target.value })}/></label><label>Catégorie<select value={listingForm.category} onChange={(e) => setListingForm({ ...listingForm, category: e.target.value })}><option>Boubous & tenues</option><option>Mode femme</option><option>Tissus</option><option>Mercerie</option><option>Fournitures de couture</option></select></label><label>Prix (FCFA)<input type="number" min="1" step="1" required value={listingForm.price} onChange={(e) => setListingForm({ ...listingForm, price: e.target.value })}/></label><label>Stock (facultatif)<input type="number" min="0" step="1" value={listingForm.stock} onChange={(e) => setListingForm({ ...listingForm, stock: e.target.value })}/></label><label className="pm-wide">Description<textarea maxLength={1000} value={listingForm.description} onChange={(e) => setListingForm({ ...listingForm, description: e.target.value })}/></label><p className="pm-form-note pm-wide">Les photos et le paiement en ligne seront activés après raccordement et vérification du stockage sécurisé. Ne publiez pas de données personnelles dans la description.</p><button className="pm-cta" disabled={busy}>{busy ? "Publication…" : "Publier dans le Market"}</button></form></section>}

      {selectedListing && <div className="pm-modal-backdrop" role="presentation" onClick={() => setSelectedListing(null)}><section className="pm-modal" role="dialog" aria-modal="true" aria-labelledby="pm-order-title" onClick={(e) => e.stopPropagation()}><button className="pm-modal-close" type="button" onClick={() => setSelectedListing(null)} aria-label="Fermer">×</button><span className="pm-eyebrow">PASSER COMMANDE</span><h2 id="pm-order-title">{selectedListing.title}</h2><p>{money(selectedListing.priceXof)} · {selectedListing.sellerName}</p>{session ? <form onSubmit={submitOrder}><label>Quantité<input required type="number" min="1" step="1" value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}/></label><label>Votre nom<input required maxLength={120} value={orderForm.name} onChange={(e) => setOrderForm({ ...orderForm, name: e.target.value })}/></label><label>Téléphone<input required type="tel" maxLength={40} value={orderForm.phone} onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })}/></label><label>Ville de livraison<input value={orderForm.city} maxLength={100} onChange={(e) => setOrderForm({ ...orderForm, city: e.target.value })}/></label><label>Note (facultative)<textarea maxLength={500} value={orderForm.note} onChange={(e) => setOrderForm({ ...orderForm, note: e.target.value })}/></label><button className="pm-cta" disabled={busy}>{busy ? "Enregistrement…" : "Confirmer la commande"}</button></form> : <p>Connectez-vous ou créez un compte pour commander. Aucun atelier n’est nécessaire.</p>}</section></div>}

      {session && <section id="commandes" className="pm-orders"><div className="pm-section-heading"><div><span className="pm-eyebrow">VOTRE ESPACE</span><h2>Commandes & suivi</h2><p>Vos achats et les commandes reçues par votre boutique.</p></div></div>{orders.length === 0 ? <div className="pm-empty">Aucune commande pour le moment.</div> : <div className="pm-order-list">{orders.map((order) => <article className="pm-order" key={order.id}><div><b>{order.reference}</b><span>{order.buyerName} · {order.quantity} article(s)</span><small>{new Date(order.createdAt).toLocaleDateString("fr-FR")}</small></div><strong>{money(order.totalXof)}</strong><span className="pm-order-status">{order.status}</span>{seller?.id === order.sellerId && <select aria-label={"Statut de la commande " + order.reference} value={order.status} disabled={busy} onChange={(e) => void moveOrder(order, e.target.value as MarketplaceOrder["status"])}><option value="recue">Reçue</option><option value="acceptee">Acceptée</option><option value="preparee">Préparée</option><option value="expediee">Expédiée</option><option value="livree">Livrée</option><option value="annulee">Annulée</option></select>}</article>)}</div>}</section>}

      <footer className="pm-footer"><a className="pm-brand" href="/market"><span className="pm-mark">Y</span><span><b>YÉRÉ</b><small>MARKET</small></span></a><p>Le marché qui rapproche les artisans, les vendeurs et les passionnés de couture.</p><a href="/">Espace Atelier →</a></footer>
    </main>
  );
}
