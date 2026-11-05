import { useEffect, useState } from "react";

type AtelierRole = "proprietaire" | "gestionnaire" | "employe";
type SettingsDestination = "account" | "team" | "clients" | "orders" | "stock" | "marketplace";
type Props = { role: AtelierRole; onBack: () => void; onNavigate: (destination: SettingsDestination) => void; serverSyncStatus: "idle" | "loading" | "ready" | "error" };

type SettingItem = { title: string; description: string; icon: string; status?: "available" | "planned"; details: string[] };
type SettingSection = { title: string; description: string; icon: string; items: SettingItem[] };

const sections: SettingSection[] = [
  { title: "Mon compte", description: "Votre identité, votre sécurité et vos préférences personnelles.", icon: "◉", items: [
    { title: "Profil et coordonnées", description: "Les informations liées à votre atelier YÉRÉ.", icon: "👤", status: "available", details: ["Ouvrez le profil de votre atelier pour consulter et modifier son nom, son téléphone, sa ville et son organisation.", "Les modifications sont envoyées à Supabase et confirmées par le serveur."] },
    { title: "Sécurité du compte et mot de passe", description: "Protégez l’accès à votre espace personnel.", icon: "🛡️", status: "planned", details: ["La connexion et les sessions sont gérées par Supabase.", "La récupération du mot de passe doit être effectuée depuis le parcours « Mot de passe oublié ».", "Ne partagez jamais votre mot de passe ou vos codes de connexion."] },
    { title: "Confidentialité et sessions", description: "Comprendre comment votre session et vos données sont protégées.", icon: "🔐", status: "available", details: ["Les accès aux données de l’atelier sont vérifiés côté serveur.", "Les droits sont contrôlés à partir de votre appartenance active à l’atelier.", "Déconnectez-vous sur un appareil partagé après utilisation."] },
    { title: "Notifications et préférences", description: "Vos préférences de communication.", icon: "🔔", status: "planned", details: ["Les préférences de notifications personnalisées ne sont pas encore configurables ici.", "YÉRÉ ne doit pas afficher une préférence comme enregistrée tant que le serveur ne l’a pas confirmée."] }
  ]},
  { title: "Mon atelier et mon équipe", description: "Les informations de votre espace de travail et les accès de votre équipe.", icon: "✂", items: [
    { title: "Informations de l’atelier", description: "Nom, téléphone, ville et organisation de l’atelier.", icon: "🏠", status: "available", details: ["Les informations de l’atelier sont enregistrées dans Supabase.", "Pour les modifier, ouvrez « Mon atelier » depuis votre espace de compte.", "Seules les personnes autorisées peuvent modifier les informations de l’atelier."] },
    { title: "Membres et invitations", description: "Suivre les membres et les invitations de votre équipe.", icon: "👥", status: "available", details: ["La gestion des invitations et des membres se trouve dans l’espace de compte de l’atelier.", "Les invitations sont contrôlées par le serveur.", "Un membre inactif ne doit plus accéder aux données de l’atelier."] },
    { title: "Rôles et autorisations", description: "Comprendre les responsabilités de chaque rôle.", icon: "⚖️", status: "available", details: ["Propriétaire : contrôle complet de l’atelier, y compris les informations financières.", "Gestionnaire : organise le travail et l’équipe selon les autorisations prévues.", "Employé : accède aux outils opérationnels autorisés.", "La caisse, les paiements et les dépenses restent réservés au propriétaire."] }
  ]},
  { title: "Guide d’utilisation", description: "Des repères simples pour utiliser les outils de YÉRÉ.", icon: "▤", items: [
    { title: "Bien démarrer avec YÉRÉ", description: "Les premières étapes pour configurer votre espace.", icon: "🚀", status: "available", details: ["1. Connectez-vous à votre compte.", "2. Créez ou sélectionnez votre atelier.", "3. Vérifiez les informations de l’atelier et les membres.", "4. Ajoutez vos clients et leurs mensurations, puis créez vos commandes.", "5. Consultez les données depuis les modules correspondants."] },
    { title: "Clients et mensurations", description: "Créer une fiche client et conserver ses mesures.", icon: "📏", status: "available", details: ["Créez une fiche avec les coordonnées utiles du client.", "Enregistrez les mensurations avec le type de vêtement concerné.", "Vérifiez les mesures avant de lancer la confection.", "Les données métier de l’atelier sont conservées dans Supabase."] },
    { title: "Commandes et suivi de confection", description: "Organiser les commandes et suivre leur avancement.", icon: "🧵", status: "available", details: ["Associez chaque commande à un client.", "Renseignez le vêtement et la date prévue.", "Mettez à jour les étapes de confection au fil du travail.", "Vérifiez les informations avant de confirmer une livraison."] },
    { title: "Stock et fournisseurs", description: "Suivre les articles, les mouvements et les achats.", icon: "📦", status: "available", details: ["Créez les articles avec une unité et un seuil minimum.", "Enregistrez les entrées et sorties de stock.", "Associez les achats à vos fournisseurs.", "Contrôlez les quantités après réception."] },
    { title: "Marketplace", description: "Présenter vos articles et découvrir les offres.", icon: "🛍️", status: "available", details: ["Le Marketplace est un espace distinct des données internes de l’atelier.", "La publication et les échanges nécessitent une connexion Internet.", "Vérifiez les photos, le prix et la description avant publication."] }
  ]},
  { title: "Services et assistance", description: "Trouver de l’aide et partager vos retours.", icon: "✦", items: [
    { title: "Centre d’aide et questions fréquentes", description: "Les réponses aux questions courantes.", icon: "❔", status: "planned", details: ["Le centre d’aide complet est en préparation.", "En attendant, les guides de cette page présentent les principaux parcours de YÉRÉ."] },
    { title: "Signaler un problème", description: "Préparer un signalement clair pour l’équipe YÉRÉ.", icon: "⚠️", status: "planned", details: ["Le formulaire de signalement n’est pas encore relié au support.", "Notez le module concerné, l’action effectuée et le message d’erreur exact.", "N’incluez jamais votre mot de passe ni les données privées de vos clients."] },
    { title: "Proposer une amélioration", description: "Partager une idée pour faire progresser YÉRÉ.", icon: "💡", status: "planned", details: ["Le dépôt direct des suggestions sera ajouté avec le service d’assistance.", "Décrivez le besoin rencontré et le résultat attendu."] }
  ]},
  { title: "Informations légales", description: "Les documents de référence et les règles d’utilisation.", icon: "§", items: [
    { title: "Présentation officielle de YÉRÉ", description: "La mission et les services de l’application.", icon: "📘", status: "planned", details: ["La présentation officielle complète sera publiée ici après validation éditoriale."] },
    { title: "Conditions générales d’utilisation", description: "Les règles d’accès et d’utilisation de YÉRÉ.", icon: "📄", status: "planned", details: ["Le document officiel doit être finalisé et validé avant publication."] },
    { title: "Conditions de la Marketplace", description: "Les règles applicables aux acheteurs et vendeurs.", icon: "🛒", status: "planned", details: ["Les conditions spécifiques de la Marketplace seront publiées après validation."] },
    { title: "Politique de confidentialité", description: "Les principes de traitement et de protection des données.", icon: "🔏", status: "planned", details: ["La politique officielle sera consultable ici après validation juridique."] },
    { title: "Gestion des cookies", description: "Comprendre les éléments enregistrés par le navigateur.", icon: "🍪", status: "planned", details: ["Les informations et choix relatifs aux cookies seront détaillés dans cette rubrique."] },
    { title: "Mentions légales et propriété intellectuelle", description: "L’éditeur et les droits liés à YÉRÉ.", icon: "©", status: "planned", details: ["Les mentions légales seront publiées après finalisation des informations officielles de l’éditeur."] }
  ]}
];

