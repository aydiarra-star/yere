import { useMemo, useState } from "react";
import "./public-marketplace.css";

type Props = { onProfessionalLogin: () => void };

const collections = [
  { id: "boubous", title: "Boubous & tenues", subtitle: "Couture homme et mixte", tag: "Sur mesure", image: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=700" },
  { id: "femme", title: "Mode femme", subtitle: "Robes, ensembles et wax", tag: "Collections", image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&q=80&w=700" },
  { id: "tissus", title: "Tissus", subtitle: "Wax, bazin et pagnes", tag: "Textiles", image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=700" },
  { id: "mercerie", title: "Mercerie", subtitle: "Fils, boutons et fournitures", tag: "Fournitures", image: "https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&q=80&w=700" }
];

export default function PublicMarketplace({ onProfessionalLogin }: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("tout");
  const visibleCollections = useMemo(() => collections.filter((item) => {
    const matchesCategory = activeCategory === "tout" || item.id === activeCategory;
    const normalizedQuery = query.trim().toLocaleLowerCase("fr");
    const matchesQuery = !normalizedQuery || `${item.title} ${item.subtitle}`.toLocaleLowerCase("fr").includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  }), [activeCategory, query]);

  return <main className="public-market">
    <header className="public-market-header">
      <a className="public-brand" href="#accueil" aria-label="YÉRÉ Market, accueil">
        <span className="public-brand-mark">✳</span>
        <span><strong>YÉRÉ</strong><small>MARKET</small></span>
      </a>
      <nav className="public-header-nav" aria-label="Navigation principale">
        <a href="#collections">Collections</a>
        <a href="#vendeurs">Vendre sur YÉRÉ</a>
      </nav>
      <div className="public-header-actions">
        <button type="button" className="public-login-button" onClick={onProfessionalLogin}>Connexion pro</button>
        <button type="button" className="public-pro-button" onClick={onProfessionalLogin}>Espace professionnel <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <section className="public-hero" id="accueil">
      <div className="public-hero-copy">
        <span className="public-eyebrow"><i /> LE MARCHÉ DE LA MODE AFRICAINE</span>
        <h1>Le style africain,<br /><em>à portée de main.</em></h1>
        <p>Découvrez des créations, des vêtements, des tissus et des accessoires proposés par des tailleurs et des vendeurs passionnés.</p>
        <form className="public-search" onSubmit={(event) => { event.preventDefault(); document.getElementById("collections")?.scrollIntoView({ behavior: "smooth" }); }}>
          <span aria-hidden="true">⌕</span>
          <input aria-label="Rechercher dans les collections" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un vêtement, un tissu, une collection…" />
          <button type="submit" aria-label="Rechercher">→</button>
        </form>
        <div className="public-hero-note"><span>✓</span> Ouvert à tous, sans inscription pour découvrir</div>
      </div>
      <div className="public-hero-visual" aria-label="Inspiration mode africaine">
        <img src="https://images.unsplash.com/photo-1539106670125-7b7a1f6c5f1b?auto=format&fit=crop&q=85&w=1000" alt="Inspiration de mode et de création vestimentaire" />
        <div className="public-hero-stamp"><strong>YÉRÉ</strong><span>CRÉER · DÉCOUVRIR · PARTAGER</span></div>
      </div>
    </section>

    <section className="public-collections" id="collections">
      <div className="public-section-heading">
        <div><span className="public-eyebrow">EXPLORER YÉRÉ MARKET</span><h2>Découvrez les univers</h2><p>Parcourez librement les grandes familles de produits.</p></div>
        <button type="button" className="public-text-button" onClick={() => { setActiveCategory("tout"); setQuery(""); }}>Tout explorer <span>→</span></button>
      </div>
      <div className="public-category-pills" aria-label="Filtrer les collections">
        <button type="button" className={activeCategory === "tout" ? "active" : ""} onClick={() => setActiveCategory("tout")}>Tout</button>
        {collections.map((item) => <button type="button" key={item.id} className={activeCategory === item.id ? "active" : ""} onClick={() => setActiveCategory(item.id)}>{item.title}</button>)}
      </div>
      <div className="public-collection-grid">
        {visibleCollections.map((item) => <button type="button" className="public-collection-card" key={item.id} onClick={() => setActiveCategory(item.id)}>
          <span className="public-collection-image"><img src={item.image} alt="" loading="lazy" /><small>{item.tag}</small></span>
          <span className="public-collection-meta"><strong>{item.title}</strong><span>{item.subtitle}</span></span>
          <span className="public-collection-arrow" aria-hidden="true">↗</span>
        </button>)}
        {visibleCollections.length === 0 && <p className="public-empty-search">Aucune collection ne correspond à cette recherche. Essayez un autre terme.</p>}
      </div>
    </section>

    <section className="public-catalogue" aria-labelledby="public-catalogue-title">
      <div><span className="public-eyebrow">VITRINE PUBLIQUE</span><h2 id="public-catalogue-title">Les annonces publiées sur YÉRÉ</h2><p>Consultez le catalogue réel des offres disponibles, recherchez un article et passez commande depuis le Market.</p><a className="public-market-catalogue-link" href="/market/">Explorer les annonces publiées →</a></div>
      <div className="public-catalogue-mark"><span>✳</span><strong>YÉRÉ MARKET</strong><small>La vitrine des créateurs et fournisseurs</small></div>
    </section>

    <section className="public-vendor-banner" id="vendeurs">
      <div className="public-vendor-icon">✂</div>
      <div><span className="public-eyebrow">VOUS ÊTES PROFESSIONNEL ?</span><h2>Vos créations méritent d’être vues.</h2><p>Tailleur, atelier ou fournisseur indépendant : préparez votre espace vendeur et présentez vos produits sur YÉRÉ Market.</p></div>
      <button type="button" onClick={onProfessionalLogin}>Accéder à l’espace professionnel <span>→</span></button>
    </section>

    <footer className="public-market-footer">
      <a className="public-brand" href="#accueil"><span className="public-brand-mark">✳</span><span><strong>YÉRÉ</strong><small>MARKET & ATELIER</small></span></a>
      <p>Le savoir-faire, les créations et les métiers de la couture réunis.</p>
      <button type="button" onClick={onProfessionalLogin}>Connexion professionnelle</button>
    </footer>
  </main>;
}
