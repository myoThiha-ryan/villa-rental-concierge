import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PropertySelect } from "@/components/properties/property-select";
import { RecommendationCard } from "@/components/recommendations/recommendation-card";
import type { Property, Recommendation, RecommendationCategory } from "@/types/database";

export default async function RecommendationsPage({
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

  let recommendations: (Recommendation & { recommendation_categories: RecommendationCategory | null })[] = [];
  if (activePropertyId) {
    const { data } = await supabase
      .from("recommendations")
      .select("*, recommendation_categories(id, name, icon)")
      .eq("property_id", activePropertyId)
      .order("priority_score", { ascending: false });
    recommendations = data ?? [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Recommendations</h1>
          <p className="text-sm text-muted-foreground">
            Curated local places the AI can recommend to guests.
          </p>
        </div>
        {activePropertyId && (
          <Link href={`/dashboard/recommendations/new?property_id=${activePropertyId}`}>
            <Button>
              <Plus className="h-4 w-4" />
              Add recommendation
            </Button>
          </Link>
        )}
      </div>

      {!properties || properties.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          Add a property first before creating recommendations.
        </div>
      ) : (
        <>
          <PropertySelect properties={properties as Property[]} selectedId={activePropertyId} />

          {recommendations.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
              No recommendations yet for this property.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((rec) => (
                <RecommendationCard key={rec.id} recommendation={rec} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
