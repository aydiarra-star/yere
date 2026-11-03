import "./payment-method-logos.css";

const methods = [
  { name: "Wave", className: "payment-logo-wave", mark: <><span className="wave-symbol" aria-hidden="true">≈</span><span>wave</span></> },
  { name: "Orange Money", className: "payment-logo-orange", mark: <><span className="orange-symbol" aria-hidden="true">orange</span><span>money</span></> },
  { name: "Visa", className: "payment-logo-visa", mark: <span>VISA</span> },
  { name: "Mastercard", className: "payment-logo-mastercard", mark: <><span className="mastercard-symbol" aria-hidden="true"><i /><i /></span><span className="mastercard-word">mastercard</span></> },
] as const;

export default function PaymentMethodLogos() {
  return (
    <section className="payment-methods" aria-label="Moyens de paiement proposés">
      <p className="payment-methods-title">Moyens de paiement disponibles</p>
      <div className="payment-methods-list">
        {methods.map((method) => (
          <div className={`payment-method-logo ${method.className}`} key={method.name} role="img" aria-label={method.name}>
            {method.mark}
          </div>
        ))}
      </div>
      <p className="payment-methods-note">Le choix du moyen de paiement et la confirmation s’effectuent sur la page sécurisée PayTech.</p>
    </section>
  );
}
