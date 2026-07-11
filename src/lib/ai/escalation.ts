import type { ClassificationResult } from "./types";

export type EscalationReason =
  | "emergency"
  | "complaint"
  | "low_confidence"
  | "human_requested"
  | "booking_request"
  | null;

const EMERGENCY_KEYWORDS = [
  "emergency", "ambulance", "police", "fire", "hospital", "doctor",
  "accident", "injured", "injury", "bleeding", "unconscious", "heart attack",
  "robbed", "stolen", "break in", "danger", "help me", "urgent",
];

const HUMAN_KEYWORDS = [
  "speak to a human", "talk to a person", "real person", "speak to the host",
  "talk to the host", "speak to the manager", "talk to the manager",
  "speak to someone", "call the owner", "contact the host",
];

const ANGER_KEYWORDS = [
  "unacceptable", "refund", "terrible", "awful", "disgusting", "worst",
  "furious", "angry", "complaint", "complain", "scam", "ripoff", "rip off",
];

// Money and booking changes the assistant must never handle itself — it hands
// these to the host rather than quoting prices or altering reservations.
const BOOKING_KEYWORDS = [
  "cancel my booking", "cancel my reservation", "cancel the booking", "cancel my stay",
  "change my dates", "change the dates", "change my booking", "modify my booking",
  "modify my reservation", "reschedule my", "move my booking",
  "extend my stay", "extra night", "one more night", "another night", "stay longer",
  "late checkout", "late check-out", "early check-in", "early check in",
  "check in early", "check out late",
  "extra charge", "extra fee", "invoice", "receipt", "pay extra",
  "additional payment", "my deposit", "get my deposit",
];

const LOW_CONFIDENCE_THRESHOLD = 0.4;

export interface EscalationDecision {
  shouldEscalate: boolean;
  reason: EscalationReason;
  guestMessage: string | null;
}

export function detectEscalation(
  message: string,
  classification: ClassificationResult
): EscalationDecision {
  const lower = message.toLowerCase();

  if (classification.intent === "emergency" || containsAny(lower, EMERGENCY_KEYWORDS)) {
    return {
      shouldEscalate: true,
      reason: "emergency",
      guestMessage:
        "This sounds urgent. If it's a life-threatening emergency, please contact local emergency services immediately. I've also notified the host so they can help right away. 🙏",
    };
  }

  if (containsAny(lower, HUMAN_KEYWORDS)) {
    return {
      shouldEscalate: true,
      reason: "human_requested",
      guestMessage:
        "Of course — I've passed your message to the host and they'll get back to you shortly. 😊",
    };
  }

  if (containsAny(lower, BOOKING_KEYWORDS)) {
    return {
      shouldEscalate: true,
      reason: "booking_request",
      guestMessage:
        "That's something the host takes care of directly — I've let them know and they'll sort it out for you. 😊 Is there anything else I can help with in the meantime?",
    };
  }

  if (classification.intent === "complaint" || containsAny(lower, ANGER_KEYWORDS)) {
    return {
      shouldEscalate: true,
      reason: "complaint",
      guestMessage:
        "I'm sorry to hear that. I've flagged this to the host so they can look into it and reach out to you directly. 🙏",
    };
  }

  if (classification.confidence < LOW_CONFIDENCE_THRESHOLD) {
    return {
      shouldEscalate: true,
      reason: "low_confidence",
      guestMessage:
        "Let me check on that for you — I've asked the host and they'll follow up shortly. In the meantime, is there anything else I can help with? 😊",
    };
  }

  return { shouldEscalate: false, reason: null, guestMessage: null };
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}