export default function SettingsCenter({ role, onBack, onNavigate, serverSyncStatus }: Props) {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [selected, setSelected] = useState<SettingItem | null>(null);
  const [expanded, setExpanded] = useState<string>("Mon compte");

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  const roleLabel = role === "proprietaire" ? "Propriétaire" : role === "gestionnaire" ? "Gestionnaire" : "Employé";
  const itemCount = sections.reduce((total, section) => total + section.items.length, 0);
  const plannedCount = sections.reduce((total, section) => total + section.items.filter(item => item.status === "planned").length, 0);
  const destinations: Record<string, SettingsDestination> = { "Profil et coordonnées": "account", "Informations de l’atelier": "account", "Membres et invitations": "team", "Rôles et autorisations": "team", "Bien démarrer avec YÉRÉ": "clients", "Clients et mensurations": "clients", "Commandes et suivi de confection": "orders", "Stock et fournisseurs": "stock", "Marketplace": "marketplace" };

  return (
    <section className="content-card dtech-settings" aria-labelledby="dtech-settings-title">
      <div className="dtech-settings-hero">
        <div className="dtech-settings-top">
          <div><p className="eyebrow">ESPACE PERSONNEL · DTECH</p><h2 id="dtech-settings-title">Centre des paramètres</h2><p>Un espace clair pour gérer votre compte, votre atelier et découvrir toutes les fonctions de YÉRÉ.</p></div>
          <span className="dtech-editor-mark">YÉRÉ<span>by DTech</span></span>
        </div>
        <div className="dtech-settings-metrics">
          <div><strong>{itemCount}</strong><span>rubriques</span></div>
          <div><strong>{sections.length}</strong><span>espaces</span></div>
          <div><strong>{plannedCount}</strong><span>en préparation</span></div>
        </div>
      </div>

      <div className={`dtech-settings-status ${online ? "is-online" : "is-offline"}`} role="status">
        <span className="dtech-status-dot" />
        <div><strong>{online ? "Connexion Internet détectée" : "Mode consultation hors ligne"}</strong><small>{online ? "Les données affichées sont celles confirmées par Supabase." : serverSyncStatus === "ready" ? "Les informations déjà chargées restent consultables tant que cet écran reste ouvert. Aucune modification ne peut être enregistrée hors ligne." : "Aucune donnée métier n’est disponible hors ligne pour cette session."}</small></div>
      </div>

      <div className="dtech-settings-layout">
        <nav className="dtech-settings-nav" aria-label="Rubriques des paramètres">
          <p className="dtech-settings-nav-label">VOTRE ESPACE</p>
          {sections.map((section, index) => <button type="button" key={section.title} className={expanded === section.title ? "active" : ""} onClick={() => { setExpanded(section.title); setSelected(null); }}><span className="dtech-nav-icon">{section.icon}</span><span>{section.title}</span><small>{String(index + 1).padStart(2, "0")}</small></button>)}
          <div className="dtech-settings-role"><span>VOTRE RÔLE</span><strong>{roleLabel}</strong><small>Accès contrôlé par Supabase</small></div>
        </nav>
        <div className="dtech-settings-main">
          {sections.filter(section => section.title === expanded).map(section => <div key={section.title}>
            <div className="dtech-settings-section-heading"><div><p className="eyebrow">ESPACE {String(sections.findIndex(s => s.title === section.title) + 1).padStart(2, "0")}</p><h3>{section.title}</h3><p>{section.description}</p></div><span>{section.items.length} rubriques</span></div>
            <div className="dtech-settings-items">{section.items.map((item) => <button type="button" className="dtech-settings-item" key={item.title} onClick={() => setSelected(item)}><span className="dtech-settings-item-icon">{item.icon}</span><span className="dtech-settings-item-copy"><strong>{item.title}</strong><small>{item.description}</small></span><span className={item.status === "planned" ? "dtech-item-status planned" : "dtech-item-status ready"}>{item.status === "planned" ? "À venir" : "Consulter"}</span><span className="dtech-item-arrow">›</span></button>)}</div>
          </div>)}
          {selected && <section className="dtech-settings-detail" aria-live="polite"><div className="dtech-detail-head"><div><p className="eyebrow">DÉTAIL DE LA RUBRIQUE</p><h3>{selected.icon} {selected.title}</h3><p>{selected.description}</p></div><button type="button" aria-label="Fermer le détail" onClick={() => setSelected(null)}>×</button></div><ul>{selected.details.map((detail, index) => <li key={index}>{detail}</li>)}</ul><div className={selected.status === "planned" ? "dtech-detail-note planned" : "dtech-detail-note"}><strong>{selected.status === "planned" ? "Fonction en préparation" : "Service YÉRÉ disponible"}</strong><span>{selected.status === "planned" ? "Cette rubrique est consultable, mais son action complète n’est pas encore disponible. Aucune modification fictive n’est enregistrée." : "Ouvrez le module YÉRÉ correspondant pour effectuer vos opérations. Les données restent contrôlées par les services de l’atelier."}</span></div>{selected.status !== "planned" && destinations[selected.title] && <button type="button" className="primary-button dtech-open-service" onClick={() => onNavigate(destinations[selected.title])}>Ouvrir le service YÉRÉ →</button>}</section>}
        </div>
      </div>

      <section className="dtech-offline-card"><div><p className="eyebrow">SÉCURITÉ DES DONNÉES</p><h3>Mode hors ligne sécurisé</h3><p>Première étape : les données déjà chargées restent consultables en mémoire pendant une coupure réseau. Les écritures sont bloquées avant envoi. Aucune modification hors ligne n’est mise en attente ou présentée comme enregistrée.</p></div><ul><li>Supabase reste la source officielle des données.</li><li>Les anciennes archives locales ne sont ni importées ni supprimées.</li><li>La caisse, les paiements et les dépenses ne sont jamais mis en cache par cette étape.</li><li>Marketplace, paiements en ligne, invitations et modifications nécessitent Internet.</li></ul></section>

      <div className="dtech-settings-about"><div><span>Application</span><strong>YÉRÉ</strong></div><div><span>Éditeur</span><strong>DTech</strong></div><div><span>Votre rôle</span><strong>{roleLabel}</strong></div></div>
      <p className="privacy-note">Les données métier ne sont pas enregistrées localement. Si vous rechargez ou fermez l’application hors ligne, elles ne seront plus disponibles jusqu’à la reconnexion. Les anciennes archives locales restent séparées et ne sont jamais réimportées automatiquement.</p>
      <div className="dtech-settings-actions"><button type="button" className="secondary-button" onClick={onBack}>← Retour à mon atelier</button>{online && serverSyncStatus === "ready" && <button type="button" className="primary-button" onClick={() => window.location.reload()}>Actualiser les données du serveur</button>}</div>
    </section>
  );
}
