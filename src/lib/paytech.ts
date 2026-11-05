import type { YereSession } from "./supabaseAuth";
import { projectUrl, authenticatedFetch } from "./supabaseAuth";

export async function startAtelierSubscriptionPayment(session: YereSession, atelierId: string): Promise<{ redirectUrl: string; reference: string }> {
  if (!projectUrl) throw new Error("La connexion Supabase n'est pas configurée.");
  const response = await authenticatedFetch(session, "functions/v1/yere-paytech-create", {
    method: "POST",
    body: JSON.stringify({ atelierId }),
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(String(body.message ?? body.error ?? "Impossible de préparer le paiement PayTech."));
  }
  const redirectUrl = typeof body.redirectUrl === "string" ? body.redirectUrl : "";
  const reference = typeof body.reference === "string" ? body.reference.trim() : "";
  let destination: URL | null = null;
  try {
    destination = new URL(redirectUrl);
  } catch {
    // A malformed redirect must never be handed to the browser.
  }
  if (!destination
    || destination.protocol !== "https:"
    || destination.hostname !== "paytech.sn"
    || destination.username !== ""
    || destination.password !== ""
    || !destination.pathname.startsWith("/")
    || !reference) {
    throw new Error("PayTech n'a pas retourné une page de paiement valide.");
  }
  return { redirectUrl, reference };
}
