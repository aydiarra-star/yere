import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync("public/sw.js", "utf8");
type WaitEvent = { waitUntil: (task: Promise<unknown>) => void };
type FetchEvent = { request: { method: string; url: string; mode: string }; respondWith: (task: Promise<unknown>) => void };

function worker(scope: string, existingKeys: string[] = []) {
  const listeners: Record<string, (event: WaitEvent | FetchEvent) => void> = {};
  const cache = { addAll: vi.fn(async (_urls: Request[]) => {}), add: vi.fn(async (_url: Request) => {}), put: vi.fn(async (_request: unknown, _response: unknown) => {}), match: vi.fn(async (_key: unknown): Promise<unknown> => undefined) };
  const caches = { open: vi.fn(async (_key: string) => cache), keys: vi.fn(async () => existingKeys), delete: vi.fn(async (_key: string) => true) };
  const skipWaiting = vi.fn(async () => {});
  const claim = vi.fn(async () => {});
  const fetch = vi.fn(async (_request: unknown, _options?: unknown): Promise<unknown> => { throw new Error("offline"); });
  const self = { registration: { scope }, addEventListener: (name: string, listener: (event: WaitEvent | FetchEvent) => void) => { listeners[name] = listener; }, skipWaiting, clients: { claim } };
  runInNewContext(source, { self, caches, URL, Request, Response, fetch });

  async function dispatchWait(name: "install" | "activate") {
    let task: Promise<unknown> = Promise.resolve();
    listeners[name]({ waitUntil: (value: Promise<unknown>) => { task = value; } });
    await task;
  }
  async function dispatchFetch(request: FetchEvent["request"]) {
    let task: Promise<unknown> | undefined;
    listeners.fetch({ request, respondWith: (value: Promise<unknown>) => { task = value; } });
    return task ? await task : undefined;
  }
  return { cache, caches, skipWaiting, claim, fetch, dispatchWait, dispatchFetch };
}

describe("service worker YÉRÉ", () => {
  it("précharge les illustrations depuis le sous-dossier installé", async () => {
    const sw = worker("https://atelier.test/yere/");
    await sw.dispatchWait("install");
    expect(sw.caches.open).toHaveBeenCalledWith("yere-atelier-shell-%2Fyere%2F-v8");
    const requests = sw.cache.addAll.mock.calls[0][0];
    expect(requests.every((request) => request.cache === "no-store")).toBe(true);
    expect(Array.from(requests, (request) => request.url)).toEqual([
      "https://atelier.test/yere/",
      "https://atelier.test/yere/manifest.webmanifest",
      "https://atelier.test/yere/images/delivery-reference.webp",
      "https://atelier.test/yere/images/payment-reference.webp",
      "https://atelier.test/yere/images/production-reference.webp",
      "https://atelier.test/yere/images/atelier.webp"
    ]);
    expect(sw.skipWaiting).toHaveBeenCalledOnce();
  });

  it("précharge aussi les fichiers JS et CSS produits par Vite dès la première installation", async () => {
    const sw = worker("https://atelier.test/yere/");
    sw.cache.match.mockResolvedValue(new Response('<script type="module" src="./assets/app-hash.js"></script><link rel="stylesheet" href="./assets/app-hash.css">'));
    await sw.dispatchWait("install");
    expect(sw.cache.add).toHaveBeenCalledTimes(2);
    expect(sw.cache.add.mock.calls.map(([request]) => [request.url, request.cache])).toEqual([
      ["https://atelier.test/yere/assets/app-hash.js", "no-store"],
      ["https://atelier.test/yere/assets/app-hash.css", "no-store"]
    ]);
  });

  it("ne supprime pas les caches d’une autre installation sur le même domaine", async () => {
    const sw = worker("https://atelier.test/yere/", [
      "yere-atelier-shell-v6",
      "yere-atelier-shell-%2F-v8",
      "yere-atelier-shell-%2Fyere%2F-v7",
      "yere-atelier-shell-%2Fyere%2F-v8",
      "unrelated-cache"
    ]);
    await sw.dispatchWait("activate");
    expect(sw.caches.delete).toHaveBeenCalledTimes(1);
    expect(sw.caches.delete).toHaveBeenCalledWith("yere-atelier-shell-%2Fyere%2F-v7");
    expect(sw.claim).toHaveBeenCalledOnce();
  });

  it("nettoie l’ancien cache non-scopé lors de la mise à jour à la racine", async () => {
    const sw = worker("https://atelier.test/", ["yere-atelier-shell-v6", "yere-atelier-shell-%2F-v8"]);
    await sw.dispatchWait("activate");
    expect(sw.caches.delete).toHaveBeenCalledWith("yere-atelier-shell-v6");
    expect(sw.caches.delete).toHaveBeenCalledTimes(1);
  });

  it("actualise les illustrations dans le cache après un chargement en ligne", async () => {
    const sw = worker("https://atelier.test/yere/");
    const clone = { cached: true };
    const response = { ok: true, type: "basic", clone: () => clone };
    sw.fetch.mockResolvedValue(response);
    const request = { method: "GET", url: "https://atelier.test/yere/images/delivery-reference.webp", mode: "no-cors" };
    await expect(sw.dispatchFetch(request)).resolves.toBe(response);
    expect(sw.fetch).toHaveBeenCalledWith(request, { cache: "no-store" });
    expect(sw.cache.put).toHaveBeenCalledWith(request, clone);
  });

  it("retrouve la bonne page en cache hors ligne et ignore les autres chemins", async () => {
    const sw = worker("https://atelier.test/yere/");
    const cachedPage = { cached: true };
    sw.cache.match.mockImplementation(async (key: unknown) => key === "https://atelier.test/yere/" ? cachedPage : undefined);
    await expect(sw.dispatchFetch({ method: "GET", url: "https://atelier.test/yere/", mode: "navigate" })).resolves.toBe(cachedPage);
    await expect(sw.dispatchFetch({ method: "GET", url: "https://atelier.test/another-app/", mode: "navigate" })).resolves.toBeUndefined();
  });
});
