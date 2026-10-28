import { describe, expect, it } from "vitest";
import {
  atelierActivities,
  emptyAtelier,
  isAtelierProfileValid,
  normalizeAtelierProfile,
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
      workMode: "independent"
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
