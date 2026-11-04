import "./payment-method-logos.css";

const methods = [
  {
    name: "Wave",
    src: "https://oqsf.sn/wp-content/uploads/2023/04/wave-300x300.webp",
    className: "payment-logo-wave",
  },
  {
    name: "Orange Money",
    src: "https://upload.wikimedia.org/wikipedia/commons/1/19/Logo_Orange_Money.svg",
    className: "payment-logo-orange",
  },
  {
    name: "Visa",
    src: "/images/payments/visa.svg",
    className: "payment-logo-visa",
  },
  {
    name: "Mastercard",
    src: "/images/payments/mastercard.svg",
    className: "payment-logo-mastercard",
  },
];

export default function PaymentMethodLogos() {
  return (
    <section className="payment-methods" aria-label="Moyens de paiement">
      <p className="payment-methods-title">Moyens de paiement via PayTech</p>
      <div className="payment-methods-list">
        {methods.map((method) => (
          <div className={`payment-method-logo ${method.className}`} key={method.name}>
            <img src={method.src} alt={method.name} loading="lazy" />
          </div>
        ))}
      </div>
      <p className="payment-methods-note">
        Free Money peut également être proposé sur la page sécurisée PayTech selon les moyens activés pour la transaction.
        Le paiement et l’activation de l’abonnement restent confirmés par le serveur.
      </p>
    </section>
  );
}
