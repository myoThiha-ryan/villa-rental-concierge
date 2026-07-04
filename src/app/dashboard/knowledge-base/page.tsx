import { createClient } from "@/lib/supabase/server";
import { PropertySelect } from "@/components/properties/property-select";
import { DocumentUploader } from "@/components/knowledge-base/document-uploader";
import { KbEntryForm } from "@/components/knowledge-base/kb-entry-form";
import { KbEntryList } from "@/components/knowledge-base/kb-entry-list";
import type { Property, PropertyKnowledgeBase, UploadedDocument } from "@/types/database";

export default async function KnowledgeBasePage({
  searchParams,
}: {
  searchParams: Promise<{ property_id?: string }>;
}) {
  const { property_id } = await searchParams;
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });

  const activePropertyId = property_id ?? properties?.[0]?.id;

  let entries: PropertyKnowledgeBase[] = [];
  let documents: UploadedDocument[] = [];
  if (activePropertyId) {
    const [{ data: kb }, { data: docs }] = await Promise.all([
      supabase
        .from("property_knowledge_base")
        .select("id, property_id, source_type, source_document_id, title, content, chunk_index, active, created_at")
        .eq("property_id", activePropertyId)
        .order("created_at", { ascending: false }),
      supabase
        .from("uploaded_documents")
        .select("*")
        .eq("property_id", activePropertyId)
        .order("created_at", { ascending: false }),
    ]);
    entries = (kb ?? []) as PropertyKnowledgeBase[];
    documents = (docs ?? []) as UploadedDocument[];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Knowledge base</h1>
        <p className="text-sm text-muted-foreground">
          The property facts and documents the AI draws from when answering guests.
        </p>
      </div>

      {!properties || properties.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          Add a property first before building its knowledge base.
        </div>
      ) : (
        <>
          <PropertySelect properties={properties as Property[]} selectedId={activePropertyId} />

          {activePropertyId && (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <DocumentUploader propertyId={activePropertyId} />
                <KbEntryForm propertyId={activePropertyId} />
              </div>
              <KbEntryList entries={entries} documents={documents} />
            </>
          )}
        </>
      )}
    </div>
  );
}
