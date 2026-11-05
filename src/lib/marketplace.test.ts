import { beforeEach, describe, expect, it, vi } from "vitest";

const { authenticatedFetch, publicFetch } = vi.hoisted(() => ({
  authenticatedFetch: vi.fn(),
  publicFetch: vi.fn()
}));

vi.mock("./supabaseAuth", () => ({ authenticatedFetch, publicFetch, projectUrl: "https://supabase.example.test" }));

import { createMarketplaceSeller, getMyMarketplaceSeller, saveMarketplaceListing, listMyMarketplaceListings, deleteMarketplaceListing } from "./marketplace";
import type { YereSession } from "./supabaseAuth";

const session = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_at: 4_000_000_000,
  user: { id: "user-123", email: "seller@example.test" }
} as YereSession;

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

const ownSellerRow = {
  id: "seller-123",
  type_vendeur: "fournisseur",
  atelier_id: null,
  nom_entreprise: "Mercerie Test",
  nom_contact: "Awa",
  telephone: "770000000",
  ville: "Dakar",
  categorie: "Tissus",
  description: "Fournitures de couture",
  logo_path: null,
  statut: "actif"
};

describe("marketplace seller privacy boundary", () => {
  beforeEach(() => authenticatedFetch.mockReset());

  it("loads the current user's seller profile and private contacts through the owner-scoped RPC", async () => {
    authenticatedFetch.mockResolvedValueOnce(jsonResponse([ownSellerRow]));

    const seller = await getMyMarketplaceSeller(session);

    expect(seller).toMatchObject({
      id: "seller-123",
      userId: "user-123",
      businessName: "Mercerie Test",
      contactName: "Awa",
      phone: "770000000",
      atelierId: null
    });
    expect(authenticatedFetch.mock.calls[0][1]).toBe("rest/v1/rpc/get_my_marketplace_seller_profile");
    expect(authenticatedFetch.mock.calls[0][2]).toMatchObject({ method: "POST", body: "{}" });
  });

  it("signs the current seller's private logo with the authenticated session", async () => {
    authenticatedFetch
      .mockResolvedValueOnce(jsonResponse([{ ...ownSellerRow, logo_path: "user-123/seller-123/logo.jpg" }]))
      .mockResolvedValueOnce(jsonResponse({
        signedURL: "/object/sign/yere-market-photos/user-123/seller-123/logo.jpg?token=private"
      }));

    const seller = await getMyMarketplaceSeller(session);

    expect(seller?.logoUrl).toBe("https://supabase.example.test/storage/v1/object/sign/yere-market-photos/user-123/seller-123/logo.jpg?token=private");
    expect(authenticatedFetch).toHaveBeenCalledTimes(2);
    expect(authenticatedFetch.mock.calls[1][1]).toBe("storage/v1/object/sign/yere-market-photos/user-123/seller-123/logo.jpg");
    expect(authenticatedFetch.mock.calls[1][2]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ expiresIn: 3600 })
    });
    expect(publicFetch).not.toHaveBeenCalled();
  });

  it("returns null for a buyer account without a seller profile", async () => {
    authenticatedFetch.mockResolvedValueOnce(jsonResponse([]));

    await expect(getMyMarketplaceSeller(session)).resolves.toBeNull();
    expect(authenticatedFetch).toHaveBeenCalledTimes(1);
  });

  it("creates a seller without requesting restricted contact columns in the insert response", async () => {
    authenticatedFetch
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse([ownSellerRow]));

    const seller = await createMarketplaceSeller(session, {
      sellerType: "fournisseur",
      atelierId: null,
      businessName: "Mercerie Test",
      contactName: "Awa",
      phone: "770000000",
      city: "Dakar",
      category: "Tissus",
      description: "Fournitures de couture"
    });

    expect(seller.contactName).toBe("Awa");
    expect(authenticatedFetch.mock.calls[0][1]).toBe("rest/v1/marketplace_vendeur");
    expect(authenticatedFetch.mock.calls[0][2]).toMatchObject({ method: "POST", headers: { Prefer: "return=minimal" } });
    expect(authenticatedFetch.mock.calls[1][1]).toBe("rest/v1/rpc/get_my_marketplace_seller_profile");
  });
});

