import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { illustrationPaths, illustrationUrl } from "./illustrations";

describe("illustrations de l’accueil", () => {
  it("résout les images à la racine, en sous-dossier et avec une base relative", () => {
    expect(illustrationUrl("delivery", "/")).toBe("/images/delivery-reference.webp");
    expect(illustrationUrl("payment", "/yere/")).toBe("/yere/images/payment-reference.webp");
    expect(illustrationUrl("production", "./")).toBe("./images/production-reference.webp");
    expect(illustrationUrl("atelier", "./")).toBe("./images/atelier.webp");
  });

  it("fournit les quatre fichiers WebP attendus dans public pour la compilation", () => {
    for (const path of Object.values(illustrationPaths)) {
      const file = readFileSync(resolve("public", path));
      expect(file.length).toBeGreaterThan(1000);
      expect(file.subarray(0, 4).toString()).toBe("RIFF");
      expect(file.subarray(8, 12).toString()).toBe("WEBP");
    }
  });
});
