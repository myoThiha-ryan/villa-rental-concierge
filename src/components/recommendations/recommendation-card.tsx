import Link from "next/link";
import { MapPin, Clock, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Recommendation, RecommendationCategory } from "@/types/database";

type RecWithCategory = Recommendation & {
  recommendation_categories?: RecommendationCategory | null;
};

export function RecommendationCard({ recommendation }: { recommendation: RecWithCategory }) {
  const category = recommendation.recommendation_categories;

  return (
    <Link href={`/dashboard/recommendations/${recommendation.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{recommendation.name}</CardTitle>
            <div className="flex shrink-0 gap-1">
              {!recommendation.active && <Badge variant="secondary">Inactive</Badge>}
              {category && (
                <Badge variant="outline">
                  {category.icon} {category.name}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p className="line-clamp-2">{recommendation.description}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {recommendation.estimated_travel_time && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {recommendation.estimated_travel_time}
              </span>
            )}
            {recommendation.distance_from_property != null && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {recommendation.distance_from_property} km
              </span>
            )}
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5" />
              Priority {recommendation.priority_score}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
