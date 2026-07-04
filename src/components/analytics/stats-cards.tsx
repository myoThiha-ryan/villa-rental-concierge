import { MessageSquare, Send, AlertTriangle, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardsProps {
  properties: number;
  messagesReceived: number;
  messagesSent: number;
  escalations: number;
}

export function StatsCards({ properties, messagesReceived, messagesSent, escalations }: StatsCardsProps) {
  const stats = [
    { label: "Properties", value: properties, icon: Building2 },
    { label: "Messages received (30d)", value: messagesReceived, icon: MessageSquare },
    { label: "Replies sent (30d)", value: messagesSent, icon: Send },
    { label: "Escalations (30d)", value: escalations, icon: AlertTriangle },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            <s.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
