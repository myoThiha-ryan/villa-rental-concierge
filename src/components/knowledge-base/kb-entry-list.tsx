"use client";

import { useRouter } from "next/navigation";
import { FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PropertyKnowledgeBase, UploadedDocument } from "@/types/database";

export function KbEntryList({
  entries,
  documents,
}: {
  entries: PropertyKnowledgeBase[];
  documents: UploadedDocument[];
}) {
  const router = useRouter();

  async function handleDelete(id: string) {
    const res = await fetch(`/api/knowledge-base?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete entry");
      return;
    }
    toast.success("Entry deleted");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uploaded documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{doc.file_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {doc.chunk_count} chunks
                  </span>
                  <Badge
                    variant={
                      doc.processing_status === "completed"
                        ? "default"
                        : doc.processing_status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {doc.processing_status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Knowledge entries ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet.</p>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {entry.title && <span className="text-sm font-medium">{entry.title}</span>}
                    <Badge variant="outline" className="text-xs">
                      {entry.source_type}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {entry.content}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(entry.id)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
