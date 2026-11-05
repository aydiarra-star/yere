import "./yere-subscription-card.css";

export default function YereSubscriptionCard() {
  return <section className="yere-subscription-card" aria-labelledby="yere-subscription-title">
    <header className="yere-subscription-banner"><span aria-hidden="true">♛</span><div><h2 id="yere-subscription-title">Abonnement Mensuel YÉRÉ</h2><p>Accédez à toutes les fonctionnalités et développez votre atelier en toute sérénité.</p></div></header>
    <div className="yere-subscription-body">
      <ul className="yere-subscription-benefits">
        <li>Gestion complète de votre atelier</li>
        <li>Suivi des commandes et clients</li>
        <li>Caisse et rapports financiers</li>
        <li>Stock et fournisseurs</li>
        <li>Accès à la marketplace</li>
      </ul>
      <div className="yere-subscription-price"><strong>5 000 <small>FCFA</small></strong><span>/ mois</span></div>
    </div>
    <p className="yere-subscription-trial">Deux premiers mois d’essai gratuits · Un abonnement par atelier · Toute l’équipe incluse</p>
  </section>;
}
