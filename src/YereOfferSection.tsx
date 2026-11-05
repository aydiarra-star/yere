type Props = { onClientSpace: () => void };

const tailorGroups = [
  {
    number: "01",
    title: "Votre atelier, bien organisé",
    intro: "Toutes les informations utiles au même endroit.",
    features: [
      ["Profil de l’atelier", "Présentez votre activité, vos coordonnées et votre savoir-faire."],
      ["Fichier clients", "Centralisez les fiches clients et retrouvez leur historique."],
      ["Mensurations", "Enregistrez et retrouvez les mesures de chaque client."],
      ["Rappels & suivi", "Repérez les clients et les commandes qui demandent votre attention."]
    ]
  },
  {
    number: "02",
    title: "De la commande à la livraison",
    intro: "Gardez le fil de chaque travail, à chaque étape.",
    features: [
      ["Confection & retouches", "Créez les commandes, précisez le type de travail et suivez leur avancement."],
      ["Tâches d’équipe", "Organisez les tâches et suivez leur état d’avancement."],
      ["Échéances & livraisons", "Visualisez les dates prévues et les travaux à remettre aux clients."],
      ["Historique des commandes", "Retrouvez les informations et les mensurations associées aux commandes."]
    ]
  },
  {
    number: "03",
    title: "Maîtrisez votre gestion",
    intro: "Suivez les mouvements et les ressources de votre atelier.",
    features: [
      ["Versements & acomptes", "Enregistrez les paiements et consultez les montants restant à recevoir."],
      ["Caisse & dépenses", "Suivez les encaissements et les dépenses de l’atelier."],
      ["Stock & inventaire", "Suivez les articles, les quantités et les mouvements de stock."],
      ["Fournisseurs & achats", "Gérez vos contacts fournisseurs, achats et réceptions."]
    ]
  },
  {
    number: "04",
    title: "Faites grandir votre activité",
    intro: "Valorisez votre travail et collaborez sereinement.",
    features: [
      ["Boutique YÉRÉ Market", "Présentez vos créations et vos offres avec des photos."],
      ["Équipe & rôles", "Invitez vos collaborateurs avec des accès adaptés : propriétaire, gestionnaire ou employé."],
      ["Tableau de bord", "Retrouvez les repères essentiels pour piloter votre activité."],
      ["Abonnement atelier", "Un abonnement pour l’atelier, avec toute l’équipe incluse."]
    ]
  }
];

const clientGroups = [
  {
    number: "01",
    title: "Trouvez ce qui vous inspire",
    features: [
      ["Créations & vêtements", "Découvrez les tenues, modèles et créations proposés."],
      ["Tissus & mercerie", "Explorez les tissus, fournitures et accessoires disponibles."],
      ["Boutiques & vendeurs", "Parcourez les offres et découvrez les professionnels."]
    ]
  },
  {
    number: "02",
    title: "Achetez et gardez le contact",
    features: [
      ["Commandes Market", "Passez commande auprès d’une boutique et retrouvez vos achats."],
      ["Suivi des commandes", "Consultez les informations de suivi communiquées par le vendeur."],
      ["Messagerie intégrée", "Échangez depuis YÉRÉ sans exposer vos coordonnées privées."],
      ["Espace acheteur", "Retrouvez vos conversations et commandes avec votre compte client."]
    ]
  }
];

function FeatureRow({ title, description }: { title: string; description: string }) {
  return <div className="pm-yere-feature">
    <span className="pm-yere-feature-check" aria-hidden="true">✓</span>
    <div><h4>{title}</h4><p>{description}</p></div>
  </div>;
}

