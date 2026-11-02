import PublicMarket from "./PublicMarket";

// Compatibility entry for older imports: there is only one public Marketplace.
// Keep the former component name, but never render the retired green storefront.
type Props = { onProfessionalLogin?: () => void };

export default function PublicMarketplace({ onProfessionalLogin }: Props) {
  void onProfessionalLogin;
  return <PublicMarket />;
}
