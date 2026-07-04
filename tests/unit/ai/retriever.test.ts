import { describe, it, expect } from "vitest";
import { rerank } from "@/lib/ai/retriever";
import type { RetrievedRecommendation } from "@/lib/ai/types";

function rec(overrides: Partial<RetrievedRecommendation>): RetrievedRecommendation {
  return {
    id: "x",
    name: "Place",
    description: "",
    host_note: null,
    category_id: "c",
    address: null,
    distance_from_property: null,
    estimated_travel_time: null,
    price_level: null,
    opening_hours: null,
    booking_required: false,
    family_friendly: true,
    map_url: null,
    website_url: null,
    phone_number: null,
    tags: [],
    priority_score: 5,
    similarity: 0.5,
    ...overrides,
  };
}

describe("rerank", () => {
  it("boosts higher host priority above a marginally more similar result", () => {
    const a = rec({ id: "a", similarity: 0.70, priority_score: 10 });
    const b = rec({ id: "b", similarity: 0.75, priority_score: 1 });
    const ranked = rerank([b, a], { hasKids: false });
    // a: 0.70 + 0.1 = 0.80 ; b: 0.75 - 0.08 = 0.67
    expect(ranked[0].id).toBe("a");
  });

  it("penalizes non-family-friendly places when guest has kids", () => {
    const family = rec({ id: "f", similarity: 0.6, family_friendly: true });
    const adult = rec({ id: "n", similarity: 0.65, family_friendly: false });
    const ranked = rerank([adult, family], { hasKids: true });
    // adult: 0.65 - 0.15 = 0.50 ; family: 0.60
    expect(ranked[0].id).toBe("f");
  });

  it("keeps similarity ordering when other signals are equal", () => {
    const a = rec({ id: "a", similarity: 0.9 });
    const b = rec({ id: "b", similarity: 0.4 });
    const ranked = rerank([b, a], { hasKids: false });
    expect(ranked.map((r) => r.id)).toEqual(["a", "b"]);
  });
});
