import { describe, it, expect } from "vitest";
import { computeLifecycleSchedule } from "@/lib/scheduling/lifecycle";

describe("computeLifecycleSchedule", () => {
  const schedule = computeLifecycleSchedule(
    { checkIn: "2026-07-15", checkOut: "2026-07-20" },
    { propertyName: "Villa Serena", checkInTime: "15:00", checkOutTime: "11:00" }
  );

  it("produces the three lifecycle messages", () => {
    expect(schedule.map((s) => s.templateKey)).toEqual([
      "pre_arrival",
      "checkout_reminder",
      "review_request",
    ]);
  });

  it("schedules pre-arrival the day before check-in at 10:00 UTC", () => {
    const pre = schedule.find((s) => s.templateKey === "pre_arrival")!;
    expect(pre.sendAt).toBe("2026-07-14T10:00:00.000Z");
  });

  it("schedules checkout reminder on checkout morning and review the next day", () => {
    expect(schedule.find((s) => s.templateKey === "checkout_reminder")!.sendAt).toBe(
      "2026-07-20T08:00:00.000Z"
    );
    expect(schedule.find((s) => s.templateKey === "review_request")!.sendAt).toBe(
      "2026-07-21T11:00:00.000Z"
    );
  });

  it("personalizes the body with the property name and times", () => {
    const pre = schedule.find((s) => s.templateKey === "pre_arrival")!;
    expect(pre.body).toContain("Villa Serena");
    expect(pre.body).toContain("15:00");
  });
});
