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

  it("escalates booking-change requests instead of handling them", () => {
    for (const msg of [
      "can I extend my stay by one more night?",
      "I need to change my dates",
      "please cancel my booking",
      "is late checkout possible?",
    ]) {
      const d = detectEscalation(msg, cls());
      expect(d.shouldEscalate).toBe(true);
      expect(d.reason).toBe("booking_request");
    }
  });

  it("escalates payment/invoice requests", () => {
    const d = detectEscalation("can you send me an invoice for the extra charge?", cls());
    expect(d.reason).toBe("booking_request");
  });

  it("does not misfire on unrelated 'cancel' (e.g. a dinner reservation)", () => {
    const d = detectEscalation("should I cancel my dinner reservation if it rains?", cls());
    expect(d.shouldEscalate).toBe(false);
  });

  it("still treats refunds as complaints", () => {
    const d = detectEscalation("I want a refund, this is unacceptable", cls());
    expect(d.reason).toBe("complaint");
  });
});
