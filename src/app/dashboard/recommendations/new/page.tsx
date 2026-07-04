import { redirect } from "next/navigation";
import { RecommendationForm } from "@/components/recommendations/recommendation-form";

export default async function NewRecommendationPage({
  searchParams,
}: {
  searchParams: Promise<{ property_id?: string }>;
}) {
  const { property_id } = await searchParams;
  if (!property_id) redirect("/dashboard/recommendations");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add recommendation</h1>
        <p className="text-sm text-muted-foreground">
          A new local place the concierge can suggest to guests.
        </p>
      </div>
      <RecommendationForm propertyId={property_id} />
    </div>
  );
}
