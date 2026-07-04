export type Intent =
  | "recommendation"
  | "property_info"
  | "booking_info"
  | "emergency"
  | "complaint"
  | "greeting"
  | "other";

export interface ClassificationResult {
  intent: Intent;
  confidence: number;
  category_hint?: string | null;
  needs_clarification?: string | null;
}

export interface RetrievedRecommendation {
  id: string;
  name: string;
  description: string;
  host_note: string | null;
  category_id: string;
  address: string | null;
  distance_from_property: number | null;
  estimated_travel_time: string | null;
  price_level: number | null;
  opening_hours: string | null;
  booking_required: boolean;
  family_friendly: boolean;
  map_url: string | null;
  website_url: string | null;
  phone_number: string | null;
  tags: string[];
  priority_score: number;
  similarity: number;
  rank_score?: number;
}

export interface RetrievedKnowledge {
  id: string;
  title: string | null;
  content: string;
  source_type: string;
  similarity: number;
}

export interface RetrievalResult {
  recommendations: RetrievedRecommendation[];
  knowledge: RetrievedKnowledge[];
}
