import { describe, expect, it } from "vitest";
import { addOrderPayment, areClientOrderRelationsValid, areStockRelationsValid, balanceDue, formatXof, getClientReminderSuggestions, isClientListValid, isExpenseListValid, isMeasurementValid, isOrderInputValid, isOrderListValid, isStockItemListValid, isStockMovementListValid, matchesClient, recordStockMovement, saveMeasurementVersion, totalPaid, type Client, type Expense, type Measurement, type Order, type StockItem, type StockMovement } from "./domain";

const client: Client = {
  id: "c-1",
  name: "Aïssatou Ndiaye",
  phone: "+221 77 123 45 67",
  createdAt: "2026-10-27",
  measurement: { bust: "", waist: "", hips: "", shoulder: "", sleeve: "", length: "", note: "" }
};

describe("compatibilité du type de travail des commandes", () => {
  const validOrder = { id: "order-1", clientId: "client-1", garment: "Pantalon", dueDate: "2026-11-05", price: 10000, deposit: 0, status: "À préparer" };

  it("accepte les commandes de confection et de retouche", () => {
    expect(isOrderListValid([{ ...validOrder, kind: "confection" }])).toBe(true);
    expect(isOrderListValid([{ ...validOrder, kind: "retouche" }])).toBe(true);
  });

  it("conserve la compatibilité avec les anciennes commandes sans type", () => {
    expect(isOrderListValid([validOrder])).toBe(true);
  });

  it("refuse un type de travail inconnu dans les données persistées", () => {
    expect(isOrderListValid([{ ...validOrder, kind: "unknown" }])).toBe(false);
  });
});

describe("validation des données restaurées", () => {
  it("accepte une liste de clients correctement structurée", () => {
    expect(isClientListValid([client])).toBe(true);
    expect(isClientListValid([])).toBe(true);
  });

  it("accepte les anciennes mensurations à six mesures sans invalider les fiches déjà enregistrées", () => {
    const legacyClient = { ...client, measurement: { bust: "92", waist: "74", hips: "98", shoulder: "40", sleeve: "60", length: "140", note: "" } };
    expect(isClientListValid([legacyClient])).toBe(true);
  });

  it("accepte le type de vêtement optionnel et conserve la compatibilité des données existantes", () => {
    const garmentClient = { ...client, measurement: { ...client.measurement, garmentType: "Pantalon" } };
    expect(isClientListValid([garmentClient])).toBe(true);
    expect(isClientListValid([client])).toBe(true);
  });

  it("refuse les nouvelles mesures si leur valeur n'est pas une chaîne", () => {
    expect(isClientListValid([{ ...client, measurement: { ...client.measurement, arm: 42 } }])).toBe(false);
  });

  it("refuse les mensurations non numériques dans les données persistées", () => {
    expect(isClientListValid([{ ...client, measurement: { ...client.measurement, bust: "abc" } }])).toBe(false);
    expect(isClientListValid([{ ...client, measurement: { ...client.measurement, waist: "-2" } }])).toBe(false);
    expect(isClientListValid([{ ...client, measurement: { ...client.measurement, bust: "92.5" } }])).toBe(true);
  });

  it("refuse un historique de mensurations invalide ou avec des identifiants dupliqués", () => {
    const validVersion = { id: "v-1", measuredAt: "2026-10-27", measurement: { ...client.measurement, bust: "92" } };
    expect(isClientListValid([{ ...client, measurementHistory: [validVersion, { ...validVersion, id: "v-2", measurement: { ...validVersion.measurement, hips: "invalide" } }] }])).toBe(false);
    expect(isClientListValid([{ ...client, measurementHistory: [validVersion, { ...validVersion, measuredAt: "2026-10-28" }] }])).toBe(false);
    expect(isClientListValid([{ ...client, measurementHistory: [validVersion] }])).toBe(true);
  });

  it("refuse les clients dont les champs indispensables sont absents ou mal typés", () => {
    expect(isClientListValid({})).toBe(false);
    expect(isClientListValid([{ ...client, measurement: null }])).toBe(false);
    expect(isClientListValid([{ ...client, createdAt: "2026-02-31" }])).toBe(false);
    expect(isClientListValid([{ ...client, measurementHistory: [{ id: "v1", measuredAt: "2026-10-27", measurement: {} }] }])).toBe(false);
  });

  it("accepte une commande persistée cohérente", () => {
    const order: Order = {
      id: "order-1", clientId: "c-1", garment: "Boubou",
      dueDate: "2026-11-01", orderedAt: "2026-10-27",
      price: 25000, deposit: 10000, status: "En confection"
    };
    expect(isOrderListValid([order])).toBe(true);
    expect(isOrderListValid([])).toBe(true);
  });

  it("refuse les commandes persistées aux montants, dates ou statuts incohérents", () => {
    const order: Order = {
      id: "order-1", clientId: "c-1", garment: "Boubou",
      dueDate: "2026-11-01", price: 25000, deposit: 10000, status: "En confection"
    };
    expect(isOrderListValid({ orders: [order] })).toBe(false);
    expect(isOrderListValid([{ ...order, deposit: 30000 }])).toBe(false);
    expect(isOrderListValid([{ ...order, price: Number.POSITIVE_INFINITY }])).toBe(false);
    expect(isOrderListValid([{ ...order, dueDate: "2026-02-31" }])).toBe(false);
    expect(isOrderListValid([{ ...order, status: "Inconnu" }])).toBe(false);
    expect(isOrderListValid([{ ...order, clientId: "" }])).toBe(false);
  });

  it("refuse un historique de paiements inférieur à l’acompte déclaré", () => {
    const order: Order = {
      id: "order-1", clientId: "c-1", garment: "Boubou",
      dueDate: "2026-11-01", price: 25000, deposit: 10000,
      payments: [{ id: "pay-1", amount: 5000, paidAt: "2026-10-27" }],
      status: "En confection"
    };
    expect(isOrderListValid([order])).toBe(false);
    expect(isOrderListValid([{ ...order, payments: [{ id: "pay-1", amount: 10000, paidAt: "2026-10-27" }] }])).toBe(true);
    expect(isOrderListValid([{ ...order, payments: [{ id: "pay-1", amount: 15000, paidAt: "2026-10-27" }] }])).toBe(true);
  });
});


