import { describe, it, expect } from "vitest";
import { parseICal, isReservation } from "@/lib/ical/parse";

const SAMPLE = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Airbnb Inc//Hosting Calendar 1.0.0//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
DTEND;VALUE=DATE:20260720
DTSTART;VALUE=DATE:20260715
UID:1234abcd@airbnb.com
SUMMARY:Reserved
END:VEVENT
BEGIN:VEVENT
DTEND;VALUE=DATE:20260725
DTSTART;VALUE=DATE:20260722
UID:blocked1@airbnb.com
SUMMARY:Airbnb (Not available)
END:VEVENT
END:VCALENDAR`;

describe("parseICal", () => {
  it("extracts VEVENTs with uid and start/end dates", () => {
    const events = parseICal(SAMPLE);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      uid: "1234abcd@airbnb.com",
      start: "2026-07-15",
      end: "2026-07-20",
      summary: "Reserved",
    });
  });

  it("unfolds continuation lines", () => {
    const folded = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:x@airbnb.com
DTSTART;VALUE=DATE:20260101
DTEND;VALUE=DATE:20260103
SUMMARY:Reserved for a very long guest na
 me
END:VEVENT
END:VCALENDAR`;
    const [ev] = parseICal(folded);
    expect(ev.summary).toBe("Reserved for a very long guest name");
  });

  it("ignores events missing required fields", () => {
    const bad = `BEGIN:VEVENT
UID:only-uid@airbnb.com
END:VEVENT`;
    expect(parseICal(bad)).toHaveLength(0);
  });
});

describe("isReservation", () => {
  it("keeps real reservations and drops blocked/unavailable dates", () => {
    const events = parseICal(SAMPLE);
    const reservations = events.filter(isReservation);
    expect(reservations).toHaveLength(1);
    expect(reservations[0].uid).toBe("1234abcd@airbnb.com");
  });

  it("treats a summary-less event as a booking", () => {
    expect(isReservation({ uid: "u", start: "2026-01-01", end: "2026-01-02", summary: null })).toBe(true);
  });
});
