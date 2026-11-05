import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createMarketplaceOrder, createMarketplaceSeller, getMyMarketplaceSeller,
  listMyMarketplaceOrders, listMyMarketplaceConversations, listMarketplaceMessages,
  openMarketplaceConversation, sendMarketplaceMessage, listPublicMarketplaceListings, saveMarketplaceListing,
  updateMarketplaceOrderStatus, uploadMarketplacePhotos, deleteMarketplacePhotos, updateMarketplaceSeller,
  type MarketplaceConversation, type MarketplaceMessage, type MarketplaceOrder, type MarketplaceSeller,
  type PublicMarketplaceListing
} from "./lib/marketplace";
import {
  consumeAuthCallback, listMyAteliers, readSession, refreshSession, signIn, signOut, signUp,
  supabaseReady, requestPasswordRecovery, updatePassword, type YereSession
} from "./lib/supabaseAuth";
import { listAtelierMembers } from "./lib/atelierTeam";
import "./marketplace-public.css";
import YereOfferSection from "./YereOfferSection";

const categories = ["Tout le Market", "Boubous & tenues", "Mode femme", "Tissus", "Mercerie"];
const money = (value: number) => new Intl.NumberFormat("fr-FR").format(value) + " FCFA";

export default function PublicMarket() {
  const [session, setSession] = useState<YereSession | null>(null);
  const [seller, setSeller] = useState<MarketplaceSeller | null>(null);
  const [atelierChoices, setAtelierChoices] = useState<Array<{ id: string; nom: string; ville: string | null }>>([]);
  const [listings, setListings] = useState<PublicMarketplaceListing[]>([]);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [conversations, setConversations] = useState<MarketplaceConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MarketplaceMessage[]>([]);
  const [contactListing, setContactListing] = useState<PublicMarketplaceListing | null>(null);
  const [pendingContactListing, setPendingContactListing] = useState<PublicMarketplaceListing | null>(null);
  const [contactMessage, setContactMessage] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [category, setCategory] = useState("Tout le Market");
  const [query, setQuery] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup" | "recovery">("login");
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showAccount, setShowAccount] = useState(false);
  const [showSellerForm, setShowSellerForm] = useState(false);
  const [showSellerEdit, setShowSellerEdit] = useState(false);
  const [sellerPhotoFile, setSellerPhotoFile] = useState<File | null>(null);
  const [showListingForm, setShowListingForm] = useState(false);
  const [selectedListing, setSelectedListing] = useState<PublicMarketplaceListing | null>(null);
  const [detailListing, setDetailListing] = useState<PublicMarketplaceListing | null>(null);
  const [detailPhotoZoomed, setDetailPhotoZoomed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sellerForm, setSellerForm] = useState({ sellerType: "fournisseur" as "fournisseur" | "atelier", atelierId: "", businessName: "", contactName: "", phone: "", city: "", category: "Tissus & mercerie", description: "" });
  const [listingForm, setListingForm] = useState({ title: "", category: "Tissus", description: "", price: "", stock: "" });
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [orderForm, setOrderForm] = useState({ quantity: "1", name: "", phone: "", city: "", country: "Sénégal", note: "" });

  async function refreshCatalogue() {
    const items = await listPublicMarketplaceListings();
    setListings(items);
  }

  async function loadAccount(active: YereSession) {
    const [ownSeller, ownOrders, ownConversations, workspaces] = await Promise.all([
      getMyMarketplaceSeller(active),
      listMyMarketplaceOrders(active),
      listMyMarketplaceConversations(active),
      listMyAteliers(active)
    ]);
    const owned = await Promise.all(workspaces.map(async (workspace) => {
      const members = await listAtelierMembers(active, workspace.id);
      return members.some((member) => member.userId === active.user.id && member.active && member.role === "proprietaire")
        ? workspace : null;
    }));
    setAtelierChoices(owned.filter((item): item is NonNullable<typeof item> => item !== null));
    setSeller(ownSeller);
    setOrders(ownOrders);
    setConversations(ownConversations);
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (!supabaseReady) throw new Error("Le Market n’est pas encore configuré sur ce déploiement.");
        const recoveryCallback = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type") === "recovery";
        if (recoveryCallback) { setPasswordRecovery(true); setShowAccount(true); }
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

  useEffect(() => {
    if (showAccount) {
      document.querySelector(".pm-account-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showAccount]);

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
      if (authMode === "recovery") {
        await requestPasswordRecovery(email.trim().toLowerCase());
        setNotice("Si un compte YÉRÉ correspond à cette adresse, un lien de récupération sera envoyé. Vérifiez aussi vos courriers indésirables.");
        setAuthMode("login");
        return;
      }
      let next: YereSession;
      if (authMode === "signup") {
        const result = await signUp(email.trim().toLowerCase(), password, "/");
        if (result.alreadyRegistered) {
          setNotice("Cette adresse semble déjà associée à un compte. Essayez de vous connecter ou utilisez « Mot de passe oublié ? » pour récupérer l’accès.");
          setAuthMode("login");
          return;
        }
        if (!result.session) {
          setNotice("Inscription enregistrée. Si cette adresse est nouvelle, consultez votre boîte de réception et vos courriers indésirables pour confirmer votre adresse.");
          setAuthMode("login");
          return;
        }
        next = result.session;
      } else {
        next = await signIn(email.trim().toLowerCase(), password);
      }
      setSession(next);
      await loadAccount(next);
      if (pendingContactListing) { setContactListing(pendingContactListing); setPendingContactListing(null); }
      setShowAccount(false);
      setPassword("");
      setNotice("Connexion réussie. Vous pouvez maintenant commander ou gérer votre boutique.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connexion impossible.");
    } finally { setBusy(false); }
  }

  async function submitRecoveredPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) { setError("Le lien de récupération a expiré. Demandez un nouveau lien."); return; }
    if (newPassword.length < 8) { setError("Le nouveau mot de passe doit contenir au moins 8 caractères."); return; }
    if (newPassword !== confirmPassword) { setError("Les deux mots de passe ne correspondent pas."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await updatePassword(session, newPassword);
      setPasswordRecovery(false); setNewPassword(""); setConfirmPassword(""); setPassword(""); setAuthMode("login");
      setNotice("Votre mot de passe a été modifié. Vous pouvez continuer sur YÉRÉ Market.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de modifier le mot de passe. Demandez un nouveau lien.");
    } finally { setBusy(false); }
  }

  async function handleSignOut() {
    if (!session) return;
    setBusy(true);
    try {
      await signOut(session);
      setSession(null); setSeller(null); setOrders([]); setConversations([]); setMessages([]); setSelectedConversationId(null);
      setError("");
      setNotice("Vous êtes déconnecté du Market.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Déconnexion impossible.");
    } finally { setBusy(false); }
  }

  async function submitSeller(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) { setShowAccount(true); setNotice("Connectez-vous ou créez un compte pour ouvrir votre boutique."); return; }
    setBusy(true); setError(""); setNotice("");
    let uploadedLogo: string[] = [];
    try {
      if (seller) {
        let logoPath = seller.logoPath;
        if (sellerPhotoFile) {
          uploadedLogo = await uploadMarketplacePhotos(session, seller.id, [sellerPhotoFile]);
          logoPath = uploadedLogo[0];
        }
        const updated = await updateMarketplaceSeller(session, seller.id, {
          businessName: sellerForm.businessName, contactName: sellerForm.contactName, phone: sellerForm.phone,
          city: sellerForm.city, category: sellerForm.category, description: sellerForm.description, logoPath
        });
        if (uploadedLogo.length && seller.logoPath) {
          try { await deleteMarketplacePhotos(session, [seller.logoPath]); } catch { /* new logo is already saved; old file cleanup can be retried */ }
        }
        setSeller(updated);
        setShowSellerEdit(false);
        setSellerPhotoFile(null);
        setNotice("Les informations et la photo de votre boutique ont été mises à jour.");
      } else {
        const selectedAtelier = sellerForm.sellerType === "atelier"
          ? atelierChoices.find((item) => item.id === sellerForm.atelierId) : null;
        if (sellerForm.sellerType === "atelier" && !selectedAtelier) throw new Error("Sélectionnez un atelier dont vous êtes propriétaire.");
        const created = await createMarketplaceSeller(session, {
          sellerType: sellerForm.sellerType, atelierId: selectedAtelier?.id ?? null,
          businessName: sellerForm.businessName, contactName: sellerForm.contactName, phone: sellerForm.phone,
          city: sellerForm.city || selectedAtelier?.ville || "", category: sellerForm.category, description: sellerForm.description
        });
        let saved = created;
        if (sellerPhotoFile) {
          uploadedLogo = await uploadMarketplacePhotos(session, created.id, [sellerPhotoFile]);
          saved = await updateMarketplaceSeller(session, created.id, {
            businessName: sellerForm.businessName, contactName: sellerForm.contactName, phone: sellerForm.phone,
            city: sellerForm.city || selectedAtelier?.ville || "", category: sellerForm.category,
            description: sellerForm.description, logoPath: uploadedLogo[0]
          });
        }
        setSeller(saved);
        setShowSellerForm(false);
        setSellerPhotoFile(null);
        setNotice("Votre boutique indépendante est créée. Vous pouvez publier votre première offre.");
      }
    } catch (cause) {
      if (uploadedLogo.length) {
        try { await deleteMarketplacePhotos(session, uploadedLogo); } catch { /* preserve original error */ }
      }
      setError(cause instanceof Error ? cause.message : "Enregistrement de la boutique impossible.");
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
    let uploadedPhotos: string[] = [];
    try {
      uploadedPhotos = await uploadMarketplacePhotos(session, seller.id, selectedPhotos);
      await saveMarketplaceListing(session, {
        sellerId: seller.id, title: listingForm.title, category: listingForm.category,
        description: listingForm.description, priceXof: price, unit: "piece",
        city: seller.city, photos: uploadedPhotos, saleMode: "commande_yere", status: "publiee", stockAvailable: stock
      });
      uploadedPhotos = [];
      await refreshCatalogue();
      setShowListingForm(false);
      setListingForm({ title: "", category: "Tissus", description: "", price: "", stock: "" });
      setSelectedPhotos([]);
      setNotice("Votre offre et ses photos sont publiées dans le Market.");
    } catch (cause) {
      if (uploadedPhotos.length) {
        try { await deleteMarketplacePhotos(session, uploadedPhotos); } catch { /* keep original listing error */ }
      }
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
        buyerPhone: orderForm.phone.trim(), deliveryCity: orderForm.city.trim(), buyerNote: [orderForm.note.trim(), "Pays de résidence : " + orderForm.country].filter(Boolean).join("\n")
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

  async function refreshConversations() {
    if (!session) return;
    setConversations(await listMyMarketplaceConversations(session));
  }

  async function selectConversation(conversationId: string) {
    if (!session) return;
    setSelectedConversationId(conversationId);
    setError("");
    try {
      setMessages(await listMarketplaceMessages(session, conversationId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de charger les messages.");
    }
  }

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !contactListing) {
      setShowAccount(true);
      setNotice("Connectez-vous ou créez un compte Market pour contacter le vendeur.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const conversationId = await openMarketplaceConversation(session, contactListing.id, contactMessage);
      setContactListing(null);
      setContactMessage("");
      await refreshConversations();
      await selectConversation(conversationId);
      setNotice("Votre message a été envoyé au vendeur.");
      document.getElementById("messages")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d'envoyer le message.");
    } finally { setBusy(false); }
  }

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedConversationId || !replyMessage.trim()) return;
    setBusy(true); setError("");
    try {
      await sendMarketplaceMessage(session, selectedConversationId, replyMessage);
      setReplyMessage("");
      setMessages(await listMarketplaceMessages(session, selectedConversationId));
      await refreshConversations();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Le message n'a pas été envoyé.");
    } finally { setBusy(false); }
  }

  return (
    <main className="yere-market-app">
      <header className="pm-header">
        <a className="pm-brand" href="/" aria-label="YÉRÉ Market, accueil"><img className="pm-mark" src="/images/yere-logo.png" alt="" /><span><b>YÉRÉ</b><small>MARKET</small></span></a>
        <nav className="pm-nav"><a href="#catalogue">Catalogue</a><a href="#vendeurs">Vendeurs</a>{session && <><a href="#commandes">Mes commandes</a><a href="#messages">Messages</a></>}</nav>
        <div className="pm-header-actions">
          {session ? <><span className="pm-user">{session.user.email}</span><button className="pm-outline pm-account-access" type="button" onClick={() => document.getElementById("commandes")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Mon compte</button><button className="pm-outline" type="button" onClick={() => void handleSignOut()} disabled={busy}>Déconnexion</button></> :
            <button className="pm-outline" type="button" onClick={() => { setShowAccount((v) => !v); setError(""); }}>Se connecter</button>}
          <a className="pm-outline pm-atelier-link" href="/?espace=professionnel">Espace tailleur</a><a className="pm-cta" href="#vendeurs">Vendre sur YÉRÉ</a>
        </div>
      </header>

      <section className="pm-hero">
        <div className="pm-hero-copy"><span className="pm-eyebrow">LE MARCHÉ DE LA COUTURE</span><h1>La mode et la mercerie<br/><em>à portée de main.</em></h1><p>Découvrez les créations des ateliers, trouvez tissus et fournitures, et échangez directement avec les vendeurs.</p><a className="pm-hero-button" href="#catalogue">Explorer le catalogue <span>→</span></a><div className="pm-hero-trust"><span>✦ Créations & tenues</span><span>✦ Tissus & mercerie</span><span>✦ Vendeurs indépendants</span></div></div>
        <div className="pm-hero-art" aria-hidden="true"><div className="pm-art-circle"></div><div className="pm-art-card pm-art-card-one"><span>YÉRÉ</span><b>Le savoir-faire<br/>à l’honneur</b><small>MODE · TISSUS · MERCERIE</small></div><div className="pm-art-card pm-art-card-two"><span>✦</span><b>Créé avec soin</b><small>PAR LES ARTISANS</small></div></div>
      </section>

      {showAccount && <section className="pm-panel pm-account-panel"><div><span className="pm-eyebrow">ESPACE CLIENT · SÉNÉGAL & DIASPORA</span><h2>{authMode === "recovery" ? "Récupérer mon compte" : authMode === "login" ? "Heureux de vous retrouver." : "Créer un compte Market"}</h2><p>Inscrivez-vous depuis votre pays avec une adresse e-mail. Aucun numéro sénégalais, atelier ou boutique n’est nécessaire.</p></div>{passwordRecovery ? <form onSubmit={submitRecoveredPassword}><label>Nouveau mot de passe<input type="password" minLength={8} required autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label><label>Confirmer le mot de passe<input type="password" minLength={8} required autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></label><button className="pm-cta" type="submit" disabled={busy}>{busy ? "Modification…" : "Enregistrer le nouveau mot de passe"}</button></form> : <form onSubmit={submitAuth}><label>E-mail<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>{authMode !== "recovery" && <label>Mot de passe<input type="password" minLength={8} required autoComplete={authMode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} /></label>}<button className="pm-cta" type="submit" disabled={busy}>{busy ? "Veuillez patienter…" : authMode === "recovery" ? "Envoyer le lien de récupération" : authMode === "login" ? "Se connecter" : "Créer mon compte"}</button>{authMode === "login" && <button type="button" className="pm-text-button" onClick={() => setAuthMode("recovery")}>Mot de passe oublié ?</button>}<button type="button" className="pm-text-button" onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")}>{authMode === "signup" ? "J’ai déjà un compte" : "Créer un compte"}</button></form>}</section>}

      {error && <p className="pm-alert pm-error" role="alert">{error}</p>}
      {notice && <p className="pm-alert pm-notice" role="status">{notice}</p>}

      <section id="catalogue" className="pm-catalogue">
        <div className="pm-section-heading"><div><span className="pm-eyebrow">LA SÉLECTION YÉRÉ</span><h2>Explorez le Market</h2><p>Des offres publiées par des vendeurs inscrits sur YÉRÉ.</p></div><label className="pm-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un article, une ville…" /></label></div>
        <div className="pm-categories">{categories.map((item) => <button key={item} type="button" className={category === item ? "is-active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
        {loading ? <div className="pm-empty">Chargement du catalogue…</div> : visibleListings.length === 0 ? <div className="pm-empty"><span>✦</span><h3>Le catalogue est prêt à accueillir ses premiers articles.</h3><p>Il n’y a pas encore d’annonce publiée sur YÉRÉ Market. Les articles apparaîtront ici dès qu’un fournisseur ou un atelier aura créé sa boutique et publié une offre.</p><a href="#vendeurs">Ouvrir une boutique et publier un article →</a></div> :
          <div className="pm-products">{visibleListings.map((item) => <article className="pm-product pm-product-clickable" key={item.id} role="button" tabIndex={0} aria-label={"Voir le détail de " + item.title} onClick={() => { setDetailListing(item); setDetailPhotoZoomed(false); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetailListing(item); setDetailPhotoZoomed(false); } }}><div className="pm-product-art">{item.photoUrls[0] ? <img className="pm-product-photo" src={item.photoUrls[0]} alt={item.title} loading="lazy" /> : <><span>{item.category.toLowerCase().includes("tissu") ? "TISSUS" : item.category.toUpperCase()}</span><b>Y</b></>}</div><div className="pm-product-copy"><small>{item.category}</small><h3>{item.title}</h3><p>{item.description || "Une offre proposée par un vendeur YÉRÉ."}</p><strong>{money(item.priceXof)}</strong><div className="pm-product-meta"><span>{item.sellerName}</span><span>{item.city || item.sellerCity}</span></div><div className="pm-product-actions"><button type="button" className="pm-buy" onClick={(e) => { e.stopPropagation(); setSelectedListing(item); setError(""); if (!session) setShowAccount(true); }}>Commander <span>→</span></button><button type="button" className="pm-contact" onClick={(e) => { e.stopPropagation(); setContactListing(item); setContactMessage(""); setError(""); }}>Contacter le vendeur</button></div></div></article>)}</div>}
      </section>

      <section id="vendeurs" className="pm-seller-section">
        <div className="pm-seller-copy"><span className="pm-eyebrow">VOUS ÊTES FOURNISSEUR ?</span><h2>Votre boutique mérite<br/>sa place sur YÉRÉ.</h2><p>Atelier de couture ou fournisseur indépendant : créez votre vitrine, publiez vos créations, tissus, fournitures et accessoires. Un fournisseur peut s’inscrire sans posséder d’atelier.</p><ul><li>Une boutique rattachée à votre compte</li><li>Des annonces visibles dans le catalogue public</li><li>Des commandes regroupées dans votre espace</li></ul></div>
        <div className="pm-seller-card">{seller?.logoUrl ? <img className="pm-store-logo" src={seller.logoUrl} alt={"Photo de " + seller.businessName}/> : <span className="pm-seller-icon">✦</span>}<h3>{seller ? "Votre boutique est prête" : "Ouvrir une boutique"}</h3><p>{seller ? seller.businessName + " · " + seller.city : "Inscrivez-vous ou connectez-vous, puis renseignez les informations de votre activité."}</p>{seller ? <><button className="pm-cta" type="button" onClick={() => { setSellerForm({ sellerType: seller.sellerType, atelierId: seller.atelierId ?? "", businessName: seller.businessName, contactName: seller.contactName, phone: seller.phone, city: seller.city, category: seller.category, description: seller.description }); setSellerPhotoFile(null); setShowSellerEdit((v) => !v); }}>Modifier ma boutique</button><button className="pm-outline pm-seller-secondary" type="button" onClick={() => setShowListingForm((v) => !v)}>＋ Publier une offre</button></> : <button className="pm-cta" type="button" onClick={() => { setShowSellerForm((v) => !v); if (!session) setShowAccount(true); }}>Créer ma boutique indépendante</button>}</div>
      </section>

      {((showSellerForm && !seller) || (showSellerEdit && !!seller)) && <section className="pm-panel"><div><span className="pm-eyebrow">{seller ? "GESTION DE LA BOUTIQUE" : "INSCRIPTION VENDEUR"}</span><h2>{seller ? "Modifier les informations de votre boutique" : "Les informations de votre boutique"}</h2><p>Votre compte Market reste indépendant de tout atelier.</p>{seller?.logoUrl && <img className="pm-store-logo pm-store-logo-preview" src={seller.logoUrl} alt="Photo actuelle de la boutique"/>}</div><form onSubmit={submitSeller}><label>Type de vendeur<select value={sellerForm.sellerType} onChange={(e) => setSellerForm({ ...sellerForm, sellerType: e.target.value as "fournisseur" | "atelier", atelierId: "", category: e.target.value === "atelier" ? "Mode & créations" : "Tissus & mercerie" })}><option value="fournisseur">Fournisseur indépendant</option>{atelierChoices.length > 0 && <option value="atelier">Atelier de couture</option>}</select></label>{sellerForm.sellerType === "atelier" && <label>Atelier<select required value={sellerForm.atelierId} onChange={(e) => { const item = atelierChoices.find((atelier) => atelier.id === e.target.value); setSellerForm({ ...sellerForm, atelierId: e.target.value, businessName: sellerForm.businessName || item?.nom || "", city: sellerForm.city || item?.ville || "" }); }}><option value="">Choisir un atelier</option>{atelierChoices.map((item) => <option key={item.id} value={item.id}>{item.nom}{item.ville ? " · " + item.ville : ""}</option>)}</select></label>}<label>Nom de la boutique<input required maxLength={120} value={sellerForm.businessName} onChange={(e) => setSellerForm({ ...sellerForm, businessName: e.target.value })}/></label><label>Nom du responsable<input required maxLength={120} value={sellerForm.contactName} onChange={(e) => setSellerForm({ ...sellerForm, contactName: e.target.value })}/></label><label>Téléphone<input required type="tel" maxLength={40} value={sellerForm.phone} onChange={(e) => setSellerForm({ ...sellerForm, phone: e.target.value })}/></label><label>Ville<input required maxLength={100} value={sellerForm.city} onChange={(e) => setSellerForm({ ...sellerForm, city: e.target.value })}/></label><label>Activité<select value={sellerForm.category} onChange={(e) => setSellerForm({ ...sellerForm, category: e.target.value })}><option>Tissus & mercerie</option><option>Fournitures de couture</option><option>Accessoires de mode</option><option>Prêt-à-porter</option></select></label><label className="pm-wide">Présentation<textarea maxLength={500} value={sellerForm.description} onChange={(e) => setSellerForm({ ...sellerForm, description: e.target.value })}/></label><label className="pm-wide">Photo ou logo de la boutique<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files?.[0] ?? null; if (file && (!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) { setError("Choisissez une image JPG, PNG ou WebP de cinq mégaoctets maximum."); e.target.value = ""; return; } setError(""); setSellerPhotoFile(file); }}/></label>{sellerPhotoFile && <p className="pm-form-note pm-wide">Nouvelle photo sélectionnée : {sellerPhotoFile.name}. Elle remplacera la photo actuelle après enregistrement.</p>}<p className="pm-form-note pm-wide">Vous pouvez ajouter une photo dès la création, puis la remplacer à tout moment. Formats JPG, PNG ou WebP, cinq mégaoctets maximum.</p><button className="pm-cta" disabled={busy || !session}>{busy ? "Enregistrement…" : seller ? "Enregistrer les modifications" : "Créer ma boutique"}</button></form></section>}

      {showListingForm && seller && <section className="pm-panel"><div><span className="pm-eyebrow">NOUVELLE ANNONCE</span><h2>Publier une offre</h2><p>Les annonces sont immédiatement visibles après validation par la base.</p></div><form onSubmit={submitListing}><label>Nom de l’article<input required maxLength={140} value={listingForm.title} onChange={(e) => setListingForm({ ...listingForm, title: e.target.value })}/></label><label>Catégorie<select value={listingForm.category} onChange={(e) => setListingForm({ ...listingForm, category: e.target.value })}><option>Boubous & tenues</option><option>Mode femme</option><option>Tissus</option><option>Mercerie</option><option>Fournitures de couture</option></select></label><label>Prix (FCFA)<input type="number" min="1" step="1" required value={listingForm.price} onChange={(e) => setListingForm({ ...listingForm, price: e.target.value })}/></label><label>Stock (facultatif)<input type="number" min="0" step="1" value={listingForm.stock} onChange={(e) => setListingForm({ ...listingForm, stock: e.target.value })}/></label><label className="pm-wide">Description<textarea maxLength={1000} value={listingForm.description} onChange={(e) => setListingForm({ ...listingForm, description: e.target.value })}/></label><label className="pm-wide">Photos de l’article (cinq maximum)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length > 5) { setError("Vous pouvez sélectionner cinq photos maximum."); e.target.value = ""; return; } const invalid = files.find((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024); if (invalid) { setError("Utilisez des photos JPG, PNG ou WebP de cinq mégaoctets maximum."); e.target.value = ""; return; } setError(""); setSelectedPhotos(files); }} /></label>{selectedPhotos.length > 0 && <p className="pm-form-note pm-wide">{selectedPhotos.length} photo(s) sélectionnée(s) : {selectedPhotos.map((file) => file.name).join(", ")}</p>}<p className="pm-form-note pm-wide">Photos stockées dans un espace privé. Les liens de consultation sont délivrés uniquement pour les annonces publiées de vendeurs actifs. Formats JPG, PNG ou WebP, cinq mégaoctets maximum par photo.</p><button className="pm-cta" disabled={busy}>{busy ? "Publication…" : "Publier dans le Market"}</button></form></section>}

      {detailListing && <div className="pm-modal-backdrop pm-detail-backdrop" role="presentation" onClick={() => setDetailListing(null)}><section className="pm-modal pm-detail-modal" role="dialog" aria-modal="true" aria-labelledby="pm-detail-title" onClick={(e) => e.stopPropagation()}><button className="pm-modal-close" type="button" onClick={() => setDetailListing(null)} aria-label="Fermer">×</button><span className="pm-eyebrow">DÉTAIL DE L’ANNONCE</span><div className="pm-detail-gallery" aria-label="Photos de l’article">{detailListing.photoUrls.length ? detailListing.photoUrls.map((url, index) => <button className="pm-detail-photo-frame" type="button" key={url + index} onClick={() => setDetailPhotoZoomed((value) => !value)} aria-label={detailPhotoZoomed ? "Réduire la photo" : "Agrandir la photo"}><img className={"pm-detail-photo" + (detailPhotoZoomed ? " is-zoomed" : "")} src={url} alt={detailListing.title + " — photo " + (index + 1)} /></button>) : <div className="pm-detail-no-photo">Aucune photo disponible</div>}</div><p className="pm-detail-photo-hint">{detailListing.photoUrls.length > 1 ? "Faites glisser les photos horizontalement. Touchez une photo pour l’agrandir." : "Touchez la photo pour l’agrandir."}</p><small>{detailListing.category}</small><h2 id="pm-detail-title">{detailListing.title}</h2><strong className="pm-detail-price">{money(detailListing.priceXof)}</strong><p className="pm-detail-description">{detailListing.description || "Aucune description complémentaire."}</p><dl className="pm-detail-info"><div><dt>Vendeur</dt><dd>{detailListing.sellerName}</dd></div><div><dt>Ville</dt><dd>{detailListing.city || detailListing.sellerCity || "Non précisée"}</dd></div><div><dt>Disponibilité</dt><dd>{detailListing.stockAvailable === 0 ? "Rupture de stock" : detailListing.stockAvailable == null ? "À confirmer auprès du vendeur" : detailListing.stockAvailable + " disponible(s)"}</dd></div>{detailListing.unit && <div><dt>Unité</dt><dd>{detailListing.unit}</dd></div>}</dl><div className="pm-detail-actions"><button type="button" className="pm-buy" disabled={detailListing.stockAvailable === 0} onClick={() => { const item = detailListing; setDetailListing(null); setSelectedListing(item); setError(""); if (!session) setShowAccount(true); }}>Commander <span>→</span></button><button type="button" className="pm-contact" onClick={() => { const item = detailListing; setDetailListing(null); setContactListing(item); setContactMessage(""); setError(""); }}>Contacter le vendeur</button></div></section></div>}

      {contactListing && <div className="pm-modal-backdrop" role="presentation" onClick={() => setContactListing(null)}><section className="pm-modal" role="dialog" aria-modal="true" aria-labelledby="pm-contact-title" onClick={(e) => e.stopPropagation()}><button className="pm-modal-close" type="button" onClick={() => setContactListing(null)} aria-label="Fermer">×</button><span className="pm-eyebrow">MESSAGERIE YÉRÉ</span><h2 id="pm-contact-title">Contacter {contactListing.sellerName}</h2><p>À propos de : {contactListing.title}. Votre numéro et votre adresse e-mail ne sont pas transmis au vendeur.</p>{session ? <form onSubmit={submitContact}><label className="pm-wide">Votre message<textarea required minLength={1} maxLength={2000} value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} placeholder="Bonjour, je souhaite avoir des précisions sur cet article…" /></label><button className="pm-cta" disabled={busy || !contactMessage.trim()}>{busy ? "Envoi…" : "Envoyer le message"}</button></form> : <> <p>Vous n’avez pas encore de compte ? Créez gratuitement un compte acheteur. Aucun atelier ni boutique n’est nécessaire.</p><div className="pm-contact-auth-actions"><button type="button" className="pm-cta" onClick={() => { setPendingContactListing(contactListing); setContactListing(null); setAuthMode("signup"); setShowAccount(true); setError(""); }}>Créer mon compte acheteur</button><button type="button" className="pm-text-button" onClick={() => { setPendingContactListing(contactListing); setContactListing(null); setAuthMode("login"); setShowAccount(true); setError(""); }}>J’ai déjà un compte : me connecter</button></div></>}</section></div>}

      {selectedListing && <div className="pm-modal-backdrop" role="presentation" onClick={() => setSelectedListing(null)}><section className="pm-modal" role="dialog" aria-modal="true" aria-labelledby="pm-order-title" onClick={(e) => e.stopPropagation()}><button className="pm-modal-close" type="button" onClick={() => setSelectedListing(null)} aria-label="Fermer">×</button><span className="pm-eyebrow">PASSER COMMANDE</span><h2 id="pm-order-title">{selectedListing.title}</h2><p>{money(selectedListing.priceXof)} · {selectedListing.sellerName}</p>{session ? <form onSubmit={submitOrder}><label>Quantité<input required type="number" min="1" step="1" value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}/></label><label>Votre nom<input required maxLength={120} value={orderForm.name} onChange={(e) => setOrderForm({ ...orderForm, name: e.target.value })}/></label><label>Téléphone<input required type="tel" maxLength={40} value={orderForm.phone} onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })}/></label><label>Ville / destination de livraison<input value={orderForm.city} maxLength={100} onChange={(e) => setOrderForm({ ...orderForm, city: e.target.value })} placeholder="Ex. Dakar, Sénégal"/></label><label>Pays depuis lequel vous commandez<select value={orderForm.country} onChange={(e) => setOrderForm({ ...orderForm, country: e.target.value })}><option>Sénégal</option><option>France</option><option>Italie</option><option>Espagne</option><option>États-Unis</option><option>Canada</option><option>Royaume-Uni</option><option>Autre pays</option></select></label><p className="pm-form-note">Vous pouvez commander depuis l’étranger. Confirmez avec le vendeur la destination, les frais et les possibilités de livraison avant tout paiement.</p><label>Note (facultative)<textarea maxLength={500} value={orderForm.note} onChange={(e) => setOrderForm({ ...orderForm, note: e.target.value })}/></label><button className="pm-cta" disabled={busy}>{busy ? "Enregistrement…" : "Confirmer la commande"}</button></form> : <p>Connectez-vous ou créez un compte pour commander. Aucun atelier n’est nécessaire.</p>}</section></div>}

      <div className="pm-account-overview">
      {session && <section id="commandes" className="pm-orders pm-account-compact"><article className="pm-account-tile pm-orders-tile"><div className="pm-account-tile-icon" aria-hidden="true">▤</div><div className="pm-account-tile-copy"><span className="pm-eyebrow">VOTRE ESPACE</span><h2>Commandes & suivi</h2><p>Vos achats et les commandes reçues par votre boutique.</p></div><span className="pm-account-count">{orders.length}</span>{orders.length === 0 ? <p className="pm-account-empty">Aucune commande pour le moment.</p> : <div className="pm-order-list">{orders.map((order) => <article className="pm-order" key={order.id}><div><b>{order.reference}</b><span>{order.buyerName} · {order.quantity} article(s)</span><small>{new Date(order.createdAt).toLocaleDateString("fr-FR")}</small></div><strong>{money(order.totalXof)}</strong><span className="pm-order-status">{order.status}</span>{seller?.id === order.sellerId && <select aria-label={"Statut de la commande " + order.reference} value={order.status} disabled={busy} onChange={(e) => void moveOrder(order, e.target.value as MarketplaceOrder["status"])}><option value="recue">Reçue</option><option value="acceptee">Acceptée</option><option value="preparee">Préparée</option><option value="expediee">Expédiée</option><option value="livree">Livrée</option><option value="annulee">Annulée</option></select>}</article>)}</div>}</article></section>}

      {session && <section id="messages" className="pm-orders pm-messages pm-account-compact"><article className="pm-account-tile pm-messages-tile"><div className="pm-account-tile-icon" aria-hidden="true">✉</div><div className="pm-account-tile-copy"><span className="pm-eyebrow">CONTACT DIRECT SÉCURISÉ</span><h2>Vos messages</h2><p>Discutez avec les vendeurs et acheteurs sans partager vos coordonnées privées.</p></div><span className="pm-account-count">{conversations.length}</span>{conversations.length === 0 ? <p className="pm-account-empty">Aucune conversation. Contactez un vendeur depuis une annonce.</p> : <div className="pm-messaging"><aside className="pm-conversation-list">{conversations.map((conversation) => <button type="button" key={conversation.id} className={selectedConversationId === conversation.id ? "is-active" : ""} onClick={() => void selectConversation(conversation.id)}><b>{conversation.listingTitle}</b><span>{conversation.buyerUserId === session.user.id ? conversation.sellerName : "Acheteur intéressé"}</span><small>{new Date(conversation.updatedAt).toLocaleDateString("fr-FR")}</small></button>)}</aside><div className="pm-chat-panel">{selectedConversationId ? <><div className="pm-chat-heading"><b>{conversations.find((item) => item.id === selectedConversationId)?.listingTitle ?? "Conversation"}</b><span>{conversations.find((item) => item.id === selectedConversationId)?.sellerName ?? ""}</span></div><div className="pm-chat-history">{messages.map((message) => <article key={message.id} className={message.senderUserId === session.user.id ? "pm-chat-message is-mine" : "pm-chat-message"}><span>{message.senderUserId === session.user.id ? "Vous" : (seller?.id === conversations.find((item) => item.id === selectedConversationId)?.sellerId ? "Acheteur" : conversations.find((item) => item.id === selectedConversationId)?.sellerName ?? "Vendeur")}</span><p>{message.content}</p><small>{new Date(message.createdAt).toLocaleString("fr-FR")}</small></article>)}</div><form className="pm-chat-reply" onSubmit={submitReply}><textarea required maxLength={2000} value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} placeholder="Écrire un message…" /><button className="pm-cta" disabled={busy || !replyMessage.trim()}>{busy ? "Envoi…" : "Envoyer"}</button></form></> : <div className="pm-chat-empty">Sélectionnez une conversation pour lire les messages et répondre.</div>}</div></div>}</article></section>}
      </div>

      <YereOfferSection onClientSpace={() => { setShowAccount(true); setAuthMode("login"); setError(""); }} />

      <footer className="pm-footer"><a className="pm-brand" href="/"><img className="pm-mark" src="/images/yere-logo.png" alt="" /><span><b>YÉRÉ</b><small>MARKET</small></span></a><p>Le marché qui rapproche les artisans, les vendeurs et les passionnés de couture.</p></footer>
    </main>
  );
}
