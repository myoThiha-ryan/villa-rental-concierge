import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApiError, handleApiError } from "@/lib/utils/errors";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError(401, "Unauthorized");

    const propertyId = request.nextUrl.searchParams.get("property_id");
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    let eventsQuery = supabase
      .from("analytics_events")
      .select("event_type, event_data, created_at")
      .gte("created_at", since);
    if (propertyId) eventsQuery = eventsQuery.eq("property_id", propertyId);

    const { data: events, error } = await eventsQuery;
    if (error) throw new ApiError(500, error.message);

    return NextResponse.json({ data: summarize(events ?? []) });
  } catch (error) {
    return handleApiError(error);
  }
}

function summarize(events: { event_type: string; event_data: Record<string, unknown>; created_at: string }[]) {
  const byType: Record<string, number> = {};
  const intents: Record<string, number> = {};
  const byDay: Record<string, number> = {};

  for (const e of events) {
    byType[e.event_type] = (byType[e.event_type] ?? 0) + 1;
    if (e.event_type === "message_sent" && typeof e.event_data?.intent === "string") {
      intents[e.event_data.intent] = (intents[e.event_data.intent] ?? 0) + 1;
    }
    if (e.event_type === "message_received") {
      const day = e.created_at.slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;
    }
  }

  return {
    messagesReceived: byType["message_received"] ?? 0,
    messagesSent: byType["message_sent"] ?? 0,
    escalations: byType["escalation"] ?? 0,
    topIntents: Object.entries(intents)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
    messagesByDay: Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0])),
  };
}
