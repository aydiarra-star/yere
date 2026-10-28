import { atelierActivities, type AtelierActivity } from "./atelierProfile";

export type MarketplaceListing = {
  id: string;
  sellerType: "tailor" | "supplier";
  sellerActivity?: AtelierActivity;
  title: string;
  category: string;
  price: string;
  description: string;
  sellerName: string;
  city: string;
  imageUrl: string;
};

/** Validate marketplace listings restored from local storage or a backup file. */
export function isMarketplaceListingListValid(value: unknown): value is MarketplaceListing[] {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  for (const item of value) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return false;
    const listing = item as Record<string, unknown>;
    if (typeof listing.id !== "string" || listing.id.trim().length === 0 || ids.has(listing.id)) return false;
    if (listing.sellerType !== "tailor" && listing.sellerType !== "supplier") return false;
    if (listing.sellerActivity !== undefined && !atelierActivities.some((activity) => activity.value === listing.sellerActivity)) return false;
    if (!["title", "category", "price", "description", "sellerName", "city", "imageUrl"].every((key) => typeof listing[key] === "string")) return false;
    if (typeof listing.title !== "string" || listing.title.trim().length === 0) return false;
    ids.add(listing.id);
  }
  return true;
}
