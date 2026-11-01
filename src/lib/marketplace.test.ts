import { beforeEach, describe, expect, it, vi } from "vitest";

const { authenticatedFetch } = vi.hoisted(() => ({
  authenticatedFetch: vi.fn()
}));

vi.mock("./supabaseAuth", () => ({ authenticatedFetch }));

import { createMarketplaceSeller, getMyMarketplaceSeller } from "./marketplace";
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

const publicSellerRow = {
  id: "seller-123",
  type_vendeur: "fournisseur",
  atelier_id: null,
  nom_entreprise: "Mercerie Test",
  ville: "Dakar",
  categorie: "Tissus",
  description: "Fournitures de couture",
  statut: "actif"
};

describe("marketplace seller privacy boundary", () => {
  beforeEach(() => authenticatedFetch.mockReset());

  it("loads only public seller columns and obtains private contact through the owner RPC", async () => {
    authenticatedFetch
      .mockResolvedValueOnce(jsonResponse([publicSellerRow]))
      .mockResolvedValueOnce(jsonResponse([{ nom_contact: "Awa", telephone: "770000000" }]));

    const seller = await getMyMarketplaceSeller(session);

    expect(seller).toMatchObject({
      id: "seller-123",
      userId: "user-123",
      businessName: "Mercerie Test",
      contactName: "Awa",
      phone: "770000000"
    });
    const profileRequest = authenticatedFetch.mock.calls[0][1] as string;
    expect(profileRequest).toContain("select=id,type_vendeur,atelier_id,nom_entreprise,ville,categorie,description,statut");
    expect(profileRequest).not.toMatch(/nom_contact|telephone|user_id/);
    expect(authenticatedFetch.mock.calls[1][1]).toBe("rest/v1/rpc/get_my_marketplace_seller_contact");
    expect(authenticatedFetch.mock.calls[1][2]).toMatchObject({ method: "POST", body: "{}" });
  });

  it("does not call the private contact RPC when the account has no seller profile", async () => {
    authenticatedFetch.mockResolvedValueOnce(jsonResponse([]));

    await expect(getMyMarketplaceSeller(session)).resolves.toBeNull();
    expect(authenticatedFetch).toHaveBeenCalledTimes(1);
  });

  it("creates a seller without requesting restricted contact columns in the insert response", async () => {
    authenticatedFetch
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse([publicSellerRow]))
      .mockResolvedValueOnce(jsonResponse([{ nom_contact: "Awa", telephone: "770000000" }]));

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
    expect(String(authenticatedFetch.mock.calls[1][1])).not.toMatch(/nom_contact|telephone|user_id/);
  });
});
