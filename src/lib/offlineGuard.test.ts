import { describe, expect, it } from "vitest";
import { assertNetworkForWrite } from "./offlineGuard";

describe("protection des écritures hors ligne", () => {
  it("autorise les lectures même sans réseau", () => {
    expect(() => assertNetworkForWrite("GET", false)).not.toThrow();
    expect(() => assertNetworkForWrite(undefined, false)).not.toThrow();
    expect(() => assertNetworkForWrite("HEAD", false)).not.toThrow();
    expect(() => assertNetworkForWrite("OPTIONS", false)).not.toThrow();
  });

  it("bloque toute modification avant envoi quand le navigateur est hors ligne", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(() => assertNetworkForWrite(method, false))
        .toThrow(/hors ligne.*pas été envoyée ni enregistrée/i);
    }
  });

  it("autorise les modifications lorsque le réseau est disponible", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(() => assertNetworkForWrite(method, true)).not.toThrow();
    }
  });

  it("traite les méthodes sans distinction de casse", () => {
    expect(() => assertNetworkForWrite("post", false)).toThrow(/hors ligne/i);
    expect(() => assertNetworkForWrite("get", false)).not.toThrow();
  });
});