describe("marketplace listing photo persistence", () => {
  beforeEach(() => authenticatedFetch.mockReset());

  const listingInput = {
    sellerId: "seller-123",
    title: "Tissu sénégalais",
    category: "Tissus",
    description: "Tissu de démonstration",
    priceXof: 25000,
    unit: "piece" as const,
    city: "Dakar",
    photos: ["user-123/seller-123/photo-1.jpg", "user-123/seller-123/photo-2.jpg"],
    saleMode: "commande_yere" as const,
    status: "publiee" as const,
    stockAvailable: 8
  };

  it("confirms the server returned every uploaded photo path", async () => {
    authenticatedFetch.mockResolvedValueOnce(jsonResponse([{
      id: "listing-123",
      photos: listingInput.photos
    }]));

    await expect(saveMarketplaceListing(session, listingInput)).resolves.toBe("listing-123");
    const request = authenticatedFetch.mock.calls[0][2] as RequestInit;
    expect(JSON.parse(String(request.body)).photos).toEqual(listingInput.photos);
    expect(request.headers).toMatchObject({ Prefer: "return=representation" });
  });

  it("rejects a listing response when the server did not persist its photos", async () => {
    authenticatedFetch.mockResolvedValueOnce(jsonResponse([{
      id: "listing-123",
      photos: []
    }]));

    await expect(saveMarketplaceListing(session, listingInput))
      .rejects.toThrow("ses photos n'ont pas été confirmées par le serveur");
  });

  it("lists only the current seller's own listings and signs their private photos", async () => {
    authenticatedFetch
      .mockResolvedValueOnce(jsonResponse([{
        id: "listing-123", vendeur_id: "seller-123", titre: "Tissu sénégalais", categorie: "Tissus",
        description: "Tissu de démonstration", prix_fcfa: 25000, unite: "piece", ville: "Dakar",
        photos: ["user-123/seller-123/photo-1.jpg"], mode_vente: "commande_yere",
        statut: "publiee", stock_disponible: 8, created_at: "2026-11-05T10:00:00Z"
      }]))
      .mockResolvedValueOnce(jsonResponse({ signedURL: "/object/sign/yere-market-photos/user-123/seller-123/photo-1.jpg?token=private" }));

    const listings = await listMyMarketplaceListings(session, "seller-123");

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({ id: "listing-123", sellerId: "seller-123", title: "Tissu sénégalais" });
    expect(listings[0].photoUrls[0]).toContain("?token=private");
    expect(authenticatedFetch.mock.calls[0][1]).toContain("vendeur_id=eq.seller-123");
    expect(authenticatedFetch.mock.calls[0][1]).toContain("statut.eq.archivee");
    expect(authenticatedFetch.mock.calls[1][1]).toContain("storage/v1/object/sign/");
  });

  it("deletes a seller listing and cleans its stored photos", async () => {
    authenticatedFetch
      .mockResolvedValueOnce(jsonResponse([{ id: "listing-123" }]))
      .mockResolvedValueOnce(jsonResponse({ message: "deleted" }));

    const result = await deleteMarketplaceListing(session, {
      id: "listing-123", sellerId: "seller-123", title: "Tissu sénégalais", category: "Tissus",
      description: "Tissu de démonstration", priceXof: 25000, unit: "piece", city: "Dakar",
      photos: ["user-123/seller-123/photo-1.jpg"], saleMode: "commande_yere",
      status: "publiee", stockAvailable: 8, createdAt: "2026-11-05T10:00:00Z"
    });

    expect(result).toEqual({ deleted: true, archived: false, photosCleaned: true });
    expect(authenticatedFetch.mock.calls[0][1]).toContain("id=eq.listing-123");
    expect(authenticatedFetch.mock.calls[0][2]).toMatchObject({ method: "DELETE" });
    expect(authenticatedFetch.mock.calls[1][1]).toBe("storage/v1/object/yere-market-photos");
  });

  it("archives rather than deleting a listing referenced by an existing order", async () => {
    authenticatedFetch
      .mockResolvedValueOnce(jsonResponse({ code: "23503", message: "violates foreign key constraint" }, 409))
      .mockResolvedValueOnce(jsonResponse([{ id: "listing-123", photos: [] }]));

    const result = await deleteMarketplaceListing(session, {
      id: "listing-123", sellerId: "seller-123", title: "Tissu sénégalais", category: "Tissus",
      description: "Tissu de démonstration", priceXof: 25000, unit: "piece", city: "Dakar",
      photos: [], saleMode: "commande_yere", status: "publiee", stockAvailable: 8,
      createdAt: "2026-11-05T10:00:00Z"
    });

    expect(result).toEqual({ deleted: false, archived: true, photosCleaned: true });
    expect(authenticatedFetch.mock.calls[1][2]).toMatchObject({ method: "PATCH" });
    expect(JSON.parse(String(authenticatedFetch.mock.calls[1][2].body)).statut).toBe("archivee");
  });
});