describe("cohérence des données restaurées", () => {
  const clients: Client[] = [
    { ...client, id: "c-1" },
    { ...client, id: "c-2", name: "Moussa Diallo" }
  ];
  const orders: Order[] = [
    { id: "o-1", clientId: "c-1", garment: "Boubou", dueDate: "2026-11-01", price: 25000, deposit: 5000, status: "À préparer" }
  ];

  it("accepte les commandes rattachées à des clients existants", () => {
    expect(areClientOrderRelationsValid(clients, orders)).toBe(true);
  });

  it("refuse une commande dont le client est absent", () => {
    expect(areClientOrderRelationsValid(clients, [{ ...orders[0], clientId: "missing" }])).toBe(false);
  });

  it("refuse les identifiants dupliqués", () => {
    expect(areClientOrderRelationsValid([...clients, clients[0]], orders)).toBe(false);
    expect(areClientOrderRelationsValid(clients, [...orders, orders[0]])).toBe(false);
  });
});

describe("paiements de commande", () => {
  it("refuse d’ajouter un versement sur une commande dont l’historique est incohérent", () => {
    const order: Order = {
      id: "o-invalid", clientId: "c-1", garment: "Boubou",
      dueDate: "2026-11-01", price: 25000, deposit: 10000,
      payments: [{ id: "p-1", amount: 5000, paidAt: "2026-10-27" }],
      status: "À préparer"
    };
    expect(addOrderPayment(order, { id: "p-2", amount: 1000, paidAt: "2026-10-28" })).toBeNull();
  });
});

describe("balanceDue", () => {
  it("calculates the remaining balance", () => {
    const order: Pick<Order, "price" | "deposit"> = { price: 25000, deposit: 10000 };
    expect(balanceDue(order)).toBe(15000);
  });

  it("never returns a negative balance", () => {
    expect(balanceDue({ price: 5000, deposit: 7000 })).toBe(0);
  });
});

