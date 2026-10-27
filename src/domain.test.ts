import { describe, expect, it } from "vitest";
import { balanceDue, formatXof, getClientReminderSuggestions, isMeasurementValid, matchesClient, saveMeasurementVersion, type Client, type Measurement, type Order } from "./domain";

const client: Client = {
  id: "c-1",
  name: "Aïssatou Ndiaye",
  phone: "+221 77 123 45 67",
  createdAt: "2026-10-27",
  measurement: { bust: "", waist: "", hips: "", shoulder: "", sleeve: "", length: "", note: "" }
};

describe("balanceDue", () => {
  it("calculates the remaining balance", () => {
    const order: Pick<Order, "price" | "deposit"> = { price: 25000, deposit: 10000 };
    expect(balanceDue(order)).toBe(15000);
  });

  it("never returns a negative balance", () => {
    expect(balanceDue({ price: 5000, deposit: 7000 })).toBe(0);
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
    bust: "", waist: "", hips: "", shoulder: "", sleeve: "", length: "", note: ""
  };

  it("conserve la prise précédente lors d'un nouvel enregistrement", () => {
    const first: Measurement = { ...blankMeasurement, bust: "92", note: "Coupe ample" };
    const initialClient: Client = { ...client, measurement: first };
    const next: Measurement = { ...first, bust: "94" };

    const updated = saveMeasurementVersion(initialClient, next, "2026-10-27", "m-2");

    expect(updated.measurement.bust).toBe("94");
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
