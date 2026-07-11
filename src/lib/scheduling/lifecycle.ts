/**
 * Booking-lifecycle message schedule. Given a booking's check-in/out dates,
 * compute when each automated message should go out and what it says.
 *
 * Times are computed in UTC from the date + a fixed local-ish hour; timezone
 * refinement can come later. Send times in the past are still returned — the
 * runner decides whether to send or skip based on `send_at <= now`.
 */
export type LifecycleTemplateKey = "pre_arrival" | "checkout_reminder" | "review_request";

export interface LifecycleContext {
  propertyName: string;
  checkInTime: string | null; // e.g. "15:00"
  checkOutTime: string | null; // e.g. "11:00"
}

export interface ScheduledItem {
  templateKey: LifecycleTemplateKey;
  sendAt: string; // ISO timestamp
  body: string;
}

/** Build an ISO timestamp for a given YYYY-MM-DD date at a given hour (UTC). */
function at(dateStr: string, hour: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour, 0, 0)).toISOString();
}

/** Shift a YYYY-MM-DD date by whole days. */
function shiftDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function computeLifecycleSchedule(
  booking: { checkIn: string; checkOut: string },
  ctx: LifecycleContext
): ScheduledItem[] {
  const checkInTime = ctx.checkInTime ?? "15:00";
  const checkOutTime = ctx.checkOutTime ?? "11:00";

  return [
    {
      templateKey: "pre_arrival",
      // Day before check-in, 10:00.
      sendAt: at(shiftDays(booking.checkIn, -1), 10),
      body:
        `Hi! We're looking forward to hosting you at ${ctx.propertyName} tomorrow. ` +
        `Check-in is from ${checkInTime}. Reply here anytime for the wifi, directions, ` +
        `parking, or local tips — I'm your 24/7 assistant. 😊`,
    },
    {
      templateKey: "checkout_reminder",
      // Morning of checkout, 08:00.
      sendAt: at(booking.checkOut, 8),
      body:
        `Good morning! Just a reminder that checkout is at ${checkOutTime} today. ` +
        `Thanks so much for staying at ${ctx.propertyName} — safe travels! ` +
        `Let me know if you need anything before you go.`,
    },
    {
      templateKey: "review_request",
      // Day after checkout, 11:00.
      sendAt: at(shiftDays(booking.checkOut, 1), 11),
      body:
        `Hope you had a wonderful stay at ${ctx.propertyName}! If you have a moment, ` +
        `a quick review would mean the world to us. Thank you — you're welcome back anytime. 🙏`,
    },
  ];
}
