import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { illustrationPaths } from "./illustrations";

const verifier = resolve("scripts/verify-build.mjs");
const tempDirectories: string[] = [];

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function fakeBuild(options: { base?: string; omitImage?: string; omitReference?: string; omitCached?: string; manifestScope?: string } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "yere-build-test-"));
  tempDirectories.push(directory);
  const dist = join(directory, "dist");
  const put = (path: string, contents: string | Buffer) => {
    const file = join(dist, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, contents);
  };
  const base = options.base ?? "./";
  put("index.html", `<script type="module" src="${base}assets/app.js"></script><link rel="stylesheet" href="${base}assets/app.css">`);
  put("assets/app.js", Object.values(illustrationPaths).filter((path) => path !== options.omitReference).join("\n"));
  put("assets/app.css", "/* compiled stylesheet */");
  put("sw.js", Object.values(illustrationPaths).filter((path) => path !== options.omitCached).join("\n"));
  put("manifest.webmanifest", JSON.stringify({ start_url: "./", scope: options.manifestScope ?? "./" }));
  for (const path of Object.values(illustrationPaths)) {
    if (path === options.omitImage) continue;
    const bytes = Buffer.alloc(1024);
    bytes.write("RIFF", 0);
    bytes.write("WEBP", 8);
    put(path, bytes);
  }
  return spawnSync(process.execPath, [verifier], { cwd: directory, encoding: "utf8" });
}

describe("vérification de l’artefact de déploiement", () => {
  it.each(["./", "/yere/"])("accepte un build complet avec la base %s", (base) => {
    const result = fakeBuild({ base });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("4 illustrations présentes");
  });

  it("échoue si une illustration est absente du build", () => {
    const result = fakeBuild({ omitImage: illustrationPaths.delivery });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`Fichier absent du build : ${illustrationPaths.delivery}`);
  });

  it("échoue si le code compilé ne référence pas une illustration", () => {
    const result = fakeBuild({ omitReference: illustrationPaths.payment });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`Illustration non référencée par l'application compilée : ${illustrationPaths.payment}`);
  });

  it("échoue si le service worker ne précharge pas une illustration", () => {
    const result = fakeBuild({ omitCached: illustrationPaths.production });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`Illustration absente du cache d'installation : ${illustrationPaths.production}`);
  });

  it("détecte un manifeste incompatible avec un sous-dossier", () => {
    const result = fakeBuild({ manifestScope: "/" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Le manifeste ne peut pas être installé en sous-dossier : scope");
  });
});
