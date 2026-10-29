import type { ReactNode } from "react";
import { formatXof, type Order } from "./domain";
import { illustrationUrl } from "./illustrations";

type HomeDashboardProps = {
  atelierName: string;
  isExample: boolean;
  today: Date;
  deliveryCount: number;
  outstandingOrderCount: number;
  outstanding: number;
  activeOrderCount: number;
  inProductionOrder?: Order;
  onOpenDeliveries: () => void;
  onOpenPayments: () => void;
  onOpenProduction: () => void;
  onCreateOrder: () => void;
  onOpenMeasurements: () => void;
  onOpenTools: () => void;
  onConfigure: () => void;
};

type PriorityCardProps = {
  index: string;
  title: string;
  icon: "delivery" | "payment" | "production";
  badges: string[];
  count: number;
  countLabel: ReactNode;
  detail: ReactNode;
  image: string;
  actionLabel: string;
  onOpen: () => void;
};

function PriorityIcon({ name }: { name: PriorityCardProps["icon"] }) {
  if (name === "delivery") {
    return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z"/><path d="m3.8 7.6 8.2 4.5 8.2-4.5M12 12.1V21M8 5.2l8.2 4.5"/></svg>;
  }
  if (name === "payment") {
    return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="M3 10h18M7 15h3"/><circle cx="17" cy="14.5" r="1"/></svg>;
  }
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 3.5h8v17H8zM6.5 3.5h11M6.5 20.5h11M8 7.5h8M8 11h8M8 14.5h8M8 18h8"/><path d="M10 2h4M10 22h4"/></svg>;
}

function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">{diagonal
    ? <path d="M6 18 18 6M8 6h10v10" />
    : <path d="M4 12h15M14 7l5 5-5 5" />}</svg>;
}

function ScissorsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="6.1" cy="18.2" r="2.8"/><circle cx="17.9" cy="18.2" r="2.8"/><path d="M8.1 16.2 18.6 3.1c.5-.6 1.4-.6 1.7.2.3.6.2 1.4-.3 2.1L9 19.1M15.9 16.2 5.4 3.1C4.9 2.5 4 2.5 3.7 3.3c-.3.6-.2 1.4.3 2.1l11 13.7"/><circle cx="12" cy="11.5" r=".8"/></svg>;
}

function PriorityCard({ index, title, icon, badges, count, countLabel, detail, image, actionLabel, onOpen }: PriorityCardProps) {
  return <article className={`priority-card priority-card--${icon}`}>
    <div className="priority-card-top">
      <span className="priority-symbol"><PriorityIcon name={icon} /></span>
      <h3>{title}</h3>
      <span className="priority-index" aria-hidden="true">{index}</span>
    </div>
    <div className="priority-card-info">
      <div className="priority-badges" aria-label="Repères de statut">
        {badges.map((badge, index) => <span className={`priority-badge priority-badge--${index + 1}`} key={badge}>{badge}</span>)}
      </div>
      <div className="priority-metric"><strong>{count}</strong><span>{countLabel}</span></div>
      <p className="priority-detail">{detail}</p>
    </div>
    <span className="priority-art-halo" aria-hidden="true" />
    <img className="priority-art" src={image} alt="" aria-hidden="true" />
    <button type="button" className="priority-open" onClick={onOpen} aria-label={actionLabel}>
      <span><ArrowIcon diagonal /></span>
    </button>
  </article>;
}

