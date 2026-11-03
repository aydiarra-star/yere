import { useState } from "react";
import { readSession } from "./lib/supabaseAuth";
import { startAtelierSubscriptionPayment } from "./lib/paytech";
import PaymentMethodLogos from "./PaymentMethodLogos";

export default function PayTechSubscriptionButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function beginPayment() {
    const session = readSession();
    const atelierId = window.sessionStorage.getItem("yere-active-atelier");
    if (!session || !atelierId) {
      setError("Votre session ou votre atelier n'est plus disponible. Reconnectez-vous.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const checkout = await startAtelierSubscriptionPayment(session, atelierId);
      window.location.assign(checkout.redirectUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de démarrer le paiement.");
      setBusy(false);
    }
  }

  return (
    <div className="paytech-subscription-action">
      <button type="button" className="primary-button" onClick={() => void beginPayment()} disabled={busy}>
        {busy ? "Préparation du paiement…" : "Payer / renouveler — 5 000 FCFA"}
      </button>
      <p className="privacy-note">Paiement sécurisé sur la page PayTech. L'abonnement ne sera activé qu'après confirmation serveur du paiement.</p>
      <PaymentMethodLogos />
      {error && <p role="alert" className="form-error">{error}</p>}
    </div>
  );
}
