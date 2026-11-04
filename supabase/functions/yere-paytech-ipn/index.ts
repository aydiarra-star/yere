import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const constantTimeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
};

async function hmacSha256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyNotification(data: Record<string, unknown>, apiKey: string, apiSecret: string, amount: string, reference: string): Promise<boolean> {
  const receivedHmac = typeof data.hmac_compute === "string" ? data.hmac_compute : "";
  if (receivedHmac) {
    const expected = await hmacSha256(apiSecret, amount + "|" + reference + "|" + apiKey);
    return constantTimeEqual(expected.toLowerCase(), receivedHmac.toLowerCase());
  }
  const receivedKeyHash = typeof data.api_key_sha256 === "string" ? data.api_key_sha256 : "";
  const receivedSecretHash = typeof data.api_secret_sha256 === "string" ? data.api_secret_sha256 : "";
  if (!receivedKeyHash || !receivedSecretHash) return false;
  const hashes = await Promise.all([sha256(apiKey), sha256(apiSecret)]);
  return constantTimeEqual(hashes[0], receivedKeyHash.toLowerCase())
    && constantTimeEqual(hashes[1], receivedSecretHash.toLowerCase());
}

async function readPayload(req: Request): Promise<Record<string, unknown>> {
  const raw = await req.text();
  const contentType = req.headers.get("content-type") ?? "";
  let parsed: unknown;
  if (contentType.includes("application/json")) parsed = JSON.parse(raw);
  else if (contentType.includes("multipart/form-data")) {
    const form = await new Response(raw, { headers: { "Content-Type": contentType } }).formData();
    parsed = Object.fromEntries(form.entries());
  } else {
    const params = new URLSearchParams(raw);
    parsed = Object.fromEntries(params.entries());
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Notification PayTech invalide.");
  return parsed as Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ message: "Méthode non autorisée." }, 405);

  try {
    const apiKey = Deno.env.get("PAYTECH_API_KEY");
    const apiSecret = Deno.env.get("PAYTECH_API_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!apiKey || !apiSecret || !supabaseUrl || !serviceKey) {
      console.error("PayTech IPN: configuration serveur incomplète.");
      return json({ message: "Configuration serveur incomplète." }, 503);
    }

    const data = await readPayload(req);
    const typeEvent = String(data.type_event ?? "");
    const reference = String(data.ref_command ?? "");
    const signedAmount = String(data.final_item_price ?? data.item_price ?? "");
    if (!reference || !signedAmount) return json({ message: "Notification non authentifiée." }, 403);

    // Prefer HMAC; use documented SHA256 key hashes only when HMAC is absent.
    if (!await verifyNotification(data, apiKey, apiSecret, signedAmount, reference)) {
      console.warn("PayTech IPN: HMAC invalide.");
      return json({ message: "Signature invalide." }, 403);
    }

    const adminHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };
    const encodedReference = encodeURIComponent(reference);
    const lookup = await fetch(
      `${supabaseUrl}/rest/v1/abonnement_paiement?select=id,montant_fcfa,statut,abonnement_id,details&reference_interne=eq.${encodedReference}&limit=1`,
      { headers: adminHeaders },
    );
    if (!lookup.ok) throw new Error("Impossible de retrouver le paiement YÉRÉ.");
    const rows = await lookup.json();
    const payment = Array.isArray(rows) ? rows[0] : null;
    if (!payment) return json({ message: "Référence de paiement inconnue." }, 404);

    const methodText = String(data.payment_method ?? "").toLowerCase();
    const method = methodText.includes("wave") ? "wave"
      : methodText.includes("orange") ? "orange_money"
      : methodText.includes("carte") || methodText.includes("bank") ? "carte" : "autre";
    const providerReference = typeof data.token === "string" ? data.token : null;
    const amount = Number(signedAmount);
    const currency = String(data.currency ?? "").toUpperCase();
    const env = String(data.env ?? "unknown");

    if (typeEvent === "sale_complete") {
      if (currency !== "XOF" || !Number.isSafeInteger(amount) || amount !== Number(payment.montant_fcfa) || amount !== 5000) {
        console.error("PayTech IPN: montant non conforme pour", reference);
        return json({ message: "Montant de paiement non conforme." }, 409);
      }
      const confirmed = await fetch(`${supabaseUrl}/rest/v1/rpc/confirm_paytech_subscription_payment`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          p_reference: reference,
          p_provider_reference: providerReference,
          p_payment_method: method,
          p_amount: amount,
          p_environment: env,
        }),
      });
      if (!confirmed.ok) {
        console.error("PayTech IPN: confirmation atomique refusée.");
        return json({ message: "Confirmation du paiement impossible." }, 409);
      }
      return new Response("IPN OK", { status: 200 });
    }

    if (typeEvent === "sale_canceled") {
      if (payment.statut === "en_attente") {
        const canceled = await fetch(`${supabaseUrl}/rest/v1/abonnement_paiement?id=eq.${encodeURIComponent(payment.id)}&statut=eq.en_attente`, {
          method: "PATCH",
          headers: { ...adminHeaders, Prefer: "return=minimal" },
          body: JSON.stringify({ statut: "echec", details: { provider: "paytech", env, event: "sale_canceled" } }),
        });
        if (!canceled.ok) throw new Error("Impossible d'enregistrer l'annulation PayTech.");
      }
      return new Response("IPN OK", { status: 200 });
    }

    if (typeEvent === "refund_complete") {
      if (currency !== "XOF" || !Number.isSafeInteger(amount) || amount !== Number(payment.montant_fcfa) || amount !== 5000) {
        console.error("PayTech IPN: remboursement non conforme pour", reference);
        return json({ message: "Montant ou devise du remboursement non conforme." }, 409);
      }
      if (payment.statut !== "confirme" && payment.statut !== "rembourse") {
        return json({ message: "Paiement non remboursable dans son état actuel." }, 409);
      }
      const refunded = await fetch(`${supabaseUrl}/rest/v1/abonnement_paiement?id=eq.${encodeURIComponent(payment.id)}&statut=eq.confirme`, {
        method: "PATCH",
        headers: { ...adminHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({ statut: "rembourse", details: { provider: "paytech", env, event: "refund_complete" } }),
      });
      if (!refunded.ok) throw new Error("Impossible d'enregistrer le remboursement PayTech.");
      return new Response("IPN OK", { status: 200 });
    }

    // Ignore authenticated events that are unrelated to incoming subscription payments.
    return new Response("IPN ignored", { status: 200 });
  } catch (error) {
    console.error("YÉRÉ PayTech IPN:", error instanceof Error ? error.message : "unknown_error");
    return json({ message: "Erreur de traitement de la notification." }, 500);
  }
});
