import { describe, expect, it } from "vitest";
import {
  decryptOfflinePayload,
  encryptOfflinePayload,
  OFFLINE_CACHE_TTL_MS,
  sanitizeOfflineSnapshot
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
      id: "client-1", name: "Awa", phone: "770000000", legacySecret: "remove",
      measurement: { bust: "90", waist: "70", secret: "remove" },
      measurementHistory: [{ id: "m-1", measuredAt: "2026-11-01", measurement: { hips: "95", secret: "remove" }, extra: "remove" }]
    }]) as Array<Record<string, unknown>>;
    expect(result[0]).not.toHaveProperty("legacySecret");
    expect(result[0].measurement).toEqual({ bust: "90", waist: "70" });
    expect(result[0].measurementHistory).toEqual([{ id: "m-1", measuredAt: "2026-11-01", measurement: { hips: "95" } }]);
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
    const payload = [{ id: "client-1", name: "Awa", phone: "770000000" }];
    const encrypted = await encryptOfflinePayload(context, "clients", payload, key);
    await expect(decryptOfflinePayload(context, "clients", encrypted, key)).resolves.toEqual(payload);
    await expect(decryptOfflinePayload({ ...context, atelierId: "atelier-b" }, "clients", encrypted, key)).rejects.toThrow();
    await expect(decryptOfflinePayload(context, "stock", encrypted, key)).rejects.toThrow();
  });

  it("uses a bounded 24-hour maximum cache lifetime", () => {
    expect(OFFLINE_CACHE_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });
});