describe("validation d'une nouvelle commande", () => {
  const validInput = { clientId: "c-1", garment: "Boubou", dueDate: "2026-11-01", price: 25000, deposit: 10000 };

  it("accepte une commande cohérente rattachée à un client existant", () => {
    expect(isOrderInputValid(validInput, ["c-1", "c-2"])).toBe(true);
  });

  it("refuse les prix invalides, négatifs, décimaux ou non sûrs", () => {
    expect(isOrderInputValid({ ...validInput, price: 0 }, ["c-1"])).toBe(false);
    expect(isOrderInputValid({ ...validInput, price: -1 }, ["c-1"])).toBe(false);
    expect(isOrderInputValid({ ...validInput, price: 25000.5 }, ["c-1"])).toBe(false);
    expect(isOrderInputValid({ ...validInput, price: Number.MAX_SAFE_INTEGER + 1 }, ["c-1"])).toBe(false);
  });

  it("refuse un acompte supérieur au prix ou non entier", () => {
    expect(isOrderInputValid({ ...validInput, deposit: 26000 }, ["c-1"])).toBe(false);
    expect(isOrderInputValid({ ...validInput, deposit: 10.5 }, ["c-1"])).toBe(false);
    expect(isOrderInputValid({ ...validInput, deposit: -1 }, ["c-1"])).toBe(false);
    expect(isOrderInputValid({ ...validInput, deposit: Number.POSITIVE_INFINITY }, ["c-1"])).toBe(false);
  });

  it("accepte un acompte nul ou égal au prix", () => {
    expect(isOrderInputValid({ ...validInput, deposit: 0 }, ["c-1"])).toBe(true);
    expect(isOrderInputValid({ ...validInput, deposit: validInput.price }, ["c-1"])).toBe(true);
  });

  it("refuse une date inexistante, un client inconnu ou un vêtement vide", () => {
    expect(isOrderInputValid({ ...validInput, dueDate: "2026-02-31" }, ["c-1"])).toBe(false);
    expect(isOrderInputValid({ ...validInput, dueDate: "2026-2-01" }, ["c-1"])).toBe(false);
    expect(isOrderInputValid({ ...validInput, dueDate: "2024-02-29" }, ["c-1"])).toBe(true);
    expect(isOrderInputValid({ ...validInput, dueDate: "2025-02-29" }, ["c-1"])).toBe(false);
    expect(isOrderInputValid({ ...validInput, clientId: "" }, ["c-1"])).toBe(false);
    expect(isOrderInputValid({ ...validInput, clientId: "missing" }, ["c-1"])).toBe(false);
    expect(isOrderInputValid({ ...validInput, garment: "   " }, ["c-1"])).toBe(false);
  });
});

describe("formatXof", () => {
  it("shows an amount with the FCFA currency label", () => {
    expect(formatXof(15000)).toContain("FCFA");
    expect(formatXof(15000)).toContain("15");
  });
});

describe("matchesClient", () => {
  it("matches a name without case sensitivity", () => {
    expect(matchesClient(client, "aïssatou")).toBe(true);
  });

  it("matches a phone number with or without spaces", () => {
    expect(matchesClient(client, "771234567")).toBe(true);
  });

  it("accepts an empty query", () => {
    expect(matchesClient(client, "  ")).toBe(true);
  });
});


describe("historique des mensurations", () => {
  const blankMeasurement: Measurement = {
    bust: "", waist: "", hips: "", shoulder: "", sleeve: "", length: "", garmentType: "Tenue complète", note: ""
  };

  it("conserve la prise précédente lors d'un nouvel enregistrement", () => {
    const first: Measurement = { ...blankMeasurement, bust: "92", note: "Coupe ample" };
    const initialClient: Client = { ...client, measurement: first };
    const next: Measurement = { ...first, bust: "94", garmentType: "Boubou / robe" };

    const updated = saveMeasurementVersion(initialClient, next, "2026-10-27", "m-2");

    expect(updated.measurement.bust).toBe("94");
    expect(updated.measurement.garmentType).toBe("Boubou / robe");
    expect(updated.measurementHistory).toHaveLength(2);
    expect(updated.measurementHistory?.[0].measurement.bust).toBe("92");
    expect(updated.measurementHistory?.[1].measurement.bust).toBe("94");
  });

  it("crée une première version sans inventer une ancienne prise vide", () => {
    const updated = saveMeasurementVersion(
      { ...client, measurement: blankMeasurement },
      { ...blankMeasurement, waist: "74" },
      "2026-10-27",
      "m-1"
    );

    expect(updated.measurementHistory).toHaveLength(1);
    expect(updated.measurementHistory?.[0].measurement.waist).toBe("74");
  });

  it("valide les quatre nouvelles mesures optionnelles", () => {
    expect(isMeasurementValid({ ...blankMeasurement, arm: "32", neck: "38", thigh: "56", legLength: "102" })).toBe(true);
    expect(isMeasurementValid({ ...blankMeasurement, arm: "-1" })).toBe(false);
    expect(isMeasurementValid({ ...blankMeasurement, legLength: "abc" })).toBe(false);
  });

  it("refuse les mensurations négatives ou non numériques", () => {
    expect(isMeasurementValid({ ...blankMeasurement, bust: "-1" })).toBe(false);
    expect(isMeasurementValid({ ...blankMeasurement, waist: "abc" })).toBe(false);
    expect(isMeasurementValid({ ...blankMeasurement, hips: "90.5" })).toBe(true);
    expect(isMeasurementValid(blankMeasurement)).toBe(true);
  });
});


