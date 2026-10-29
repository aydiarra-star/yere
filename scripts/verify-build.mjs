import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const dist = resolve("dist");
const illustrations = [
  "images/delivery-reference.webp",
  "images/payment-reference.webp",
  "images/production-reference.webp",
  "images/atelier.webp"
];

async function requireFile(path) {
  try {
    return await readFile(join(dist, path));
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error(`Fichier absent du build : ${path}`);
    throw error;
  }
}

// Vite can emit ./assets/... or /base/assets/... depending on the configured base.
function buildAssetPath(url) {
  const resolved = new URL(url, "https://build.invalid/");
  if (resolved.origin !== "https://build.invalid") throw new Error(`Asset externe inattendu : ${url}`);
  const pathname = resolved.pathname;
  const marker = "/assets/";
  const index = pathname.lastIndexOf(marker);
  if (index < 0) throw new Error(`Référence Vite inattendue : ${url}`);
  const path = pathname.slice(index + 1);
  if (path.split("/").includes("..")) throw new Error(`Chemin d'asset invalide : ${url}`);
  return path;
}

async function verifyBuild() {
  const html = (await requireFile("index.html")).toString("utf8");
  const script = [...html.matchAll(/<script\b[^>]*>/gi)]
    .find(([tag]) => /\btype=["']module["']/i.test(tag))?.[0]
    .match(/\bsrc=["']([^"']+)["']/i)?.[1];
  const stylesheet = [...html.matchAll(/<link\b[^>]*>/gi)]
    .find(([tag]) => /\brel=["']stylesheet["']/i.test(tag))?.[0]
    .match(/\bhref=["']([^"']+)["']/i)?.[1];
  if (!script || !stylesheet) throw new Error("Le HTML compilé ne référence pas son JavaScript et sa feuille de style.");

  const javascript = (await requireFile(buildAssetPath(script))).toString("utf8");
  await requireFile(buildAssetPath(stylesheet));
  const worker = (await requireFile("sw.js")).toString("utf8");
  const manifest = JSON.parse((await requireFile("manifest.webmanifest")).toString("utf8"));
  if (!manifest.start_url || !manifest.scope) throw new Error("Le manifeste ne précise pas l'URL et le périmètre de l'application.");
  const nestedManifest = new URL("https://build.invalid/yere/manifest.webmanifest");
  for (const field of ["start_url", "scope"]) {
    if (!new URL(manifest[field], nestedManifest).href.startsWith("https://build.invalid/yere/")) {
      throw new Error(`Le manifeste ne peut pas être installé en sous-dossier : ${field}.`);
    }
  }

  for (const image of illustrations) {
    const bytes = await requireFile(image);
    if (bytes.length < 1000 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") {
      throw new Error(`Illustration WebP invalide : ${image}`);
    }
    if (!javascript.includes(image)) throw new Error(`Illustration non référencée par l'application compilée : ${image}`);
    if (!worker.includes(image)) throw new Error(`Illustration absente du cache d'installation : ${image}`);
  }

  console.log(`Build vérifié : ${illustrations.length} illustrations présentes, référencées et incluses dans le cache.`);
}

verifyBuild().catch((error) => {
  console.error(`Vérification du build échouée : ${error.message}`);
  process.exitCode = 1;
});
