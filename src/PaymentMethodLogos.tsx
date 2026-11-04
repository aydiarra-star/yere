import "./payment-method-logos.css";

const methods = [
  {
    name: "Wave",
    src: "/images/payments/wave.svg",
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
            <img
              src={method.src}
              alt={method.name}
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
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
