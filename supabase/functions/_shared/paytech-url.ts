export function isPayTechCheckoutUrl(value: unknown): value is string {
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
