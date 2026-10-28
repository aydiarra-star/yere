export const atelierActivities = [{ value: "tailleur", label: "Tailleur" }] as const;
export type AtelierActivity = "tailleur";
const legacyActivityValues = ["tailleur", "couturier", "couturiere", "styliste", "atelier_confection"] as const;
export const workModes = [
  { value: "independent", label: "Je travaille seul(e)" },
  { value: "collaborators", label: "Je travaille avec des collaborateurs" },
  { value: "team", label: "Je gère un atelier en équipe" }
] as const;
export type WorkMode = (typeof workModes)[number]["value"];
export type AtelierProfile = { name: string; phone: string; city: string; activity?: AtelierActivity; workMode?: WorkMode; secondaryActivities?: AtelierActivity[] };
export const emptyAtelier: AtelierProfile = { name: "", phone: "", city: "", activity: "tailleur", workMode: "independent", secondaryActivities: [] };
export function isAtelierActivity(value: unknown): value is AtelierActivity { return value === "tailleur"; }
export function isWorkMode(value: unknown): value is WorkMode { return workModes.some((mode) => mode.value === value); }
/** Accept legacy activity values so old profiles can be migrated without losing atelier details. */
export function isAtelierProfileValid(value: unknown): value is AtelierProfile {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const p = value as Record<string, unknown>;
  return typeof p.name === "string" && typeof p.phone === "string" && typeof p.city === "string"
    && (p.activity === undefined || legacyActivityValues.includes(p.activity as typeof legacyActivityValues[number]))
    && (p.workMode === undefined || isWorkMode(p.workMode))
    && (p.secondaryActivities === undefined || (Array.isArray(p.secondaryActivities) && p.secondaryActivities.every((v) => legacyActivityValues.includes(v as typeof legacyActivityValues[number]))));
}
export function normalizeAtelierProfile(value: unknown): AtelierProfile {
  if (!isAtelierProfileValid(value)) return { ...emptyAtelier };
  return { name: value.name, phone: value.phone, city: value.city, activity: "tailleur", workMode: value.workMode ?? "independent", secondaryActivities: [] };
}
export function withPrimaryActivity(profile: AtelierProfile, _activity: AtelierActivity): AtelierProfile { return { ...profile, activity: "tailleur", secondaryActivities: [] }; }
export function toggleSecondaryActivity(profile: AtelierProfile, _activity: AtelierActivity, _enabled: boolean): AtelierProfile { return { ...profile, activity: "tailleur", secondaryActivities: [] }; }
export type ActivityShortcut = { action: "new-client" | "measurements" | "new-order" | "stock" | "marketplace"; title: string; description: string };
export type ActivityExperience = { label: string; tipTitle: string; tipDescription: string; shortcuts: [ActivityShortcut, ActivityShortcut] };
export function getActivityExperience(_activity?: AtelierActivity): ActivityExperience {
  return { label: "Tailleur", tipTitle: "Une bonne couture commence par une bonne mesure.", tipDescription: "Conservez les mensurations de chaque client pour gagner du temps lors de sa prochaine commande.", shortcuts: [
    { action: "new-client", title: "Ajouter un client", description: "Créer une fiche client" },
    { action: "measurements", title: "Retrouver des mesures", description: "Consulter les fiches et historiques" }
  ] };
}
