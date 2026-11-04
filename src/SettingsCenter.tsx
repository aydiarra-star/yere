import { useEffect, useState } from "react";

type AtelierRole = "proprietaire" | "gestionnaire" | "employe";

type Props = {
  role: AtelierRole;
  onBack: () => void;
  serverSyncStatus: "idle" | "loading" | "ready" | "error";
};

const sections = [
  {
    title: "Mon compte",
    description: "Gérez les informations de votre compte et vos préférences.",
    items: ["Profil et coordonnées", "Sécurité du compte et mot de passe", "Confidentialité et sessions", "Notifications et préférences"]
  },
  {
    title: "Mon atelier et mon équipe",
    description: "Retrouvez les réglages de votre espace de travail.",
    items: ["Informations de l’atelier", "Membres et invitations", "Rôles et autorisations"]
  },
  {
    title: "Guide d’utilisation",
    description: "Des explications simples pour utiliser les outils YÉRÉ.",
    items: ["Bien démarrer avec YÉRÉ", "Clients et mensurations", "Commandes et suivi de confection", "Stock et fournisseurs", "Marketplace"]
  },
  {
    title: "Services et assistance",
    description: "Besoin d’aide ? Préparez une demande à l’équipe d’assistance.",
    items: ["Centre d’aide et questions fréquentes", "Signaler un problème", "Proposer une amélioration"]
  },
  {
    title: "Informations légales",
    description: "Les documents officiels de YÉRÉ seront consultables ici.",
    items: ["Présentation officielle de YÉRÉ", "Conditions générales d’utilisation", "Conditions de la Marketplace", "Politique de confidentialité", "Gestion des cookies", "Mentions légales et propriété intellectuelle"]
  }
];

export default function SettingsCenter({ role, onBack, serverSyncStatus }: Props) {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const roleLabel = role === "proprietaire" ? "Propriétaire" : role === "gestionnaire" ? "Gestionnaire" : "Employé";

  return (
    <section className="content-card dtech-settings" aria-labelledby="dtech-settings-title">
      <div className="dtech-settings-top">
        <div>
          <p className="eyebrow">ESPACE PERSONNEL</p>
          <h2 id="dtech-settings-title">Centre des paramètres</h2>
          <p>Retrouvez au même endroit les réglages, les guides et les informations utiles de YÉRÉ.</p>
        </div>
        <span className="dtech-editor-mark">DTech</span>
      </div>

      <div className="dtech-settings-status" role="status">
        <span className={online ? "dtech-status-dot is-online" : "dtech-status-dot is-offline"} />
        <span>{online ? "Connexion Internet détectée" : "Vous êtes hors ligne — consultation en lecture seule"}</span>
        <small>{online
          ? "Les données affichées sont celles confirmées par Supabase."
          : serverSyncStatus === "ready"
            ? "Les informations déjà chargées restent consultables tant que cet écran reste ouvert. Aucune modification ne peut être enregistrée hors ligne. Ne fermez pas et ne rechargez pas cette page avant de retrouver Internet."
            : "Aucune donnée métier n’est disponible hors ligne pour cette session. Reconnectez-vous pour charger les informations depuis Supabase."}</small>
      </div>

      <div className="dtech-settings-grid">
        {sections.map((section) => (
          <article className="dtech-settings-card" key={section.title}>
            <h3>{section.title}</h3>
            <p>{section.description}</p>
            <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        ))}
      </div>

      <section className="dtech-offline-card" aria-labelledby="dtech-offline-title">
        <div>
          <p className="eyebrow">FONCTIONNALITÉ EN PRÉPARATION</p>
          <h3 id="dtech-offline-title">Mode hors ligne sécurisé</h3>
          <p>Première étape sécurisée : les données déjà chargées restent consultables en mémoire pendant une coupure réseau. Toutes les écritures sont bloquées avant envoi. Aucune modification hors ligne n’est mise en attente ou présentée comme enregistrée.</p>
        </div>
        <ul>
          <li>Supabase reste la source officielle des données.</li>
          <li>Les anciennes archives locales ne sont ni importées ni supprimées.</li>
          <li>La caisse, les paiements et les dépenses ne sont jamais mis en cache par cette étape.</li>
          <li>Marketplace, paiements en ligne, invitations et toute modification nécessitent Internet.</li>
        </ul>
      </section>

      <div className="dtech-settings-about">
        <div><span>Application</span><strong>YÉRÉ</strong></div>
        <div><span>Éditeur</span><strong>DTech</strong></div>
        <div><span>Votre rôle</span><strong>{roleLabel}</strong></div>
      </div>

      <p className="privacy-note">Les données métier ne sont pas enregistrées localement. Si vous rechargez ou fermez l’application hors ligne, elles ne seront plus disponibles jusqu’à la reconnexion. Les anciennes archives locales restent séparées et ne sont jamais réimportées automatiquement.</p>
      <div className="dtech-settings-actions">
        <button type="button" className="secondary-button" onClick={onBack}>Retour à mon atelier</button>
        {online && serverSyncStatus === "ready" && <button type="button" className="primary-button" onClick={() => window.location.reload()}>Actualiser les données du serveur</button>}
      </div>
    </section>
  );
}
