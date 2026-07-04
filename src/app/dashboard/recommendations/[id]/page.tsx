import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RecommendationForm } from "@/components/recommendations/recommendation-form";
import { DeleteRecommendationButton } from "@/components/recommendations/delete-recommendation-button";
import type { Recommendation } from "@/types/database";

export default async function EditRecommendationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: recommendation } = await supabase
    .from("recommendations")
    .select("*")
    .eq("id", id)
    .single();

  if (!recommendation) notFound();
  const rec = recommendation as Recommendation;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{rec.name}</h1>
          <p className="text-sm text-muted-foreground">Edit recommendation</p>
        </div>
        <DeleteRecommendationButton id={rec.id} propertyId={rec.property_id} />
      </div>
      <RecommendationForm propertyId={rec.property_id} recommendation={rec} />
    </div>
  );
}
