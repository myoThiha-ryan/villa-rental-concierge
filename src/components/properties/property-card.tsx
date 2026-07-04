import Link from "next/link";
import { MapPin, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Property } from "@/types/database";

export function PropertyCard({ property }: { property: Property }) {
  return (
    <Link href={`/dashboard/properties/${property.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{property.name}</CardTitle>
            <Badge variant={property.active ? "default" : "secondary"}>
              {property.active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {property.city && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>
                {property.city}
                {property.country ? `, ${property.country}` : ""}
              </span>
            </div>
          )}
          {property.max_guests && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Up to {property.max_guests} guests</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
