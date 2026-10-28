import { describe, expect, it } from "vitest";
import type { StockItem, StockMovement } from "./domain";
import {
  cancelSupplierPurchase,
  isSupplierPurchaseListValid,
  isSupplierPurchaseValid,
  receiveSupplierPurchase,
  supplierPurchaseTotal,
  supplierPurchasePaidTotal,
  supplierPurchasesPaidTotal,
  supplierPurchaseBalance,
  addSupplierPurchasePayment,
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

  it("calcule les règlements fournisseurs sans les confondre avec la réception", () => {
    expect(supplierPurchasePaidTotal(purchase)).toBe(0);
    expect(supplierPurchaseBalance(purchase)).toBe(20750);
    const first = addSupplierPurchasePayment(purchase, { id: "PAY-1", paidAt: "2026-10-27", amount: 5000 });
    expect(first).not.toBeNull();
    expect(first?.status).toBe("À recevoir");
    expect(supplierPurchasePaidTotal(first!)).toBe(5000);
    expect(supplierPurchaseBalance(first!)).toBe(15750);
    const second = addSupplierPurchasePayment(first!, { id: "PAY-2", paidAt: "2026-10-28", amount: 15750, note: "Solde" });
    expect(supplierPurchasePaidTotal(second!)).toBe(20750);
    expect(supplierPurchaseBalance(second!)).toBe(0);
    expect(second?.status).toBe("À recevoir");
  });

  it("additionne les sorties fournisseurs sans confondre paiement et réception", () => {
    const partlyPaid = addSupplierPurchasePayment(purchase, { id: "PAY-CASH-1", paidAt: "2026-10-27", amount: 5000 })!;
    const another = addSupplierPurchasePayment({ ...purchase, id: "ACH-002" }, { id: "PAY-CASH-2", paidAt: "2026-10-28", amount: 2500 })!;
    expect(supplierPurchasesPaidTotal([partlyPaid, another])).toBe(7500);
    expect(partlyPaid.status).toBe("À recevoir");
  });

  it("refuse les paiements invalides, en double, trop élevés ou sur un achat annulé", () => {
    expect(addSupplierPurchasePayment(purchase, { id: "P-0", paidAt: "2026-10-27", amount: 0 })).toBeNull();
    expect(addSupplierPurchasePayment(purchase, { id: "P-1", paidAt: "2026-02-31", amount: 1 })).toBeNull();
    expect(addSupplierPurchasePayment(purchase, { id: "P-1", paidAt: "2026-10-27", amount: -1 })).toBeNull();
    expect(addSupplierPurchasePayment(purchase, { id: "P-1", paidAt: "2026-10-27", amount: 20751 })).toBeNull();
    const first = addSupplierPurchasePayment(purchase, { id: "P-1", paidAt: "2026-10-27", amount: 1000 })!;
    expect(addSupplierPurchasePayment(first, { id: "P-1", paidAt: "2026-10-28", amount: 1000 })).toBeNull();
    const cancelled = cancelSupplierPurchase(purchase, "2026-10-28", "Commande annulée")!;
    expect(addSupplierPurchasePayment(cancelled, { id: "P-2", paidAt: "2026-10-28", amount: 1000 })).toBeNull();
    expect(cancelSupplierPurchase(first, "2026-10-28", "Déjà payé")).toBeNull();
  });

  it("refuse les paiements incohérents dans une sauvegarde de l’achat", () => {
    expect(isSupplierPurchaseValid({ ...purchase, payments: [{ id: "P-1", paidAt: "2026-10-27", amount: 5000 }, { id: "P-1", paidAt: "2026-10-28", amount: 5000 }] })).toBe(false);
    expect(isSupplierPurchaseValid({ ...purchase, payments: [{ id: "P-1", paidAt: "2026-10-27", amount: 20751 }] })).toBe(false);
    expect(isSupplierPurchaseValid({ ...purchase, payments: "invalid" })).toBe(false);
    expect(isSupplierPurchaseValid(purchase)).toBe(true);
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

  it("refuse un stock incohérent avec son historique de mouvements", () => {
    const inconsistentItems = items.map((item) => item.id === "tissu" ? { ...item, quantity: 99 } : item);
    expect(receiveSupplierPurchase(purchase, inconsistentItems, movements, "2026-10-28", "ACH-003-REC")).toBeNull();
  });

  it("annule un achat non reçu avec un motif daté et refuse les annulations invalides", () => {
    const cancelled = cancelSupplierPurchase(purchase, "2026-10-28", "Fournisseur indisponible");
    expect(cancelled?.status).toBe("Annulée");
    expect(cancelled?.cancelledAt).toBe("2026-10-28");
    expect(cancelled?.cancelReason).toBe("Fournisseur indisponible");
    expect(isSupplierPurchaseValid(cancelled)).toBe(true);
    expect(cancelSupplierPurchase(purchase, "2026-02-31", "Motif")).toBeNull();
    expect(cancelSupplierPurchase(purchase, "2026-10-28", "   ")).toBeNull();
    const received = { ...purchase, status: "Reçue" as const, receivedAt: "2026-10-28" };
    expect(cancelSupplierPurchase(received, "2026-10-28", "Trop tard")).toBeNull();
    expect(isSupplierPurchaseValid({ ...purchase, status: "Annulée" })).toBe(false);
  });

  it("refuse une date de réception invalide et ne modifie pas les données d'entrée", () => {
    const originalItems = structuredClone(items);
    const originalMovements = structuredClone(movements);
    expect(receiveSupplierPurchase(purchase, items, movements, "2026-02-31", "ACH-001-REC")).toBeNull();
    expect(items).toEqual(originalItems);
    expect(movements).toEqual(originalMovements);
  });
});
