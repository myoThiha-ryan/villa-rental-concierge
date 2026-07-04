import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatsCards } from "@/components/analytics/stats-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function DashboardOverviewPage() {
  const supabase = await createClient();

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: propertyCount }, { data: events }, { count: openEscalations }] =
    await Promise.all([
      supabase.from("properties").select("*", { count: "exact", head: true }),
      supabase
        .from("analytics_events")
        .select("event_type, event_data")
        .gte("created_at", since),
      supabase
        .from("escalation_tickets")
        .select("*", { count: "exact", head: true })
        .eq("status", "open"),
    ]);

  const evts = events ?? [];
  const messagesReceived = evts.filter((e) => e.event_type === "message_received").length;
  const messagesSent = evts.filter((e) => e.event_type === "message_sent").length;
  const escalations = evts.filter((e) => e.event_type === "escalation").length;

  const intentCounts: Record<string, number> = {};
  for (const e of evts) {
    if (e.event_type === "message_sent" && typeof e.event_data?.intent === "string") {
      intentCounts[e.event_data.intent] = (intentCounts[e.event_data.intent] ?? 0) + 1;
    }
  }
  const topIntents = Object.entries(intentCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-sm text-muted-foreground">Your concierge at a glance (last 30 days).</p>
        </div>
        {(propertyCount ?? 0) === 0 && (
          <Link href="/dashboard/properties/new">
            <Button>Add your first property</Button>
          </Link>
        )}
      </div>

      <StatsCards
        properties={propertyCount ?? 0}
        messagesReceived={messagesReceived}
        messagesSent={messagesSent}
        escalations={escalations}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top guest intents</CardTitle>
          </CardHeader>
          <CardContent>
            {topIntents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <div className="space-y-2">
                {topIntents.map(([intent, count]) => (
                  <div key={intent} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{intent.replace("_", " ")}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Needs attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span>Open escalations</span>
              <Link href="/dashboard/escalations">
                <Badge variant={(openEscalations ?? 0) > 0 ? "destructive" : "secondary"}>
                  {openEscalations ?? 0}
                </Badge>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