describe("suggestions de relance client", () => {
  const clients: Client[] = [
    { ...client, id: "c-old", name: "Mariama Diallo", phone: "+221 77 000 00 00" },
    { ...client, id: "c-new", name: "Ousmane Ba", phone: "+221 76 000 00 00" }
  ];
  const orders: Order[] = [
    { id: "old-wedding", clientId: "c-old", garment: "Tenue de mariage", dueDate: "2025-11-01", orderedAt: "2025-10-01", price: 50000, deposit: 50000, status: "Livré" },
    { id: "recent", clientId: "c-new", garment: "Boubou", dueDate: "2026-10-30", orderedAt: "2026-10-01", price: 25000, deposit: 10000, status: "En confection" }
  ];

  it("propose une réactivation après 180 jours sans commande", () => {
    const results = getClientReminderSuggestions(clients, orders, "2026-10-27");
    expect(results.some((item) => item.clientId === "c-old" && item.kind === "inactive")).toBe(true);
    expect(results.some((item) => item.clientId === "c-new")).toBe(false);
  });

  it("rappelle une ancienne commande liée à une occasion", () => {
    const results = getClientReminderSuggestions(clients, orders, "2026-10-27");
    const occasion = results.find((item) => item.clientId === "c-old" && item.kind === "occasion");
    expect(occasion?.detail).toContain("tenue de mariage");
    expect(occasion?.suggestedMessage).toContain("Mariama Diallo");
  });

  it("ne crée pas de rappel pour une date future ou une commande sans date", () => {
    const results = getClientReminderSuggestions(clients, [
      { ...orders[0], orderedAt: "2027-01-01" },
      { ...orders[1], orderedAt: undefined }
    ], "2026-10-27");
    expect(results).toHaveLength(0);
  });

  it("respecte exactement le seuil de 180 jours", () => {
    const oneClient = [clients[0]];
    const makeOrder = (orderedAt: string): Order[] => [{
      id: "threshold",
      clientId: "c-old",
      garment: "Boubou",
      dueDate: orderedAt,
      orderedAt,
      price: 20000,
      deposit: 20000,
      status: "Livré"
    }];
    const at179Days = getClientReminderSuggestions(oneClient, makeOrder("2026-05-01"), "2026-10-27");
    const at180Days = getClientReminderSuggestions(oneClient, makeOrder("2026-04-30"), "2026-10-27");
    const at181Days = getClientReminderSuggestions(oneClient, makeOrder("2026-04-29"), "2026-10-27");
    expect(at179Days.some((item) => item.kind === "inactive")).toBe(false);
    expect(at180Days.some((item) => item.kind === "inactive")).toBe(true);
    expect(at181Days.some((item) => item.kind === "inactive")).toBe(true);
  });

  it("une commande récente bloque la réactivation mais conserve un rappel d'occasion pertinent", () => {
    const ordersWithRecentActivity: Order[] = [
      ...orders,
      {
        id: "recent-follow-up",
        clientId: "c-old",
        garment: "Boubou",
        dueDate: "2026-11-15",
        orderedAt: "2026-08-01",
        price: 30000,
        deposit: 10000,
        status: "En confection"
      }
    ];
    const results = getClientReminderSuggestions(clients, ordersWithRecentActivity, "2026-10-27");
    expect(results.some((item) => item.clientId === "c-old" && item.kind === "inactive")).toBe(false);
    expect(results.some((item) => item.clientId === "c-old" && item.kind === "occasion")).toBe(true);
  });

  it("ignore les dates de commande invalides", () => {
    const invalidDateOrder: Order[] = [{
      ...orders[0],
      orderedAt: "date-invalide"
    }];
    expect(getClientReminderSuggestions(clients, invalidDateOrder, "2026-10-27")).toHaveLength(0);
  });
});


