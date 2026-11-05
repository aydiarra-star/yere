import { useEffect, useState } from "react";
import { readSession } from "./lib/supabaseAuth";
import { startAtelierSubscriptionPayment } from "./lib/paytech";
import PaymentMethodLogos from "./PaymentMethodLogos";

export default function PayTechSubscriptionButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const updateNetwork = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);
    return () => {
      window.removeEventListener("online", updateNetwork);
      window.removeEventListener("offline", updateNetwork);
    };
  }, []);

  async function beginPayment() {
    if (!navigator.onLine) {
      setError("Vous êtes hors ligne. Le paiement PayTech nécessite une connexion Internet. Aucun paiement n’a été lancé.");
      return;
    }
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
      {!online && <p role="status" className="privacy-note">Connexion Internet nécessaire : le paiement est momentanément indisponible. Aucun paiement ne sera lancé hors ligne.</p>}
      <button type="button" className="primary-button" onClick={() => void beginPayment()} disabled={busy || !online}>
        {busy ? "Préparation du paiement…" : "Payer / renouveler — 5 000 FCFA"}
      </button>
      <p className="privacy-note">Paiement sécurisé sur la page PayTech. L'abonnement ne sera activé qu'après confirmation serveur du paiement.</p>
      <PaymentMethodLogos />
      {error && <p role="alert" className="form-error">{error}</p>}
    </div>
  );
}
