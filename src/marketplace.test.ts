import { describe, expect, it } from "vitest";
import { isMarketplaceListingListValid, type MarketplaceListing } from "./marketplace";

const listing: MarketplaceListing = {
  id: "listing-1",
  sellerType: "tailor",
  sellerActivity: "couturiere",
  title: "Robe sur mesure",
  category: "Créations",
  price: "25000 FCFA",
  description: "Robe cousue sur commande",
  sellerName: "Atelier A",
  city: "Dakar",
  imageUrl: ""
};

describe("marketplace listing backup validation", () => {
  it("accepts an empty list and valid listings for any supported activity", () => {
    expect(isMarketplaceListingListValid([])).toBe(true);
    expect(isMarketplaceListingListValid([listing])).toBe(true);
    expect(isMarketplaceListingListValid([{ ...listing, id: "listing-2", sellerActivity: "styliste" }])).toBe(true);
  });

  it("rejects malformed listing data instead of silently dropping it on restore", () => {
    expect(isMarketplaceListingListValid(null)).toBe(false);
    expect(isMarketplaceListingListValid([{ ...listing, sellerActivity: "invented" }])).toBe(false);
    expect(isMarketplaceListingListValid([{ ...listing, title: "" }])).toBe(false);
    expect(isMarketplaceListingListValid([{ ...listing, price: 25000 }])).toBe(false);
  });

  it("rejects empty or duplicate identifiers", () => {
    expect(isMarketplaceListingListValid([{ ...listing, id: " " }])).toBe(false);
    expect(isMarketplaceListingListValid([listing, { ...listing }])).toBe(false);
  });
});
