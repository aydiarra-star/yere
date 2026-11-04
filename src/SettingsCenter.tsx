import { useEffect, useState } from "react";

type AtelierRole = "proprietaire" | "gestionnaire" | "employe";

type Props = {
  role: AtelierRole;
  onBack: () => void;
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

export default function SettingsCenter({ role, onBack }: Props) {
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
        <span>{online ? "Connexion Internet détectée" : "Vous êtes hors ligne"}</span>
        <small>{online ? "La disponibilité des données dépend de leur confirmation par le serveur." : "Seule l’interface déjà chargée peut être disponible. La synchronisation métier hors ligne n’est pas encore activée."}</small>
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
          <p>Le mode hors ligne complet est en cours de développement. YÉRÉ ne prétend pas avoir synchronisé des modifications tant que Supabase ne les a pas confirmées.</p>
        </div>
        <ul>
          <li>Supabase reste la source officielle des données.</li>
          <li>Les anciennes archives locales ne sont ni importées ni supprimées.</li>
          <li>La caisse, les paiements et les dépenses ne sont pas disponibles hors ligne pour les rôles non autorisés.</li>
          <li>Marketplace, paiements en ligne et invitations nécessitent Internet.</li>
        </ul>
      </section>

      <div className="dtech-settings-about">
        <div><span>Application</span><strong>YÉRÉ</strong></div>
        <div><span>Éditeur</span><strong>DTech</strong></div>
        <div><span>Votre rôle</span><strong>{roleLabel}</strong></div>
      </div>

      <p className="privacy-note">Certaines rubriques sont présentées comme repères et seront activées après leur réalisation et validation. Aucun réglage sensible n’est modifié depuis cet écran.</p>
      <button type="button" className="secondary-button" onClick={onBack}>Retour à mon atelier</button>
    </section>
  );
}
