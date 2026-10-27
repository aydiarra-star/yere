import { describe, expect, it } from "vitest";
import { balanceDue, formatXof, matchesClient, type Client, type Order } from "./domain";

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
