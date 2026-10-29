/** Files in public/ are copied into the build and resolved relative to the app's base URL. */
export const illustrationPaths = {
  delivery: "images/delivery-reference.webp",
  payment: "images/payment-reference.webp",
  production: "images/production-reference.webp",
  atelier: "images/atelier.webp"
} as const;

type Illustration = keyof typeof illustrationPaths;

export function illustrationUrl(illustration: Illustration, base = import.meta.env.BASE_URL): string {
  return `${base}${illustrationPaths[illustration]}`;
}
