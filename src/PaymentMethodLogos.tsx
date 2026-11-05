import "./payment-method-logos.css";

const methods = [
  {
    name: "Wave",
    src: "https://www.wave.com/img/terms/logo.png",
    wordmark: "wave",
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
  {
    name: "Free Money",
    src: "https://www.boasenegal.com/wp-content/uploads/2020/04/fee-money-768x608.png",
    className: "payment-logo-free",
  },
];

export default function PaymentMethodLogos() {
  return (
    <section className="payment-methods" aria-label="Moyens de paiement">
      <p className="payment-methods-title">Moyens de paiement via PayTech</p>
      <div className="payment-methods-list">
        {methods.map((method) => (
          <div
            className={`payment-method-logo ${method.className}`}
            data-fallback={method.name}
            key={method.name}
          >
            <img
              src={method.src}
              alt={method.name}
              loading="eager"
              decoding="async"
              onError={(event) => {
                event.currentTarget.parentElement?.classList.add("is-image-error");
              }}
            />
            {method.wordmark && (
              <span className="payment-method-wordmark" aria-hidden="true">
                {method.wordmark}
              </span>
            )}
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
