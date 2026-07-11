/**
 * Minimal iCalendar (RFC 5545) parser for Airbnb / Booking.com / Vrbo export
 * feeds. We only need VEVENTs with their UID and start/end dates.
 *
 * Airbnb feeds use all-day events: DTSTART;VALUE=DATE:20260715 and a DTEND that
 * is the checkout day (exclusive, per the spec).
 */
export interface ParsedEvent {
  uid: string;
  /** Check-in date, YYYY-MM-DD. */
  start: string;
  /** Check-out date, YYYY-MM-DD (DTEND as given; already the checkout day). */
  end: string;
  summary: string | null;
}

/** Unfold folded lines: continuation lines start with a space or tab. */
function unfold(raw: string): string[] {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/** Split "DTSTART;VALUE=DATE" / "20260715" into name (before params) and value. */
function splitLine(line: string): { name: string; value: string } | null {
  const colon = line.indexOf(":");
  if (colon === -1) return null;
  const namePart = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const name = namePart.split(";")[0].toUpperCase();
  return { name, value };
}

/** Normalize an iCal date/datetime value to YYYY-MM-DD. */
function toDate(value: string): string | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export function parseICal(text: string): ParsedEvent[] {
  const lines = unfold(text);
  const events: ParsedEvent[] = [];
  let cur: Partial<ParsedEvent> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (trimmed === "END:VEVENT") {
      if (cur && cur.uid && cur.start && cur.end) {
        events.push({
          uid: cur.uid,
          start: cur.start,
          end: cur.end,
          summary: cur.summary ?? null,
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;

    const parsed = splitLine(line);
    if (!parsed) continue;
    switch (parsed.name) {
      case "UID":
        cur.uid = parsed.value.trim();
        break;
      case "DTSTART":
        cur.start = toDate(parsed.value) ?? undefined;
        break;
      case "DTEND":
        cur.end = toDate(parsed.value) ?? undefined;
        break;
      case "SUMMARY":
        cur.summary = parsed.value.trim();
        break;
    }
  }

  return events;
}

/**
 * Airbnb marks genuine reservations with a "Reserved" summary and blocked/owner
 * dates with "Not available" / "Airbnb (Not available)". Keep only reservations.
 */
export function isReservation(event: ParsedEvent): boolean {
  const s = (event.summary ?? "").toLowerCase();
  if (!s) return true; // no summary → assume it's a booking
  return !s.includes("not available") && !s.includes("blocked") && !s.includes("unavailable");
}
