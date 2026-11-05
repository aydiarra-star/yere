import { describe, expect, it } from "vitest";
import { requireActiveAtelierMember, type AtelierMember } from "./atelierTeam";

const member = (userId: string, active: boolean, role: AtelierMember["role"] = "employe"): AtelierMember => ({
  atelierId: "atelier-a", userId, role, active, createdAt: "2026-11-04T00:00:00Z",
  professionalName: "", specialties: [], experienceLevel: null, presentation: ""
});

describe("active atelier membership guard", () => {
  it("returns the active membership for the current account", () => {
    expect(requireActiveAtelierMember([member("user-a", true, "proprietaire")], "user-a", "atelier-a").role).toBe("proprietaire");
  });

  it("rejects an account that has no membership in the selected atelier", () => {
    expect(() => requireActiveAtelierMember([member("user-b", true)], "user-a", "atelier-a")).toThrow(/accès à cet atelier n’est pas actif/);
  });

  it("rejects a membership that has been deactivated", () => {
    expect(() => requireActiveAtelierMember([member("user-a", false, "gestionnaire")], "user-a", "atelier-a")).toThrow(/accès à cet atelier n’est pas actif/);
  });


  it("rejects an active membership belonging to a different atelier", () => {
    const otherAtelier = { ...member("user-a", true), atelierId: "atelier-b" };
    expect(() => requireActiveAtelierMember([otherAtelier], "user-a", "atelier-a")).toThrow();
  });
  it("does not mistake another account or inactive duplicate for active access", () => {
    expect(() => requireActiveAtelierMember([member("user-a", false), member("user-ab", true)], "user-a", "atelier-a")).toThrow();
  });
});
