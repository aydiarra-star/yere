import { describe, expect, it } from "vitest";
import {
  atelierActivities,
  emptyAtelier,
  isAtelierProfileValid,
  normalizeAtelierProfile,
  toggleSecondaryActivity,
  withPrimaryActivity,
  workModes
} from "./atelierProfile";

describe("YÉRÉ atelier profile", () => {
  it("offers all five target professional activities", () => {
    expect(atelierActivities.map((activity) => activity.label)).toEqual([
      "Tailleur",
      "Couturier",
      "Couturière",
      "Styliste",
      "Atelier de confection"
    ]);
  });

  it("keeps the professional activity separate from work organization", () => {
    expect(workModes.map((mode) => mode.value)).toEqual(["independent", "collaborators", "team"]);
    expect(normalizeAtelierProfile({ ...emptyAtelier, activity: "styliste", workMode: "team" })).toMatchObject({
      activity: "styliste",
      workMode: "team"
    });
  });

  it("normalizes an older local profile without losing existing information", () => {
    expect(normalizeAtelierProfile({ name: "Atelier A", phone: "770000000", city: "Dakar" })).toEqual({
      name: "Atelier A",
      phone: "770000000",
      city: "Dakar",
      activity: "tailleur",
      workMode: "independent",
      secondaryActivities: []
    });
  });

  it("accepts legacy profiles but rejects invalid activity or work mode values", () => {
    expect(isAtelierProfileValid({ name: "A", phone: "", city: "" })).toBe(true);
    expect(isAtelierProfileValid({ name: "A", phone: "", city: "", activity: "unknown" })).toBe(false);
    expect(isAtelierProfileValid({ name: "A", phone: "", city: "", workMode: "unknown" })).toBe(false);
    expect(isAtelierProfileValid(null)).toBe(false);
  });
});

describe("activity-specific dashboard experience", () => {
  it("provides tailored shortcuts for every target activity", async () => {
    const { getActivityExperience } = await import("./atelierProfile");
    for (const activity of atelierActivities) {
      const experience = getActivityExperience(activity.value);
      expect(experience.label).toBe(activity.label);
      expect(experience.shortcuts).toHaveLength(2);
      expect(experience.tipTitle.length).toBeGreaterThan(10);
    }
  });

  it("keeps common client and order concepts while adapting the shortcuts", async () => {
    const { getActivityExperience } = await import("./atelierProfile");
    expect(getActivityExperience("tailleur").shortcuts.map((item) => item.action)).toEqual(["new-client", "measurements"]);
    expect(getActivityExperience("styliste").shortcuts.map((item) => item.action)).toEqual(["new-order", "marketplace"]);
    expect(getActivityExperience("atelier_confection").shortcuts.map((item) => item.action)).toEqual(["new-order", "stock"]);
  });
});

describe("secondary professional activities", () => {
  it("supports multiple activities without creating a second profile", () => {
    let profile = normalizeAtelierProfile({ name: "Atelier A", phone: "", city: "", activity: "tailleur" });
    profile = toggleSecondaryActivity(profile, "couturiere", true);
    profile = toggleSecondaryActivity(profile, "styliste", true);
    expect(profile).toMatchObject({ activity: "tailleur", secondaryActivities: ["couturiere", "styliste"] });
  });

  it("removes an activity when it becomes the primary activity", () => {
    const profile = withPrimaryActivity({
      ...emptyAtelier,
      activity: "tailleur",
      secondaryActivities: ["couturiere", "styliste"]
    }, "couturiere");
    expect(profile.activity).toBe("couturiere");
    expect(profile.secondaryActivities).toEqual(["styliste"]);
  });

  it("does not add the primary activity to the secondary list or duplicate selections", () => {
    let profile = { ...emptyAtelier, activity: "tailleur" as const, secondaryActivities: [] as ("couturier" | "couturiere" | "styliste" | "atelier_confection")[] };
    profile = toggleSecondaryActivity(profile, "styliste", true);
    profile = toggleSecondaryActivity(profile, "styliste", true);
    expect(profile.secondaryActivities).toEqual(["styliste"]);
    expect(isAtelierProfileValid({ ...profile, secondaryActivities: ["styliste", "styliste"] })).toBe(false);
    expect(isAtelierProfileValid({ ...profile, secondaryActivities: ["tailleur"] })).toBe(false);
  });

  it("preserves secondary activities through normalization and rejects unknown values", () => {
    expect(normalizeAtelierProfile({
      name: "Atelier B", phone: "", city: "", activity: "couturier", secondaryActivities: ["styliste"]
    }).secondaryActivities).toEqual(["styliste"]);
    expect(isAtelierProfileValid({
      name: "Atelier B", phone: "", city: "", activity: "couturier", secondaryActivities: ["invented"]
    })).toBe(false);
  });
});
