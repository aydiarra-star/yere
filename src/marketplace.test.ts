import { describe, expect, it } from "vitest";
import { isMarketplaceListingListValid, type MarketplaceListing } from "./marketplace";

const listing: MarketplaceListing = {
  id: "listing-1",
  sellerType: "tailor",
  sellerActivity: "tailleur",
  title: "Robe sur mesure",
  category: "Créations",
  price: "25000 FCFA",
  description: "Robe cousue sur commande",
  sellerName: "Atelier A",
  city: "Dakar",
  imageUrl: ""
};

describe("marketplace listing backup validation", () => {
  it("accepts an empty list and listings associated only with tailleurs", () => {
    expect(isMarketplaceListingListValid([])).toBe(true);
    expect(isMarketplaceListingListValid([listing])).toBe(true);
    expect(isMarketplaceListingListValid([{ ...listing, sellerActivity: undefined }])).toBe(true);
  });

  it("rejects legacy listings associated with professions outside the launch scope", () => {
    expect(isMarketplaceListingListValid([{ ...listing, sellerActivity: "couturiere" as never }])).toBe(false);
    expect(isMarketplaceListingListValid([{ ...listing, sellerActivity: "styliste" as never }])).toBe(false);
  });

  it("rejects malformed listing data instead of silently dropping it on restore", () => {
    expect(isMarketplaceListingListValid(null)).toBe(false);
    expect(isMarketplaceListingListValid([{ ...listing, sellerActivity: "invented" as never }])).toBe(false);
    expect(isMarketplaceListingListValid([{ ...listing, title: "" }])).toBe(false);
    expect(isMarketplaceListingListValid([{ ...listing, price: 25000 as never }])).toBe(false);
  });

  it("rejects empty or duplicate identifiers", () => {
    expect(isMarketplaceListingListValid([{ ...listing, id: " " }])).toBe(false);
    expect(isMarketplaceListingListValid([listing, { ...listing }])).toBe(false);
  });
});
