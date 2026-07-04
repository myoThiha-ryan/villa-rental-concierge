import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApiError, handleApiError } from "@/lib/utils/errors";
import { extractPdfText } from "@/lib/documents/pdf-parser";
import { ingestText } from "@/lib/documents/ingestion";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["application/pdf", "text/plain", "text/csv"];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError(401, "Unauthorized");

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const propertyId = formData.get("property_id") as string | null;
    const sourceType = (formData.get("source_type") as string | null) ?? "pdf";

    if (!file) throw new ApiError(400, "No file provided");
    if (!propertyId) throw new ApiError(400, "Missing property_id");
    if (file.size > MAX_FILE_SIZE) throw new ApiError(400, "File exceeds 10MB limit");
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new ApiError(400, "Only PDF, TXT, and CSV files are supported");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${propertyId}/${Date.now()}_${safeName}`;

    // Store the original file in Supabase Storage (bucket: documents).
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });
    if (uploadError) throw new ApiError(500, `Storage upload failed: ${uploadError.message}`);

    // Create the document record.
    const { data: doc, error: docError } = await supabase
      .from("uploaded_documents")
      .insert({
        property_id: propertyId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        processing_status: "processing",
        uploaded_by: user.id,
      })
      .select()
      .single();
    if (docError) throw new ApiError(500, docError.message);

    // Extract text and ingest into the knowledge base.
    try {
      const text =
        file.type === "application/pdf"
          ? await extractPdfText(buffer)
          : buffer.toString("utf-8");

      const chunkCount = await ingestText({
        supabase,
        propertyId,
        text,
        sourceType: sourceType as "pdf" | "welcome_book" | "house_rules" | "faq",
        sourceDocumentId: doc.id,
        title: file.name,
      });

      await supabase
        .from("uploaded_documents")
        .update({ processing_status: "completed", chunk_count: chunkCount })
        .eq("id", doc.id);

      return NextResponse.json({ data: { document: doc, chunkCount } }, { status: 201 });
    } catch (processError) {
      await supabase
        .from("uploaded_documents")
        .update({
          processing_status: "failed",
          error_message: processError instanceof Error ? processError.message : "Unknown error",
        })
        .eq("id", doc.id);
      throw new ApiError(500, "Failed to process document");
    }
  } catch (error) {
    return handleApiError(error);
  }
}