describe("assistant quotidien", () => {
  const clients: Client[] = [{ ...client, id: "daily-client", name: "Awa Sow" }];
  const orders: Order[] = [
    { id: "late", clientId: "daily-client", garment: "Robe", dueDate: "2026-10-26", orderedAt: "2026-10-20", price: 30000, deposit: 10000, status: "En confection" },
    { id: "today", clientId: "daily-client", garment: "Boubou", dueDate: "2026-10-27", orderedAt: "2026-10-20", price: 25000, deposit: 25000, status: "Prêt" },
    { id: "balance", clientId: "daily-client", garment: "Ensemble", dueDate: "2026-10-29", orderedAt: "2026-10-20", price: 40000, deposit: 10000, status: "Prêt" },
    { id: "delivered", clientId: "daily-client", garment: "Tenue livrée", dueDate: "2026-10-20", orderedAt: "2026-10-10", price: 20000, deposit: 0, status: "Livré" }
  ];

  it("signale les retards, les livraisons du jour et les soldes des commandes prêtes", async () => {
    const { getDailyTasks } = await import("./domain");
    const tasks = getDailyTasks(clients, orders, "2026-10-27");
    expect(tasks.map((task) => task.id)).toEqual(["retard-late", "today-today", "balance-balance"]);
    expect(tasks[0].kind).toBe("critical");
    expect(tasks[1].detail).toContain("Awa Sow");
    expect(tasks[2].action).toBe("cash");
    expect(tasks[2].title).toContain("30");
  });

  it("n'affiche pas les commandes livrées et ignore les dates invalides", async () => {
    const { getDailyTasks } = await import("./domain");
    const tasks = getDailyTasks(clients, [
      { ...orders[0], dueDate: "2026-02-31" },
      orders[3]
    ], "2026-10-27");
    expect(tasks).toHaveLength(0);
  });

  it("renvoie une liste vide si la date du jour est invalide", async () => {
    const { getDailyTasks } = await import("./domain");
    expect(getDailyTasks(clients, orders, "aujourd'hui")).toEqual([]);
  });
});

describe("historique des paiements", () => {
  const order: Order = {
    id: "payment-order", clientId: "c-1", garment: "Boubou", dueDate: "2026-11-10",
    orderedAt: "2026-10-20", price: 30000, deposit: 10000, status: "En confection"
  };

  it("conserve la compatibilité des commandes historiques avec un seul acompte", () => {
    expect(totalPaid(order)).toBe(10000);
    expect(balanceDue(order)).toBe(20000);
    expect(isOrderListValid([order])).toBe(true);
  });

  it("migre l'acompte historique dans l'historique lors du prochain paiement", () => {
    const updated = addOrderPayment(order, { id: "pay-2", amount: 5000, paidAt: "2026-10-27", note: "Deuxième versement" });
    expect(updated).not.toBeNull();
    expect(updated?.payments).toHaveLength(2);
    expect(totalPaid(updated!)).toBe(15000);
    expect(balanceDue(updated!)).toBe(15000);
    expect(updated?.payments?.[0].amount).toBe(10000);
  });

  it("refuse un paiement supérieur au reste dû, nul, daté invalidement ou dupliqué", () => {
    expect(addOrderPayment(order, { id: "too-much", amount: 20001, paidAt: "2026-10-27" })).toBeNull();
    expect(addOrderPayment(order, { id: "zero", amount: 0, paidAt: "2026-10-27" })).toBeNull();
    expect(addOrderPayment(order, { id: "bad-date", amount: 100, paidAt: "2026-02-31" })).toBeNull();
    const first = addOrderPayment(order, { id: "same", amount: 1000, paidAt: "2026-10-27" })!;
    expect(addOrderPayment(first, { id: "same", amount: 1000, paidAt: "2026-10-27" })).toBeNull();
  });

  it("refuse un historique restauré avec des paiements incohérents", () => {
    expect(isOrderListValid([{ ...order, payments: [{ id: "p1", amount: 25000, paidAt: "2026-10-27" }, { id: "p2", amount: 6000, paidAt: "2026-10-27" }] }])).toBe(false);
    expect(isOrderListValid([{ ...order, payments: [{ id: "p1", amount: 5000, paidAt: "2026-02-31" }] }])).toBe(false);
    expect(isOrderListValid([{ ...order, payments: [{ id: "p1", amount: 5000, paidAt: "2026-10-27" }, { id: "p1", amount: 1000, paidAt: "2026-10-28" }] }])).toBe(false);
  });
});

