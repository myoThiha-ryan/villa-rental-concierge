"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DocumentUploader({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("property_id", propertyId);
    formData.append("source_type", "pdf");

    const res = await fetch("/api/knowledge-base/upload", {
      method: "POST",
      body: formData,
    });
    setUploading(false);

    if (!res.ok) {
      const body = await res.json();
      toast.error(body.error ?? "Upload failed");
      return;
    }

    const { data } = await res.json();
    toast.success(`Document processed into ${data.chunkCount} searchable chunks`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload a document</CardTitle>
        <CardDescription>
          Welcome books, house manuals, FAQs. PDF, TXT, or CSV up to 10MB.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
        <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Upload className="h-4 w-4" />
          {uploading ? "Processing..." : "Choose file"}
        </Button>
      </CardContent>
    </Card>
  );
}
