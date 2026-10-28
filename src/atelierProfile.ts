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
