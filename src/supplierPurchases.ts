import {
  areStockRelationsValid,
  isStockItemListValid,
  isStockMovementListValid,
  recordStockMovement,
  type StockItem,
  type StockMovement
} from "./domain";

export type SupplierPurchaseLine = {
  stockItemId: string;
  quantity: number;
  unitCost: number;
};

export type SupplierPurchaseStatus = "À recevoir" | "Reçue" | "Annulée";

export type SupplierPurchase = {
  id: string;
  supplierName: string;
  orderedAt: string;
  lines: SupplierPurchaseLine[];
  status: SupplierPurchaseStatus;
  receivedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  note?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isSupplierPurchaseValid(value: unknown): value is SupplierPurchase {
  if (!isRecord(value)
    || typeof value.id !== "string" || !value.id.trim()
    || typeof value.supplierName !== "string" || !value.supplierName.trim()
    || !isCalendarDate(value.orderedAt)
    || !["À recevoir", "Reçue", "Annulée"].includes(value.status as string)
    || !Array.isArray(value.lines) || value.lines.length === 0
    || (value.receivedAt !== undefined && !isCalendarDate(value.receivedAt))
    || (value.cancelledAt !== undefined && !isCalendarDate(value.cancelledAt))
    || (value.cancelReason !== undefined && (typeof value.cancelReason !== "string" || !value.cancelReason.trim()))
    || (value.note !== undefined && typeof value.note !== "string")) return false;

  const linesValid = value.lines.every((line) => isRecord(line)
    && typeof line.stockItemId === "string" && line.stockItemId.trim().length > 0
    && typeof line.quantity === "number" && Number.isFinite(line.quantity) && line.quantity > 0
    && typeof line.unitCost === "number" && Number.isSafeInteger(line.unitCost) && line.unitCost >= 0);
  if (!linesValid) return false;

  const lineIds = value.lines.map((line) => (line as Record<string, unknown>).stockItemId);
  if (new Set(lineIds).size !== lineIds.length) return false;

  if (value.status === "Reçue") return isCalendarDate(value.receivedAt) && value.cancelledAt === undefined && value.cancelReason === undefined;
  if (value.status === "Annulée") return value.receivedAt === undefined && isCalendarDate(value.cancelledAt) && typeof value.cancelReason === "string" && Boolean(value.cancelReason.trim());
  return value.receivedAt === undefined && value.cancelledAt === undefined && value.cancelReason === undefined;
}

export function isSupplierPurchaseListValid(value: unknown): value is SupplierPurchase[] {
  return Array.isArray(value)
    && value.every(isSupplierPurchaseValid)
    && new Set(value.map((purchase) => purchase.id)).size === value.length;
}

export function supplierPurchaseTotal(purchase: Pick<SupplierPurchase, "lines">): number {
  return purchase.lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);
}

/** Cancel an unreceived purchase with a dated, non-empty reason for the audit trail. */
export function cancelSupplierPurchase(
  purchase: SupplierPurchase,
  cancelledAt: string,
  reason: string
): SupplierPurchase | null {
  if (!isSupplierPurchaseValid(purchase)
    || purchase.status !== "À recevoir"
    || !isCalendarDate(cancelledAt)
    || !reason.trim()) return null;
  const cancelledPurchase: SupplierPurchase = {
    ...purchase,
    status: "Annulée",
    cancelledAt,
    cancelReason: reason.trim()
  };
  return isSupplierPurchaseValid(cancelledPurchase) ? cancelledPurchase : null;
}

export type ReceiveSupplierPurchaseResult = {
  purchase: SupplierPurchase;
  items: StockItem[];
  movements: StockMovement[];
};

/**
 * Receive a supplier purchase exactly once and apply all stock entries atomically.
 * Returns null if the purchase, date, stock records, or movement history is invalid.
 */
export function receiveSupplierPurchase(
  purchase: SupplierPurchase,
  items: StockItem[],
  movements: StockMovement[],
  receivedAt: string,
  movementIdPrefix: string
): ReceiveSupplierPurchaseResult | null {
  if (!isSupplierPurchaseValid(purchase)
    || purchase.status !== "À recevoir"
    || !isCalendarDate(receivedAt)
    || !movementIdPrefix.trim()
    || !isStockItemListValid(items)
    || !isStockMovementListValid(movements)
    || !areStockRelationsValid(items, movements)) return null;

  const itemIds = new Set(items.map((item) => item.id));
  if (!purchase.lines.every((line) => itemIds.has(line.stockItemId))) return null;

  let nextItems = items;
  let nextMovements = movements;
  for (const [index, line] of purchase.lines.entries()) {
    const movement: StockMovement = {
      id: `${movementIdPrefix}-${index + 1}`,
      itemId: line.stockItemId,
      type: "Entrée",
      quantity: line.quantity,
      movedAt: receivedAt,
      note: `Réception achat ${purchase.id} · ${purchase.supplierName}`
    };
    const result = recordStockMovement(nextItems, nextMovements, movement);
    if (!result) return null;
    nextItems = result.items;
    nextMovements = result.movements;
  }

  const receivedPurchase: SupplierPurchase = {
    ...purchase,
    status: "Reçue",
    receivedAt
  };
  return { purchase: receivedPurchase, items: nextItems, movements: nextMovements };
}
