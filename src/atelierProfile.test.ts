import { describe, expect, it } from "vitest";
import { atelierActivities, emptyAtelier, isAtelierProfileValid, normalizeAtelierProfile, workModes, getActivityExperience } from "./atelierProfile";
describe("YÉRÉ tailleur-only profile", () => {
  it("offers only the tailleur profession", () => { expect(atelierActivities.map((a) => a.label)).toEqual(["Tailleur"]); });
  it("keeps work organization independent from profession", () => {
    expect(workModes.map((m) => m.value)).toEqual(["independent", "collaborators", "team"]);
    expect(normalizeAtelierProfile({ ...emptyAtelier, activity: "tailleur", workMode: "team" })).toMatchObject({ activity: "tailleur", workMode: "team" });
  });
  it("migrates legacy profiles without losing atelier details", () => {
    expect(normalizeAtelierProfile({ name: "Atelier A", phone: "770000000", city: "Dakar" })).toEqual({ name: "Atelier A", phone: "770000000", city: "Dakar", activity: "tailleur", workMode: "independent", secondaryActivities: [] });
    expect(normalizeAtelierProfile({ name: "Atelier B", phone: "771111111", city: "Thiès", activity: "styliste", workMode: "team", secondaryActivities: ["couturier"] })).toEqual({ name: "Atelier B", phone: "771111111", city: "Thiès", activity: "tailleur", workMode: "team", secondaryActivities: [] });
  });
  it("accepts legacy values for migration but rejects malformed profiles", () => {
    expect(isAtelierProfileValid({ name: "A", phone: "", city: "" })).toBe(true);
    expect(isAtelierProfileValid({ name: "A", phone: "", city: "", activity: "styliste" })).toBe(true);
    expect(isAtelierProfileValid({ name: "A", phone: "", city: "", activity: "unknown" })).toBe(false);
    expect(isAtelierProfileValid({ name: "A", phone: "", city: "", workMode: "unknown" })).toBe(false);
    expect(isAtelierProfileValid(null)).toBe(false);
  });
  it("always presents the tailleur dashboard", () => { expect(getActivityExperience("tailleur")).toMatchObject({ label: "Tailleur", tipTitle: "Une bonne couture commence par une bonne mesure." }); });
});
