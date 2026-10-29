import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

type StaticService = {
  type: string;
  name: string;
  runtime: string;
  buildCommand: string;
  staticPublishPath: string;
  headers: { path: string; name: string; value: string }[];
};

const config = parse(readFileSync("render.yaml", "utf8")) as { services: StaticService[] };
const service = config.services.find((item) => item.name === "yere-atelier");

describe("configuration Render proposée", () => {
  it("décrit un site statique qui compile et vérifie les fichiers avant publication", () => {
    expect(service).toMatchObject({
      type: "web",
      runtime: "static",
      buildCommand: "npm ci --include=dev && npm test && npm run build",
      staticPublishPath: "./dist"
    });
  });

  it("évite le cache HTTP des fichiers nécessaires à la mise à jour", () => {
    const headers = service?.headers ?? [];
    for (const path of ["/", "/index.html", "/sw.js", "/manifest.webmanifest", "/images/*"]) {
      expect(headers).toContainEqual({ path, name: "Cache-Control", value: "no-store" });
    }
  });

  it("définit une version Node exacte compatible avec la compilation testée", () => {
    expect(readFileSync(".node-version", "utf8").trim()).toMatch(/^22\.\d+\.\d+$/);
  });
});
