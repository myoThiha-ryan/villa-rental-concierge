import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/database";

export function MessageThread({ messages }: { messages: Message[] }) {
  return (
    <div className="space-y-4">
      {messages.map((m) => {
        const isGuest = m.role === "guest";
        const isDraft = m.status === "draft";
        const isDiscarded = m.status === "discarded";
        return (
          <div
            key={m.id}
            className={cn("flex flex-col gap-1", isGuest ? "items-start" : "items-end")}
          >
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                isDiscarded && "opacity-50 line-through",
                isDraft
                  ? "border border-dashed border-primary/50 bg-primary/5 text-foreground"
                  : isGuest
                    ? "bg-muted text-foreground"
                    : m.role === "host"
                      ? "bg-amber-100 text-amber-950"
                      : "bg-primary text-primary-foreground"
              )}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
            <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
              <span>{m.role}</span>
              {isDraft && <Badge variant="secondary" className="text-[10px]">draft · awaiting approval</Badge>}
              {isDiscarded && <Badge variant="outline" className="text-[10px]">discarded</Badge>}
              {m.intent && <Badge variant="outline" className="text-[10px]">{m.intent}</Badge>}
              {m.confidence != null && <span>conf {m.confidence.toFixed(2)}</span>}
              <span>{new Date(m.created_at).toLocaleTimeString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
