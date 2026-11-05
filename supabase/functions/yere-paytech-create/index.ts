import "jsr:@supabase/functions-js/edge-runtime.d.ts";

function isPayTechCheckoutUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0) return false;
  try {
    const destination = new URL(value);
    return destination.protocol === "https:"
      && destination.hostname === "paytech.sn"
      && destination.username === ""
      && destination.password === ""
      && destination.pathname.length > 1;
  } catch {
    return false;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const requiredEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Configuration serveur manquante : ${name}`);
  return value;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ message: "Méthode non autorisée." }, 405);

  try {
    const supabaseUrl = requiredEnv("SUPABASE_URL").replace(/\/$/, "");
    const anonKey = requiredEnv("SUPABASE_ANON_KEY");
    const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = requiredEnv("PAYTECH_API_KEY");
    const apiSecret = requiredEnv("PAYTECH_API_SECRET");
    const env = Deno.env.get("PAYTECH_ENV") === "prod" ? "prod" : "test";
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ message: "Connexion requise." }, 401);

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authorization },
    });
    if (!userResponse.ok) return json({ message: "Session invalide ou expirée." }, 401);
    const user = await userResponse.json();
    if (typeof user.id !== "string") return json({ message: "Utilisateur non authentifié." }, 401);

    const body = await req.json().catch(() => ({}));
    const atelierId = typeof body.atelierId === "string" ? body.atelierId : "";
    if (!/^[0-9a-f-]{36}$/i.test(atelierId)) return json({ message: "Atelier invalide." }, 400);

    const adminHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };
    const memberUrl = new URL(`${supabaseUrl}/rest/v1/atelier_membre`);
    memberUrl.search = new URLSearchParams({
      select: "atelier_id",
      atelier_id: `eq.${atelierId}`,
      user_id: `eq.${user.id}`,
      role: "eq.proprietaire",
      actif: "eq.true",
      limit: "1",
    }).toString();
    const memberResponse = await fetch(memberUrl, { headers: adminHeaders });
    if (!memberResponse.ok) throw new Error("Impossible de vérifier les droits du propriétaire.");
    const members = await memberResponse.json();
    if (!Array.isArray(members) || members.length !== 1) return json({ message: "Seul le propriétaire de cet atelier peut payer l'abonnement." }, 403);

    const subscriptionUrl = new URL(`${supabaseUrl}/rest/v1/abonnement_atelier`);
    subscriptionUrl.search = new URLSearchParams({
      select: "id,atelier_id,montant_mensuel_fcfa,devise,statut,fin_essai,periode_fin",
      atelier_id: `eq.${atelierId}`,
      limit: "1",
    }).toString();
    const subscriptionResponse = await fetch(subscriptionUrl, { headers: adminHeaders });
    if (!subscriptionResponse.ok) throw new Error("Impossible de lire l'abonnement de l'atelier.");
    const subscriptions = await subscriptionResponse.json();
    const subscription = Array.isArray(subscriptions) ? subscriptions[0] : null;
    if (!subscription || subscription.devise !== "XOF" || Number(subscription.montant_mensuel_fcfa) !== 5000) {
      return json({ message: "Abonnement introuvable ou montant non conforme." }, 409);
    }
    if (subscription.statut === "resilie" || subscription.statut === "suspendu") {
      return json({ message: "Cet abonnement ne peut pas être renouvelé en ligne. Contactez l'assistance YÉRÉ." }, 409);
    }

    // Reuse a recent pending checkout to avoid duplicate payment attempts on repeated taps.
    const pendingUrl = new URL(`${supabaseUrl}/rest/v1/abonnement_paiement`);
    pendingUrl.search = new URLSearchParams({
      select: "reference_interne,details",
      abonnement_id: `eq.${subscription.id}`,
      statut: "eq.en_attente",
      created_at: `gte.${new Date(Date.now() - 15 * 60 * 1000).toISOString()}`,
      order: "created_at.desc",
      limit: "1",
    }).toString();
    const pendingResponse = await fetch(pendingUrl, { headers: adminHeaders });
    if (!pendingResponse.ok) throw new Error("Impossible de vérifier les tentatives de paiement en attente.");
    const pendingRows = await pendingResponse.json();
    const pending = Array.isArray(pendingRows) ? pendingRows[0] : null;
    const pendingDetails = pending?.details && typeof pending.details === "object" ? pending.details : {};
    if (isPayTechCheckoutUrl(pendingDetails.redirect_url) && pendingDetails.env === env) {
      return json({ redirectUrl: pendingDetails.redirect_url, reference: pending.reference_interne, reused: true });
    }

    const reference = `YERE-${crypto.randomUUID().replaceAll("-", "").toUpperCase()}`;
    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/abonnement_paiement`, {
      method: "POST",
      headers: { ...adminHeaders, Prefer: "return=representation" },
      body: JSON.stringify({
        abonnement_id: subscription.id,
        montant_fcfa: 5000,
        devise: "XOF",
        statut: "en_attente",
        reference_interne: reference,
        details: { provider: "paytech", env },
      }),
    });
    if (!insertResponse.ok) throw new Error("Impossible de préparer le paiement dans YÉRÉ.");
    const inserted = await insertResponse.json();
    if (!Array.isArray(inserted) || inserted.length !== 1) throw new Error("YÉRÉ n'a pas confirmé la préparation du paiement.");

    const origin = req.headers.get("origin");
    const allowedOrigins = (Deno.env.get("YERE_ALLOWED_ORIGINS") ?? "https://yere-main-preview.onrender.com")
      .split(",").map((item) => item.trim()).filter(Boolean);
    const appOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    const ipnUrl = `${supabaseUrl}/functions/v1/yere-paytech-ipn`;
    const paymentResponse = await fetch("https://paytech.sn/api/payment/request-payment", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", API_KEY: apiKey, API_SECRET: apiSecret },
      body: JSON.stringify({
        item_name: "Abonnement mensuel YÉRÉ",
        item_price: 5000,
        currency: "XOF",
        ref_command: reference,
        command_name: "Abonnement atelier YÉRÉ - 5 000 FCFA",
        target_payment: "Orange Money, Wave, Free Money, Carte Bancaire",
        env,
        ipn_url: ipnUrl,
        refund_notif_url: ipnUrl,
        success_url: `${appOrigin}/atelier?abonnement=retour`,
        cancel_url: `${appOrigin}/atelier?abonnement=annule`,
        custom_field: JSON.stringify({ product: "yere_atelier_subscription", reference }),
      }),
    });
    const payment = await paymentResponse.json().catch(() => ({}));
    if (!paymentResponse.ok || payment.success !== 1 || !isPayTechCheckoutUrl(payment.redirect_url)) {
      await fetch(`${supabaseUrl}/rest/v1/abonnement_paiement?reference_interne=eq.${encodeURIComponent(reference)}`, {
        method: "PATCH",
        headers: { ...adminHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({ statut: "echec", details: { provider: "paytech", env, error: "payment_request_failed" } }),
      });
      return json({ message: "PayTech n'a pas pu créer la page de paiement. Aucun abonnement n'a été activé." }, 502);
    }

    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/abonnement_paiement?reference_interne=eq.${encodeURIComponent(reference)}`, {
      method: "PATCH",
      headers: { ...adminHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({
        details: { provider: "paytech", env, token: typeof payment.token === "string" ? payment.token : null, redirect_url: payment.redirect_url },
      }),
    });
    if (!updateResponse.ok) throw new Error("La page PayTech est créée, mais YÉRÉ n'a pas pu enregistrer sa référence.");

    return json({ redirectUrl: payment.redirect_url, reference, reused: false });
  } catch (error) {
    console.error("YÉRÉ PayTech create-payment:", error instanceof Error ? error.message : "unknown_error");
    return json({ message: error instanceof Error ? error.message : "Erreur interne lors de la préparation du paiement." }, 500);
  }
});
