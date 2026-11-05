import { describe, expect, it } from "vitest";
import { summarizeMarketplaceReviews, type MarketplaceReview } from "./marketplace";

const review = (rating: number): Pick<MarketplaceReview, "rating"> => ({ rating });

describe("summarizeMarketplaceReviews", () => {
  it("returns an empty summary when there are no verified reviews", () => {
    expect(summarizeMarketplaceReviews([])).toEqual({ count: 0, average: 0 });
  });

  it("calculates a one-decimal average from verified ratings", () => {
    expect(summarizeMarketplaceReviews([review(5), review(4), review(4)])).toEqual({ count: 3, average: 4.3 });
  });

  it("does not round a single review incorrectly", () => {
    expect(summarizeMarketplaceReviews([review(2)])).toEqual({ count: 1, average: 2 });
  });
});
