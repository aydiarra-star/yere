import { describe, expect, it } from "vitest";
import type { StockItem, StockMovement } from "./domain";
import {
  isSupplierPurchaseListValid,
  isSupplierPurchaseValid,
  receiveSupplierPurchase,
  supplierPurchaseTotal,
  type SupplierPurchase
} from "./supplierPurchases";

const purchase: SupplierPurchase = {
  id: "ACH-001",
  supplierName: "Mercerie Ndiaye",
  orderedAt: "2026-10-27",
  status: "À recevoir",
  lines: [
    { stockItemId: "tissu", quantity: 12.5, unitCost: 1500 },
    { stockItemId: "fil", quantity: 4, unitCost: 500 }
  ]
};

const items: StockItem[] = [
  { id: "tissu", name: "Bazin", unit: "mètre", quantity: 20, minimumQuantity: 5, createdAt: "2026-10-01" },
  { id: "fil", name: "Fil blanc", unit: "bobine", quantity: 2, minimumQuantity: 3, createdAt: "2026-10-01" }
];

const movements: StockMovement[] = [
  { id: "M-1", itemId: "tissu", type: "Entrée", quantity: 20, movedAt: "2026-10-01" },
  { id: "M-2", itemId: "fil", type: "Entrée", quantity: 2, movedAt: "2026-10-01" }
];

describe("achats fournisseurs liés au stock", () => {
  it("valide un achat et calcule son montant en FCFA", () => {
    expect(isSupplierPurchaseValid(purchase)).toBe(true);
    expect(isSupplierPurchaseListValid([purchase])).toBe(true);
    expect(supplierPurchaseTotal(purchase)).toBe(20750);
  });

  it("refuse les lignes dupliquées, les quantités invalides et les dates impossibles", () => {
    expect(isSupplierPurchaseValid({ ...purchase, lines: [purchase.lines[0], purchase.lines[0]] })).toBe(false);
    expect(isSupplierPurchaseValid({ ...purchase, lines: [{ ...purchase.lines[0], quantity: 0 }] })).toBe(false);
    expect(isSupplierPurchaseValid({ ...purchase, orderedAt: "2026-02-31" })).toBe(false);
    expect(isSupplierPurchaseListValid([purchase, purchase])).toBe(false);
  });

  it("réceptionne toutes les lignes en une opération et crée les mouvements d'entrée", () => {
    const result = receiveSupplierPurchase(purchase, items, movements, "2026-10-28", "ACH-001-REC");
    expect(result).not.toBeNull();
    expect(result?.purchase.status).toBe("Reçue");
    expect(result?.purchase.receivedAt).toBe("2026-10-28");
    expect(result?.items.find((item) => item.id === "tissu")?.quantity).toBe(32.5);
    expect(result?.items.find((item) => item.id === "fil")?.quantity).toBe(6);
    expect(result?.movements).toHaveLength(4);
    expect(result?.movements[0].note).toContain("ACH-001");
  });

  it("refuse une seconde réception ou une référence de stock inconnue", () => {
    const received = { ...purchase, status: "Reçue" as const, receivedAt: "2026-10-28" };
    expect(receiveSupplierPurchase(received, items, movements, "2026-10-28", "ACH-001-REC")).toBeNull();
    expect(receiveSupplierPurchase({
      ...purchase,
      lines: [{ stockItemId: "inconnu", quantity: 1, unitCost: 100 }]
    }, items, movements, "2026-10-28", "ACH-002-REC")).toBeNull();
  });

  it("refuse une date de réception invalide et ne modifie pas les données d'entrée", () => {
    const originalItems = structuredClone(items);
    const originalMovements = structuredClone(movements);
    expect(receiveSupplierPurchase(purchase, items, movements, "2026-02-31", "ACH-001-REC")).toBeNull();
    expect(items).toEqual(originalItems);
    expect(movements).toEqual(originalMovements);
  });
});
