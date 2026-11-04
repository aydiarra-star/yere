import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import {
  decryptOfflinePayload,
  encryptOfflinePayload,
  OFFLINE_CACHE_TTL_MS,
  isOfflineCacheFresh,
  isAtelierOfflineVaultKey,
  isUserOfflineVaultKey,
  sanitizeOfflineSnapshot,
  saveOfflineSnapshot,
  readOfflineSnapshot,
  purgeOfflineVault,
  purgeUserOfflineVault
} from "./offlineVault";

const context = { userId: "user-a", atelierId: "atelier-a" };

describe("offline vault snapshot protection", () => {
  it("limits cached order fields and strips all financial values", () => {
    const result = sanitizeOfflineSnapshot("orders", [{
      id: "ref-1", serverId: "order-1", clientId: "client-1", garment: "Boubou",
      dueDate: "2026-11-10", orderedAt: "2026-11-01", status: "En confection",
      price: 50000, deposit: 20000, payments: [{ amount: 20000 }],
      measurementSnapshot: { bust: "90", waist: "70", privateExtra: "remove" },
      privateExtra: "remove"
    }]) as Array<Record<string, unknown>>;
    expect(result[0]).not.toHaveProperty("price");
    expect(result[0]).not.toHaveProperty("deposit");
    expect(result[0]).not.toHaveProperty("payments");
    expect(result[0]).not.toHaveProperty("privateExtra");
    expect(result[0].measurementSnapshot).toEqual({ bust: "90", waist: "70" });
  });

  it("keeps only approved client and measurement fields", () => {
    const result = sanitizeOfflineSnapshot("clients", [{
      id: "client-1", name: "Awa", phone: "770000000", createdAt: "2026-11-01", legacySecret: "remove",
      measurement: { bust: "90", waist: "70", secret: "remove" },
      measurementHistory: [{ id: "m-1", measuredAt: "2026-11-01", measurement: { hips: "95", secret: "remove" }, extra: "remove" }]
    }]) as Array<Record<string, unknown>>;
    expect(result[0]).not.toHaveProperty("legacySecret");
    expect(result[0].measurement).toEqual({ bust: "90", waist: "70" });
    expect(result[0].measurementHistory).toEqual([{ id: "m-1", measuredAt: "2026-11-01", measurement: { hips: "95" } }]);
  });

  it("removes free-text stock movement notes from the offline allowlist", () => {
    const result = sanitizeOfflineSnapshot("stock", {
      items: [{ id: "stock-1", name: "Tissu", unit: "m", quantity: 12, minimumQuantity: 2, createdAt: "2026-11-04", secret: "remove" }],
      movements: [{ id: "move-1", itemId: "stock-1", type: "in", quantity: 4, movedAt: "2026-11-04", note: "texte libre privé", secret: "remove" }]
    }) as { items: Array<Record<string, unknown>>; movements: Array<Record<string, unknown>> };
    expect(result.items[0]).not.toHaveProperty("secret");
    expect(result.movements[0]).not.toHaveProperty("note");
    expect(result.movements[0]).not.toHaveProperty("secret");
  });

  it("rejects malformed datasets and invalid stock shapes", () => {
    expect(() => sanitizeOfflineSnapshot("clients", {})).toThrow();
    expect(() => sanitizeOfflineSnapshot("stock", { items: [], movements: "invalid" })).toThrow();
  });

  it("excludes free-text measurement notes and rejects malformed client history", () => {
    const result = sanitizeOfflineSnapshot("clients", [{
      id: "client-2", name: "Moussa", phone: "780000000", createdAt: "2026-11-01",
      measurement: { bust: "90", note: "private note", garmentType: "Boubou" },
      measurementHistory: [{ id: "v1", measuredAt: "2026-11-01", measurement: { waist: "80", note: "private history" } }]
    }]) as Array<Record<string, unknown>>;
    expect(result[0].measurement).toEqual({ bust: "90", garmentType: "Boubou" });
    expect(result[0].measurementHistory).toEqual([{ id: "v1", measuredAt: "2026-11-01", measurement: { waist: "80" } }]);
    expect(() => sanitizeOfflineSnapshot("clients", [{
      id: "client-3", name: "Awa", phone: "770000000", createdAt: "2026-11-01", measurement: {},
      measurementHistory: "invalid"
    }])).toThrow();
  });

  it("encrypts payloads and binds ciphertext to the user, atelier and dataset", async () => {
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    const payload = [{ id: "client-1", name: "Awa", phone: "770000000", createdAt: "2026-11-01" }];
    const encrypted = await encryptOfflinePayload(context, "clients", payload, key);
    await expect(decryptOfflinePayload(context, "clients", encrypted, key)).resolves.toEqual(payload);
    await expect(decryptOfflinePayload({ ...context, atelierId: "atelier-b" }, "clients", encrypted, key)).rejects.toThrow();
    await expect(decryptOfflinePayload(context, "stock", encrypted, key)).rejects.toThrow();
  });

  it("uses a bounded 24-hour maximum cache lifetime", () => {
    expect(OFFLINE_CACHE_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("rejects invalid clocks and cache envelopes outside the verified 24-hour window", () => {
    const verifiedAt = 1_000_000;
    const syncedAt = verifiedAt + 1_000;
    const expiresAt = verifiedAt + OFFLINE_CACHE_TTL_MS;
    expect(isOfflineCacheFresh(syncedAt, expiresAt, verifiedAt, syncedAt)).toBe(true);
    expect(isOfflineCacheFresh(syncedAt, expiresAt, verifiedAt, Number.NaN)).toBe(false);
    expect(isOfflineCacheFresh(syncedAt, expiresAt + 1, verifiedAt, syncedAt)).toBe(false);
    expect(isOfflineCacheFresh(syncedAt, expiresAt, verifiedAt, expiresAt + 1)).toBe(false);
    expect(isOfflineCacheFresh(verifiedAt - 1, expiresAt, verifiedAt, syncedAt)).toBe(false);
    expect(isOfflineCacheFresh(syncedAt, expiresAt, verifiedAt, syncedAt - 1)).toBe(false);
  });

  it("stores encrypted snapshots in IndexedDB and purges only the requested account and atelier", async () => {
    const verifiedAt = 1_800_000_000_000;
    const now = verifiedAt + 1_000;
    const accountAAtelierA = {
      userId: "integration-user-a", atelierId: "integration-atelier-a",
      role: "proprietaire" as const, membershipActive: true, serverVerifiedAt: verifiedAt
    };
    const accountAAtelierB = { ...accountAAtelierA, atelierId: "integration-atelier-b" };
    const accountBAtelierA = { ...accountAAtelierA, userId: "integration-user-b" };
    const snapshot = [{ id: "client-1", name: "Test", phone: "770000000", createdAt: "2026-11-04" }];
    const legacyKey = "yere-legacy-archive-must-survive";
    const legacyValue = "do-not-touch";
    const previousLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => key === legacyKey ? legacyValue : null,
        setItem: () => undefined, removeItem: () => undefined, clear: () => undefined,
        key: () => legacyKey, get length() { return 1; }
      }
    });
    try {
      await saveOfflineSnapshot(accountAAtelierA, "clients", snapshot, now);
      await saveOfflineSnapshot(accountAAtelierB, "clients", snapshot, now);
      await saveOfflineSnapshot(accountBAtelierA, "clients", snapshot, now);
      await expect(readOfflineSnapshot(accountAAtelierA, "clients", now)).resolves.toMatchObject({ data: snapshot });
      await expect(readOfflineSnapshot(accountAAtelierB, "clients", now)).resolves.toMatchObject({ data: snapshot });
      await expect(readOfflineSnapshot(accountBAtelierA, "clients", now)).resolves.toMatchObject({ data: snapshot });
      await purgeOfflineVault({ userId: accountAAtelierA.userId, atelierId: accountAAtelierA.atelierId });
      await expect(readOfflineSnapshot(accountAAtelierA, "clients", now)).resolves.toBeNull();
      await expect(readOfflineSnapshot(accountAAtelierB, "clients", now)).resolves.toMatchObject({ data: snapshot });
      await expect(readOfflineSnapshot(accountBAtelierA, "clients", now)).resolves.toMatchObject({ data: snapshot });
      await purgeUserOfflineVault(accountAAtelierA.userId);
      await expect(readOfflineSnapshot(accountAAtelierB, "clients", now)).resolves.toBeNull();
      await expect(readOfflineSnapshot(accountBAtelierA, "clients", now)).resolves.toMatchObject({ data: snapshot });
      expect(globalThis.localStorage.getItem(legacyKey)).toBe(legacyValue);
    } finally {
      await purgeUserOfflineVault(accountAAtelierA.userId);
      await purgeUserOfflineVault(accountBAtelierA.userId);
      if (previousLocalStorage) Object.defineProperty(globalThis, "localStorage", previousLocalStorage);
      else Reflect.deleteProperty(globalThis, "localStorage");
    }
  });
  it("matches only the exact account and atelier cache scopes", () => {
    const accountKey = "user-a::atelier-a::clients";
    const otherAccountKey = "user-ab::atelier-a::clients";
    const otherAtelierKey = "user-a::atelier-ab::clients";
    expect(isUserOfflineVaultKey(accountKey, "user-a")).toBe(true);
    expect(isUserOfflineVaultKey(otherAccountKey, "user-a")).toBe(false);
    expect(isAtelierOfflineVaultKey(accountKey, "user-a", "atelier-a")).toBe(true);
    expect(isAtelierOfflineVaultKey(otherAtelierKey, "user-a", "atelier-a")).toBe(false);
    expect(isAtelierOfflineVaultKey("user%3Aa::atelier%3Aa::stock", "user:a", "atelier:a")).toBe(true);
  });
});