describe("validation des dépenses", () => {
  const expense: Expense = {
    id: "expense-1", spentAt: "2026-10-28", category: "Tissu",
    description: "Achat de tissu pour commandes", amount: 12500
  };

  it("accepte une dépense complète et une liste vide", () => {
    expect(isExpenseListValid([expense])).toBe(true);
    expect(isExpenseListValid([])).toBe(true);
  });

  it("refuse les montants, dates, libellés et identifiants invalides", () => {
    expect(isExpenseListValid([{ ...expense, amount: 0 }])).toBe(false);
    expect(isExpenseListValid([{ ...expense, amount: 12.5 }])).toBe(false);
    expect(isExpenseListValid([{ ...expense, spentAt: "2026-02-31" }])).toBe(false);
    expect(isExpenseListValid([{ ...expense, category: " " }])).toBe(false);
    expect(isExpenseListValid([{ ...expense, description: "" }])).toBe(false);
    expect(isExpenseListValid([expense, expense])).toBe(false);
  });

  it("conserve une dépense annulée avec date et motif, sans accepter une annulation incomplète", () => {
    expect(isExpenseListValid([{ ...expense, voidedAt: "2026-10-28", voidReason: "Saisie en double" }])).toBe(true);
    expect(isExpenseListValid([{ ...expense, voidedAt: "2026-02-31", voidReason: "Erreur" }])).toBe(false);
    expect(isExpenseListValid([{ ...expense, voidedAt: "2026-10-28" }])).toBe(false);
    expect(isExpenseListValid([{ ...expense, voidReason: "Erreur" }])).toBe(false);
    expect(isExpenseListValid([{ ...expense, voidedAt: "2026-10-28", voidReason: " " }])).toBe(false);
  });
});

describe("stock et mouvements", () => {
  const item: StockItem = { id: "stock-1", name: "Tissu bazin", unit: "mètre", quantity: 12.5, minimumQuantity: 3, createdAt: "2026-10-28" };
  const entry: StockMovement = { id: "movement-1", itemId: "stock-1", type: "Entrée", quantity: 5, movedAt: "2026-10-28", note: "Réassort" };

  it("valide les articles et mouvements correctement structurés", () => {
    const opening: StockMovement = { id: "opening-1", itemId: "stock-1", type: "Entrée", quantity: 12.5, movedAt: "2026-10-28", note: "Stock initial" };
    expect(isStockItemListValid([item])).toBe(true);
    expect(isStockMovementListValid([entry])).toBe(true);
    expect(areStockRelationsValid([{ ...item, quantity: 17.5 }], [entry, opening])).toBe(true);
    expect(areStockRelationsValid([item], [entry])).toBe(false);
  });

  it("refuse les quantités négatives, les dates invalides et les identifiants dupliqués", () => {
    expect(isStockItemListValid([{ ...item, quantity: -1 }])).toBe(false);
    expect(isStockItemListValid([item, item])).toBe(false);
    expect(isStockMovementListValid([{ ...entry, quantity: 0 }])).toBe(false);
    expect(isStockMovementListValid([{ ...entry, movedAt: "2026-02-31" }])).toBe(false);
    expect(isStockMovementListValid([entry, entry])).toBe(false);
    expect(areStockRelationsValid([item], [{ ...entry, itemId: "missing" }])).toBe(false);
  });

  it("ajoute une entrée et met à jour le stock courant", () => {
    const result = recordStockMovement([item], [], entry);
    expect(result?.items[0].quantity).toBe(17.5);
    expect(result?.movements).toEqual([entry]);
  });

  it("refuse une sortie qui ferait passer le stock sous zéro", () => {
    const exit: StockMovement = { id: "exit-1", itemId: "stock-1", type: "Sortie", quantity: 13, movedAt: "2026-10-28" };
    expect(recordStockMovement([item], [], exit)).toBeNull();
  });

  it("refuse un mouvement d'un article inconnu et un identifiant déjà utilisé", () => {
    expect(recordStockMovement([item], [], { ...entry, itemId: "missing" })).toBeNull();
    expect(recordStockMovement([item], [entry], entry)).toBeNull();
  });
});
