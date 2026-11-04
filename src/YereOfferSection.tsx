type Props = { onClientSpace: () => void };

const tailorFeatures = [
  ["Votre atelier", "Présentez votre activité, vos coordonnées et votre savoir-faire dans un espace professionnel."],
  ["Fichier clients", "Centralisez les informations de vos clients et retrouvez leur historique."],
  ["Mensurations", "Enregistrez, consultez et mettez à jour les mesures de chaque client."],
  ["Commandes & production", "Créez les commandes de confection ou de retouche, suivez leur avancement et gardez une vision claire des travaux à réaliser."],
  ["Tâches & organisation", "Répartissez les tâches de production, désignez les responsables et suivez les étapes de réalisation avec votre équipe."],
  ["Livraisons & échéances", "Repérez les commandes à livrer et suivez les dates prévues jusqu’à la remise au client."],
  ["Suivi & relances clients", "Retrouvez les informations utiles et identifiez les clients à recontacter selon le suivi de leurs commandes."],
  ["Acomptes & versements", "Enregistrez les paiements reçus et suivez les montants restant à encaisser."],
  ["Caisse & finances", "Suivez les encaissements, les mouvements de caisse et les dépenses. Les données financières restent réservées au propriétaire."],
  ["Dépenses", "Gardez une trace des charges et dépenses de l’atelier."],
  ["Stock & inventaire", "Suivez les matières, tissus, fournitures et quantités disponibles."],
  ["Fournisseurs & achats", "Retrouvez vos fournisseurs et suivez les achats destinés à l’atelier."],
  ["Équipe & accès", "Travaillez avec votre équipe grâce aux rôles propriétaire, gestionnaire et employé, avec des accès adaptés."],
  ["Tableau de bord", "Retrouvez les informations essentielles de votre activité pour mieux organiser le travail."],
  ["Boutique YÉRÉ Market", "Présentez vos créations et vos offres, ajoutez des photos, échangez avec les acheteurs et suivez les commandes reçues."]
];

const clientFeatures = [
  ["Découvrir les créations", "Explorez les tenues, modèles, créations et offres publiés par les professionnels."],
  ["Trouver tissus & mercerie", "Parcourez les tissus, fournitures et accessoires proposés par les vendeurs."],
  ["Découvrir les vendeurs", "Consultez les offres et les informations disponibles sur les boutiques et leurs activités."],
  ["Commander sur le Market", "Passez une commande auprès d’un vendeur et retrouvez son suivi dans votre espace."],
  ["Échanger directement", "Posez vos questions au vendeur grâce à la messagerie intégrée, sans afficher vos coordonnées privées."],
  ["Suivre vos commandes", "Retrouvez vos achats et les changements de statut communiqués par la boutique."],
  ["Un compte acheteur simple", "Créez un compte pour commander et retrouver vos échanges, sans devoir posséder un atelier."]
];

