import { describe, expect, it } from "vitest";
import { balanceDue, formatXof, isMeasurementValid, matchesClient, saveMeasurementVersion, type Client, type Measurement, type Order } from "./domain";

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
