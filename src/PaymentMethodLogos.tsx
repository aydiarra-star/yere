import "./payment-method-logos.css";

export default function PaymentMethodLogos() {
  return (
    <section className="payment-methods" aria-label="Moyens de paiement">
      <p className="payment-methods-title">Paiement via PayTech</p>
      <div className="payment-methods-list">
        <div className="payment-method-logo payment-logo-wave" role="img" aria-label="Wave">
          <img src="https://oqsf.sn/wp-content/uploads/2023/04/wave-300x300.webp" alt="Wave" />
        </div>
      </div>
      <p className="payment-methods-note">Les autres moyens de paiement éventuellement proposés sont affichés directement sur la page sécurisée PayTech.</p>
    </section>
  );
}