export default function YereOfferSection({ onClientSpace }: Props) {
  return (
    <section className="pm-yere-offer" aria-labelledby="pm-yere-offer-title">
      <div className="pm-yere-offer-intro">
        <span className="pm-eyebrow">L’UNIVERS YÉRÉ · POUR LES PROFESSIONNELS ET LEURS CLIENTS</span>
        <h2 id="pm-yere-offer-title">Tout ce que YÉRÉ offre au tailleur et au client.</h2>
        <p>YÉRÉ rapproche les ateliers, leurs clients et les vendeurs de tissus et de fournitures. Un même univers pour mieux gérer son activité, découvrir des offres et garder le contact.</p>
        <div className="pm-yere-offer-pills"><span>Gérer</span><span>Créer</span><span>Découvrir</span><span>Commander</span><span>Échanger</span></div>
      </div>

      <div className="pm-yere-audience-grid">
        <article className="pm-yere-audience pm-yere-tailor">
          <div className="pm-yere-audience-head">
            <span className="pm-yere-audience-symbol" aria-hidden="true">✂</span>
            <div><span className="pm-yere-kicker">POUR LE PROFESSIONNEL</span><h3>Le tailleur et son atelier</h3></div>
          </div>
          <p className="pm-yere-audience-lead">Pilotez votre atelier avec méthode, du premier contact client jusqu’à la livraison et au suivi de votre activité.</p>
          <div className="pm-yere-feature-list">
            {tailorFeatures.map(([title, description], index) => <div className="pm-yere-feature" key={title}><span className="pm-yere-feature-number">{String(index + 1).padStart(2, "0")}</span><div><h4>{title}</h4><p>{description}</p></div></div>)}
          </div>
          <div className="pm-yere-audience-footer">
            <p><strong>Un abonnement par atelier, toute l’équipe incluse.</strong><br/>2 mois d’essai gratuit, puis 5 000 FCFA par mois et par atelier.</p>
            <a className="pm-yere-action" href="/?espace=professionnel">Découvrir l’espace tailleur <span>→</span></a>
          </div>
        </article>

        <article className="pm-yere-audience pm-yere-client">
          <div className="pm-yere-audience-head">
            <span className="pm-yere-audience-symbol" aria-hidden="true">◇</span>
            <div><span className="pm-yere-kicker">POUR LE PUBLIC</span><h3>Le client et l’acheteur</h3></div>
          </div>
          <p className="pm-yere-audience-lead">Trouvez l’inspiration, découvrez les offres et échangez simplement avec les professionnels de la couture.</p>
          <div className="pm-yere-feature-list">
            {clientFeatures.map(([title, description], index) => <div className="pm-yere-feature" key={title}><span className="pm-yere-feature-number">{String(index + 1).padStart(2, "0")}</span><div><h4>{title}</h4><p>{description}</p></div></div>)}
          </div>
          <div className="pm-yere-client-highlight">
            <strong>Pas besoin d’être tailleur ni de posséder un atelier.</strong>
            <p>Un compte acheteur suffit pour commander et retrouver vos échanges sur YÉRÉ Market.</p>
            <button type="button" className="pm-yere-action" onClick={onClientSpace}>Accéder à mon espace client <span>→</span></button>
          </div>
        </article>
      </div>

      <div className="pm-yere-shared">
        <div className="pm-yere-shared-heading"><span className="pm-eyebrow">UN MÊME ÉCOSYSTÈME</span><h3>Tout le monde avance, chacun à sa place.</h3><p>Les outils de gestion de l’atelier restent dans l’espace professionnel. Le catalogue, les commandes Market et les échanges rapprochent les vendeurs et les acheteurs.</p></div>
        <div className="pm-yere-shared-grid">
          <div><span>01</span><b>Un espace adapté</b><p>Un parcours professionnel pour gérer l’atelier et un parcours acheteur pour découvrir et commander.</p></div>
          <div><span>02</span><b>Des échanges centralisés</b><p>Les demandes et conversations liées aux annonces se retrouvent dans la messagerie Market.</p></div>
          <div><span>03</span><b>Des accès maîtrisés</b><p>Les données d’un atelier sont séparées. Les informations financières sont réservées au propriétaire.</p></div>
          <div><span>04</span><b>Le savoir-faire valorisé</b><p>Les ateliers et vendeurs peuvent présenter leurs offres et toucher une communauté plus large.</p></div>
        </div>
      </div>

      <div className="pm-yere-final-cta">
        <div><span className="pm-yere-kicker">YÉRÉ · LA COUTURE CONNECTÉE</span><h3>Votre savoir-faire mérite un espace. Vos envies méritent des découvertes.</h3><p>Entrez dans l’univers YÉRÉ et choisissez votre espace.</p></div>
        <div className="pm-yere-final-actions"><a href="/?espace=professionnel">Je suis tailleur <span>→</span></a><a href="#catalogue">Je découvre le Market <span>→</span></a></div>
      </div>
    </section>
  );
}
