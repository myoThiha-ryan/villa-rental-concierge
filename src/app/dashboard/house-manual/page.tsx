import { createClient } from "@/lib/supabase/server";
import { PropertySelect } from "@/components/properties/property-select";
import { HouseManualForm } from "@/components/knowledge-base/house-manual-form";
import type { Property } from "@/types/database";

interface ManualRow {
  content: string;
  metadata: { manual_section?: string } | null;
}

export default async function HouseManualPage({
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

  const initialSections: Record<string, string> = {};
  if (activePropertyId) {
    const { data: rows } = await supabase
      .from("property_knowledge_base")
      .select("content, metadata")
      .eq("property_id", activePropertyId)
      .contains("metadata", { source: "house_manual" });
    for (const row of (rows ?? []) as ManualRow[]) {
      const key = row.metadata?.manual_section;
      if (key) initialSections[key] = row.content;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">House manual</h1>
        <p className="text-sm text-muted-foreground">
          Answer the repetitive guest questions once. Your assistant handles them 24/7.
        </p>
      </div>

      {!properties || properties.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          Add a property first to set up its house manual.
        </div>
      ) : (
        <>
          <PropertySelect properties={properties as Property[]} selectedId={activePropertyId} />
          {activePropertyId && (
            <HouseManualForm
              key={activePropertyId}
              propertyId={activePropertyId}
              initialSections={initialSections}
            />
          )}
        </>
      )}
    </div>
  );
}