export default function HomeDashboard({ atelierName, isExample, today, deliveryCount, outstandingOrderCount, outstanding, activeOrderCount, inProductionOrder, onOpenDeliveries, onOpenPayments, onOpenProduction, onCreateOrder, onOpenMeasurements, onOpenTools, onConfigure }: HomeDashboardProps) {
  const date = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(today);
  const deliveries = isExample ? 3 : deliveryCount;
  const invoices = isExample ? 2 : outstandingOrderCount;
  const activeOrders = isExample ? 5 : activeOrderCount;

  return <div className="home-dashboard">
    <div className="home-layout">
      <div className="home-main">
        <section className="home-greeting" aria-labelledby="home-title">
          <div className="home-eyebrow"><span className="eyebrow-star" aria-hidden="true">✦</span><span>VOTRE ESPACE ATELIER</span><span className="eyebrow-separator" aria-hidden="true" /><time dateTime={`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`}>{date}</time></div>
          <h1 id="home-title">Bienvenue dans votre atelier{atelierName ? <>,<br /><span>{atelierName}.</span></> : <> de couture.</>}</h1>
          <p>Votre savoir-faire mérite ce qu’il y a de mieux.</p>
          <button type="button" className="measurements-quick-access" onClick={onOpenMeasurements}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.6" /><path d="m16 16 4.5 4.5M8 8.5h5.5M8 11h3.5M8 13.5h2" /></svg><span>Retrouver les mensurations d’un client</span><span className="measurements-quick-arrow" aria-hidden="true">↗</span></button>
          <svg className="greeting-sparkle" viewBox="0 0 42 42" fill="none" aria-hidden="true"><path d="M21 3c1.5 9.7 6.3 14.5 16 16-9.7 1.5-14.5 6.3-16 16-1.5-9.7-6.3-14.5-16-16C14.7 17.5 19.5 12.7 21 3Z"/><path d="M35 28c.5 3.3 2.2 5 5.5 5.5-3.3.5-5 2.2-5.5 5.5-.5-3.3-2.2-5-5.5-5.5 3.3-.5 5-2.2 5.5-5.5ZM5 1v7M1.5 4.5h7"/></svg>
        </section>

        <section className="home-priorities" aria-labelledby="priorities-title">
          <div className="priorities-heading">
            <div><span className="section-marker" aria-hidden="true" /><h2 id="priorities-title">Vos priorités</h2><span className="priorities-today">AUJOURD’HUI</span></div>
            {isExample && <button type="button" className="example-indicator" onClick={onConfigure} title="Données d’exemple : configurer mon atelier"><span aria-hidden="true" />Aperçu fictif <b>Configurer ↗</b></button>}
          </div>
          <div className="priority-list">
            <PriorityCard
              index="01"
              title="Livraisons & état"
              icon="delivery"
              badges={["En cours", "Livré", "Tissu de luxe"]}
              count={deliveries}
              countLabel={<>{deliveries === 1 ? "livraison prévue" : "livraisons prévues"}<br />aujourd’hui</>}
              detail={isExample ? "Tissu premium en cours de coupe" : deliveryCount > 0 ? "Vérifiez les pièces à préparer" : "Aucune livraison prévue aujourd’hui"}
              image={illustrationUrl("delivery")}
              actionLabel="Voir les livraisons et les commandes"
              onOpen={onOpenDeliveries}
            />
            <PriorityCard
              index="02"
              title="Encaissements & paiements"
              icon="payment"
              badges={["À régler", "Paiement reçu"]}
              count={invoices}
              countLabel={<>{invoices === 1 ? "facture" : "factures"}<br />à encaisser</>}
              detail={<>Total : <b>{formatXof(isExample ? 150000 : outstanding)}</b></>}
              image={illustrationUrl("payment")}
              actionLabel="Voir les encaissements et paiements"
              onOpen={onOpenPayments}
            />
            <PriorityCard
              index="03"
              title="Commandes en production"
              icon="production"
              badges={["Conception", "Couture", "Finition"]}
              count={activeOrders}
              countLabel={<>{activeOrders === 1 ? "commande active" : "commandes actives"}<br />dans l’atelier</>}
              detail={isExample ? "Design de robes spéciales en cours" : inProductionOrder ? `${inProductionOrder.garment} en confection` : "Suivez vos pièces jusqu’à la finition"}
              image={illustrationUrl("production")}
              actionLabel="Voir les commandes en production"
              onOpen={onOpenProduction}
            />
          </div>
        </section>

        <button type="button" className="create-order-cta" onClick={onCreateOrder}>
          <span className="cta-icon"><ScissorsIcon /></span>
          <span>CRÉER NOUVELLE COMMANDE</span>
          <span className="cta-arrow"><ArrowIcon /></span>
        </button>
        <p className="home-signature"><span aria-hidden="true">✧</span> L’art de votre métier, la simplicité en plus.</p>
      </div>

      <aside className="home-editorial" aria-label="L’esprit YÉRÉ">
        <div className="editorial-visual">
          <img src={illustrationUrl("atelier")} alt="" />
          <div className="editorial-top"><span>YÉRÉ ATELIER</span><span>EST. POUR VOUS</span></div>
          <div className="editorial-copy"><span className="editorial-kicker">LE GOÛT DU DÉTAIL</span><h2>Les belles choses<br /><em>prennent forme ici.</em></h2><p>À vos côtés, du premier croquis à la dernière couture.</p></div>
        </div>
        <div className="editorial-note">
          <span className="editorial-note-icon"><ScissorsIcon /></span>
          <div><strong>Pensé pour votre métier</strong><p>Tous vos outils, réunis au même endroit.</p></div>
          <button type="button" onClick={onOpenTools} aria-label="Découvrir les outils de l’atelier"><ArrowIcon /></button>
        </div>
        <div className="editorial-caption"><span>CRÉER. COUDRE. INSPIRER.</span><span>YÉRÉ © {today.getFullYear()}</span></div>
      </aside>
    </div>
  </div>;
}
