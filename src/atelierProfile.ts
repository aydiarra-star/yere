export const atelierActivities = [
  { value: "tailleur", label: "Tailleur" },
  { value: "couturier", label: "Couturier" },
  { value: "couturiere", label: "Couturière" },
  { value: "styliste", label: "Styliste" },
  { value: "atelier_confection", label: "Atelier de confection" }
] as const;

export type AtelierActivity = (typeof atelierActivities)[number]["value"];

export const workModes = [
  { value: "independent", label: "Je travaille seul(e)" },
  { value: "collaborators", label: "Je travaille avec des collaborateurs" },
  { value: "team", label: "Je gère un atelier en équipe" }
] as const;

export type WorkMode = (typeof workModes)[number]["value"];

export type AtelierProfile = {
  name: string;
  phone: string;
  city: string;
  /** Optional so profiles saved by earlier prototype versions remain compatible. */
  activity?: AtelierActivity;
  /** Separate from activity: a stylist, couturière or tailor can also manage a team. */
  workMode?: WorkMode;
};

export const emptyAtelier: AtelierProfile = {
  name: "",
  phone: "",
  city: "",
  activity: "tailleur",
  workMode: "independent"
};

export function isAtelierActivity(value: unknown): value is AtelierActivity {
  return atelierActivities.some((activity) => activity.value === value);
}

export function isWorkMode(value: unknown): value is WorkMode {
  return workModes.some((mode) => mode.value === value);
}

export function isAtelierProfileValid(value: unknown): value is AtelierProfile {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const profile = value as Record<string, unknown>;
  return typeof profile.name === "string"
    && typeof profile.phone === "string"
    && typeof profile.city === "string"
    && (profile.activity === undefined || isAtelierActivity(profile.activity))
    && (profile.workMode === undefined || isWorkMode(profile.workMode));
}

/** Adds safe defaults to older local profiles without discarding their existing fields. */
export function normalizeAtelierProfile(value: unknown): AtelierProfile {
  if (!isAtelierProfileValid(value)) return { ...emptyAtelier };
  return {
    name: value.name,
    phone: value.phone,
    city: value.city,
    activity: value.activity ?? "tailleur",
    workMode: value.workMode ?? "independent"
  };
}

export type ActivityShortcut = {
  action: "new-client" | "measurements" | "new-order" | "stock" | "marketplace";
  title: string;
  description: string;
};

export type ActivityExperience = {
  label: string;
  tipTitle: string;
  tipDescription: string;
  shortcuts: [ActivityShortcut, ActivityShortcut];
};

/** Personalizes dashboard copy and shortcuts while preserving the shared modules. */
export function getActivityExperience(activity: AtelierActivity | undefined): ActivityExperience {
  switch (activity) {
    case "couturier":
    case "couturiere":
      return {
        label: activity === "couturiere" ? "Couturière" : "Couturier",
        tipTitle: "Suivez chaque confection jusqu'à la livraison.",
        tipDescription: "Reliez les commandes aux étapes de confection et gardez les tissus et fournitures à portée de main.",
        shortcuts: [
          { action: "new-order", title: "Nouvelle commande", description: "Enregistrer une confection à suivre" },
          { action: "stock", title: "Gérer les tissus", description: "Consulter les tissus et fournitures" }
        ]
      };
    case "styliste":
      return {
        label: "Styliste",
        tipTitle: "Donnez une suite claire à vos créations.",
        tipDescription: "Rassemblez les demandes personnalisées dans les commandes et préparez une vitrine de vos réalisations.",
        shortcuts: [
          { action: "new-order", title: "Commande personnalisée", description: "Enregistrer une demande client" },
          { action: "marketplace", title: "Préparer une vitrine", description: "Préparer la présentation locale de vos créations" }
        ]
      };
    case "atelier_confection":
      return {
        label: "Atelier de confection",
        tipTitle: "Gardez les commandes et les fournitures en vue.",
        tipDescription: "Suivez les commandes en cours et vérifiez les tissus et consommables nécessaires à la production.",
        shortcuts: [
          { action: "new-order", title: "Suivre la production", description: "Créer ou consulter une commande" },
          { action: "stock", title: "Gérer les fournitures", description: "Consulter les stocks et achats" }
        ]
      };
    case "tailleur":
    default:
      return {
        label: "Tailleur",
        tipTitle: "Une bonne couture commence par une bonne mesure.",
        tipDescription: "Conservez les mensurations de chaque client pour gagner du temps lors de sa prochaine commande.",
        shortcuts: [
          { action: "new-client", title: "Ajouter un client", description: "Créer une fiche client" },
          { action: "measurements", title: "Retrouver des mesures", description: "Consulter les fiches et historiques" }
        ]
      };
  }
}
