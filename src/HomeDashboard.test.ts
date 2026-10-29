import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import HomeDashboard from "./HomeDashboard";
import { illustrationUrl } from "./illustrations";

const props = {
  atelierName: "Atelier Diarra",
  isExample: false,
  today: new Date(2026, 9, 29, 12),
  deliveryCount: 1,
  outstandingOrderCount: 2,
  outstanding: 37500,
  activeOrderCount: 4,
  onOpenDeliveries: vi.fn(),
  onOpenPayments: vi.fn(),
  onOpenProduction: vi.fn(),
  onCreateOrder: vi.fn(),
  onOpenTools: vi.fn(),
  onConfigure: vi.fn()
};

function metricValues(html: string) {
  return [...html.matchAll(/class="priority-metric"><strong>(\d+)<\/strong>/g)].map((match) => Number(match[1]));
}

describe("HomeDashboard", () => {
  it("identifies example figures without treating them as saved atelier data", () => {
    const html = renderToStaticMarkup(createElement(HomeDashboard, { ...props, isExample: true }));
    expect(metricValues(html)).toEqual([3, 2, 5]);
    expect(html).toContain("Aperçu fictif");
    expect(html).toContain("Données d’exemple : configurer mon atelier");
    expect(html.replace(/\s/g, "")).toContain("150000FCFA");
    expect(html).toContain("Tissu premium en cours de coupe");
    expect(html).toContain(`src="${illustrationUrl("delivery")}"`);
    expect(html).toContain(`src="${illustrationUrl("payment")}"`);
    expect(html).toContain(`src="${illustrationUrl("production")}"`);
  });

  it("shows the supplied real counts and balance outside the example", () => {
    const html = renderToStaticMarkup(createElement(HomeDashboard, props));
    expect(metricValues(html)).toEqual([1, 2, 4]);
    expect(html.replace(/\s/g, "")).toContain("37500FCFA");
    expect(html).not.toContain("Aperçu fictif");
    expect(html).toContain("Atelier Diarra");
    expect(html).toContain("CRÉER NOUVELLE COMMANDE");
  });
});