export default function YereOfferSection({ onClientSpace }: Props) {
  return (
    <section className="pm-yere-offer" aria-labelledby="pm-yere-offer-title">
      <div className="pm-yere-offer-shell">
        <header className="pm-yere-hero">
          <div className="pm-yere-hero-copy">
            <span className="pm-yere-eyebrow"><i /> L’UNIVERS YÉRÉ · COUTURE & CRÉATION</span>
            <h2 id="pm-yere-offer-title">Tout ce que YÉRÉ offre au <em>tailleur</em> et au <em>client.</em></h2>
            <p>Un univers pensé pour celles et ceux qui créent, cousent, vendent et portent la mode. Les bons outils pour les ateliers. De belles découvertes pour les clients.</p>
            <div className="pm-yere-hero-actions">
              <a className="pm-yere-primary-link" href="#abonnement">Je suis tailleur <span>↗</span></a>
              <button className="pm-yere-secondary-link" type="button" onClick={onClientSpace}>Je suis client <span>↗</span></button>
            </div>
          </div>
          <div className="pm-yere-hero-art" aria-hidden="true">
            <div className="pm-yere-orbit pm-yere-orbit-one" />
            <div className="pm-yere-orbit pm-yere-orbit-two" />
            <div className="pm-yere-art-mark">Y<span>.</span></div>
            <div className="pm-yere-art-caption"><span>YÉRÉ</span><small>LE SAVOIR-FAIRE EN MOUVEMENT</small></div>
            <div className="pm-yere-art-chip pm-yere-chip-top">CRÉER <b>✦</b></div>
            <div className="pm-yere-art-chip pm-yere-chip-bottom">CONNECTER <b>↗</b></div>
          </div>
          <div className="pm-yere-hero-ribbon"><span>POUR LES ATELIERS</span><b>✦</b><span>POUR LES CLIENTS</span><b>✦</b><span>POUR LES VENDEURS</span></div>
        </header>

        <div className="pm-yere-section-heading">
          <span className="pm-yere-eyebrow dark">DEUX PARCOURS · UNE MÊME PLATEFORME</span>
          <h3>Tout commence par votre univers.</h3>
          <p>Choisissez votre espace : YÉRÉ accompagne chaque profil avec les fonctionnalités qui lui correspondent.</p>
        </div>

        <div className="pm-yere-audience-grid">
          <article className="pm-yere-audience pm-yere-tailor">
            <div className="pm-yere-audience-top">
              <div className="pm-yere-audience-icon">✂</div>
              <div><span className="pm-yere-audience-label">L’ESPACE PROFESSIONNEL</span><h3>Pour le tailleur</h3></div>
              <span className="pm-yere-audience-index">01 / 02</span>
            </div>
            <p className="pm-yere-audience-lead">Votre atelier mérite une organisation à la hauteur de votre talent. Gérez votre activité, votre équipe et vos clients depuis un seul espace.</p>
            <div className="pm-yere-groups">
              {tailorGroups.map(group => <section className="pm-yere-feature-group" key={group.number}>
                <div className="pm-yere-group-heading"><span>{group.number}</span><div><h4>{group.title}</h4><p>{group.intro}</p></div></div>
                <div className="pm-yere-feature-list">{group.features.map(([title, description]) => <FeatureRow key={title} title={title} description={description} />)}</div>
              </section>)}
            </div>
            
            <p className="pm-yere-access-note"><span>●</span> Les informations financières de l’atelier sont réservées au propriétaire.</p>
          </article>

          <article className="pm-yere-audience pm-yere-client">
            <div className="pm-yere-audience-top">
              <div className="pm-yere-audience-icon">◇</div>
              <div><span className="pm-yere-audience-label">L’ESPACE ACHETEUR</span><h3>Pour le client</h3></div>
              <span className="pm-yere-audience-index">02 / 02</span>
            </div>
            <p className="pm-yere-audience-lead">Envie d’une création, d’un tissu ou d’un accessoire ? Découvrez les offres des professionnels et échangez en toute simplicité.</p>
            <div className="pm-yere-groups">
              {clientGroups.map(group => <section className="pm-yere-feature-group" key={group.number}>
                <div className="pm-yere-group-heading"><span>{group.number}</span><div><h4>{group.title}</h4><p>Un parcours simple, du choix à l’échange.</p></div></div>
                <div className="pm-yere-feature-list">{group.features.map(([title, description]) => <FeatureRow key={title} title={title} description={description} />)}</div>
              </section>)}
            </div>
            <div className="pm-yere-client-note">
              <div className="pm-yere-client-note-icon">✧</div>
              <div><strong>Vous n’avez pas besoin d’être tailleur.</strong><p>Un compte client suffit pour retrouver vos commandes et vos conversations sur YÉRÉ Market.</p></div>
            </div>
            <button type="button" className="pm-yere-action pm-yere-client-action" onClick={onClientSpace}>Accéder à mon espace client <span>→</span></button>
          </article>
        </div>

        <section className="pm-yere-ecosystem">
          <div className="pm-yere-ecosystem-heading"><span className="pm-yere-eyebrow dark">UN ÉCOSYSTÈME QUI RAPPROCHE</span><h3>Le savoir-faire circule. Les opportunités aussi.</h3><p>YÉRÉ met en relation les ateliers, les vendeurs et les clients, tout en respectant les espaces et les accès de chacun.</p></div>
          <div className="pm-yere-ecosystem-grid">
            <div><span className="pm-yere-eco-number">01</span><b>Un espace pour chacun</b><p>Gestion professionnelle d’un côté, découverte et achats de l’autre.</p></div>
            <div><span className="pm-yere-eco-number">02</span><b>Des échanges facilités</b><p>Les conversations et le suivi des commandes restent accessibles dans Market.</p></div>
            <div><span className="pm-yere-eco-number">03</span><b>Des accès protégés</b><p>Les données d’atelier sont séparées et les finances réservées au propriétaire.</p></div>
            <div><span className="pm-yere-eco-number">04</span><b>Une vitrine pour vos talents</b><p>Les professionnels peuvent présenter leurs créations et leurs offres au public.</p></div>
          </div>
        </section>

        <footer className="pm-yere-final-cta">
          <div><span className="pm-yere-eyebrow">YÉRÉ · LA COUTURE CONNECTÉE</span><h3>Votre talent a sa place. Vos découvertes commencent ici.</h3><p>Entrez dans l’univers YÉRÉ et choisissez votre espace.</p></div>
          <div className="pm-yere-final-actions"><a href="#abonnement">Je suis tailleur <span>↗</span></a><button type="button" onClick={onClientSpace}>Je suis client <span>↗</span></button></div>
        </footer>
      </div>
    </section>
  );
}
