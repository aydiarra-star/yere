import { beforeEach, describe, expect, it, vi } from "vitest";

const { authenticatedFetch } = vi.hoisted(() => ({
  authenticatedFetch: vi.fn()
}));

vi.mock("./supabaseAuth", () => ({
  authenticatedFetch,
  projectUrl: "https://supabase.example.test"
}));

import { startAtelierSubscriptionPayment } from "./paytech";
import type { YereSession } from "./supabaseAuth";

const session = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_at: 4_000_000_000,
  user: { id: "user-123", email: "owner@example.test" }
} as YereSession;

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("PayTech checkout redirect validation", () => {
  beforeEach(() => authenticatedFetch.mockReset());

  it("accepts a secure PayTech checkout URL and a non-empty reference", async () => {
    authenticatedFetch.mockResolvedValueOnce(jsonResponse({
      redirectUrl: "https://paytech.sn/payment/checkout/abc",
      reference: "YERE-TEST-123"
    }));

    await expect(startAtelierSubscriptionPayment(session, "atelier-123")).resolves.toEqual({
      redirectUrl: "https://paytech.sn/payment/checkout/abc",
      reference: "YERE-TEST-123"
    });
    expect(authenticatedFetch).toHaveBeenCalledWith(session, "functions/v1/yere-paytech-create", {
      method: "POST",
      body: JSON.stringify({ atelierId: "atelier-123" })
    });
  });

  it.each([
    "http://paytech.sn/payment/abc",
    "https://paytech.sn.evil.example/payment/abc",
    "https://evil.example/paytech.sn/payment/abc",
    "https://paytech.sn@evil.example/payment/abc",
    "https://user:password@paytech.sn/payment/abc",
    "not-a-url"
  ])("rejects an unsafe or malformed checkout destination: %s", async (redirectUrl) => {
    authenticatedFetch.mockResolvedValueOnce(jsonResponse({
      redirectUrl,
      reference: "YERE-TEST-123"
    }));

    await expect(startAtelierSubscriptionPayment(session, "atelier-123"))
      .rejects.toThrow("PayTech n'a pas retourné une page de paiement valide.");
  });

  it("rejects a missing or blank payment reference", async () => {
    authenticatedFetch.mockResolvedValueOnce(jsonResponse({
      redirectUrl: "https://paytech.sn/payment/checkout/abc",
      reference: "   "
    }));

    await expect(startAtelierSubscriptionPayment(session, "atelier-123"))
      .rejects.toThrow("PayTech n'a pas retourné une page de paiement valide.");
  });

  it("surfaces the server error without returning a checkout URL", async () => {
    authenticatedFetch.mockResolvedValueOnce(jsonResponse({ message: "Atelier non autorisé." }, 403));

    await expect(startAtelierSubscriptionPayment(session, "atelier-123"))
      .rejects.toThrow("Atelier non autorisé.");
  });
});
