import { describe, expect, it } from "vitest";
import { isPayTechCheckoutUrl } from "../../supabase/functions/_shared/paytech-url";

describe("server-side PayTech checkout URL validation", () => {
  it("accepts only a direct HTTPS checkout URL on paytech.sn", () => {
    expect(isPayTechCheckoutUrl("https://paytech.sn/payment/checkout/abc")).toBe(true);
  });

  it.each([
    "http://paytech.sn/payment/abc",
    "https://paytech.sn.evil.example/payment/abc",
    "https://evil.example/paytech.sn/payment/abc",
    "https://paytech.sn@evil.example/payment/abc",
    "https://user:password@paytech.sn/payment/abc",
    "https://paytech.sn/",
    "not-a-url",
    "",
    " https://paytech.sn/payment/abc"
  ])("rejects an unsafe or malformed URL: %s", (value) => {
    expect(isPayTechCheckoutUrl(value)).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isPayTechCheckoutUrl(null)).toBe(false);
    expect(isPayTechCheckoutUrl({ url: "https://paytech.sn/payment/abc" })).toBe(false);
  });
});
