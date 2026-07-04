import { describe, it, expect } from "vitest";
import { detectEscalation } from "@/lib/ai/escalation";
import type { ClassificationResult } from "@/lib/ai/types";

function cls(overrides: Partial<ClassificationResult> = {}): ClassificationResult {
  return { intent: "recommendation", confidence: 0.9, category_hint: null, needs_clarification: null, ...overrides };
}

describe("detectEscalation", () => {
  it("escalates emergencies by intent", () => {
    const d = detectEscalation("I feel fine", cls({ intent: "emergency" }));
    expect(d.shouldEscalate).toBe(true);
    expect(d.reason).toBe("emergency");
  });

  it("escalates emergency keywords even with non-emergency intent", () => {
    const d = detectEscalation("there's been an accident, call an ambulance", cls());
    expect(d.shouldEscalate).toBe(true);
    expect(d.reason).toBe("emergency");
  });

  it("escalates explicit human requests", () => {
    const d = detectEscalation("can I speak to the host please", cls());
    expect(d.shouldEscalate).toBe(true);
    expect(d.reason).toBe("human_requested");
  });

  it("escalates complaints", () => {
    const d = detectEscalation("this is unacceptable, I want a refund", cls());
    expect(d.shouldEscalate).toBe(true);
    expect(d.reason).toBe("complaint");
  });

  it("escalates low confidence", () => {
    const d = detectEscalation("hmm what about that thing", cls({ confidence: 0.2 }));
    expect(d.shouldEscalate).toBe(true);
    expect(d.reason).toBe("low_confidence");
  });

  it("does not escalate a normal confident recommendation request", () => {
    const d = detectEscalation("where can we eat seafood tonight?", cls());
    expect(d.shouldEscalate).toBe(false);
    expect(d.guestMessage).toBeNull();
  });

  it("prioritizes emergency over complaint keywords", () => {
    const d = detectEscalation("this is terrible, someone is injured", cls({ intent: "complaint" }));
    expect(d.reason).toBe("emergency");
  });
});
