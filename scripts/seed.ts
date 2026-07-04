/**
 * Seed a property with sample recommendations + a knowledge base entry so the
 * concierge can be tested end-to-end immediately.
 *
 * Usage:  npx tsx scripts/seed.ts <property_id>
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and
 * OPENAI_API_KEY to be set (loaded from .env.local).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createAdminClient } from "../src/lib/supabase/admin";
import { embedText, recommendationToEmbeddingText } from "../src/lib/openai/embeddings";
import { toVectorLiteral } from "../src/lib/openai/format";

type SeedRec = {
  category: string;
  name: string;
  description: string;
  host_note?: string;
  address?: string;
  distance_from_property?: number;
  estimated_travel_time?: string;
  price_level?: number;
  opening_hours?: string;
  family_friendly?: boolean;
  map_url?: string;
  tags?: string[];
  priority_score?: number;
};

const RECS: SeedRec[] = [
  {
    category: "restaurant",
    name: "Casa del Mar",
    description: "Family-run seafood taverna right on the water. Grilled catch of the day, local wines.",
    host_note: "Our guests' favorite for sunset dinners. Ask for a terrace table.",
    address: "12 Harbour Road",
    distance_from_property: 0.8,
    estimated_travel_time: "10 min walk",
    price_level: 2,
    opening_hours: "Daily 18:00–23:00",
    family_friendly: true,
    map_url: "https://maps.google.com/?q=Casa+del+Mar",
    tags: ["seafood", "sunset", "romantic"],
    priority_score: 9,
  },
  {
    category: "cafe",
    name: "Bean & Olive",
    description: "Specialty coffee, fresh pastries, and great breakfasts. Strong wifi.",
    host_note: "Best espresso in the village and a quiet spot to work.",
    address: "3 Old Town Square",
    distance_from_property: 0.4,
    estimated_travel_time: "5 min walk",
    price_level: 1,
    opening_hours: "Daily 07:30–15:00",
    family_friendly: true,
    tags: ["coffee", "breakfast", "wifi"],
    priority_score: 7,
  },
  {
    category: "beach",
    name: "Cala Blanca",
    description: "Sheltered white-sand cove with calm, shallow water and sun-bed rentals.",
    host_note: "Calmest water nearby — ideal for kids. Go early on weekends.",
    distance_from_property: 1.5,
    estimated_travel_time: "6 min drive",
    family_friendly: true,
    map_url: "https://maps.google.com/?q=Cala+Blanca",
    tags: ["beach", "family", "swimming"],
    priority_score: 8,
  },
  {
    category: "shopping",
    name: "Mercat Central",
    description: "Covered market with fresh produce, cheese, bread, and a small supermarket.",
    host_note: "Best place to stock the villa kitchen. Cash is handy for stalls.",
    address: "1 Plaça del Mercat",
    distance_from_property: 0.6,
    estimated_travel_time: "8 min walk",
    opening_hours: "Mon–Sat 08:00–14:00",
    family_friendly: true,
    tags: ["supermarket", "groceries", "market"],
    priority_score: 6,
  },
  {
    category: "activity",
    name: "Coastal Kayak Tours",
    description: "Guided 2-hour sea-kayak tours along the cliffs to hidden caves.",
    host_note: "Book a day ahead in summer. They provide all gear.",
    distance_from_property: 1.2,
    estimated_travel_time: "5 min drive",
    price_level: 3,
    family_friendly: true,
    tags: ["kayak", "adventure", "outdoors"],
    priority_score: 7,
  },
];

const KB = {
  source_type: "faq" as const,
  title: "House essentials",
  content: [
    "Wifi network: VillaGuest. Password is on the welcome card by the router.",
    "Check-out is 11:00. Please leave keys in the lockbox.",
    "Air conditioning remotes are in the living room drawer.",
    "Nearest pharmacy is on Old Town Square, open Mon–Sat 09:00–20:00.",
    "Rubbish and recycling bins are collected on Tuesday and Friday mornings.",
  ].join("\n"),
};

async function main() {
  const propertyId = process.argv[2];
  if (!propertyId) {
    console.error("Usage: npx tsx scripts/seed.ts <property_id>");
    process.exit(1);
  }

  const supabase = createAdminClient();

  const { data: property, error: propErr } = await supabase
    .from("properties")
    .select("id, name")
    .eq("id", propertyId)
    .single();
  if (propErr || !property) {
    console.error(`Property ${propertyId} not found:`, propErr?.message);
    process.exit(1);
  }
  console.log(`Seeding "${property.name}" (${property.id})`);

  const { data: categories, error: catErr } = await supabase
    .from("recommendation_categories")
    .select("id, name");
  if (catErr || !categories) {
    console.error("Could not load categories:", catErr?.message);
    process.exit(1);
  }
  const catId = new Map(categories.map((c) => [c.name, c.id]));

  for (const rec of RECS) {
    const category_id = catId.get(rec.category);
    if (!category_id) {
      console.warn(`  skip "${rec.name}" — unknown category ${rec.category}`);
      continue;
    }
    const embedding = await embedText(recommendationToEmbeddingText(rec));
    const { error } = await supabase.from("recommendations").insert({
      property_id: propertyId,
      category_id,
      name: rec.name,
      description: rec.description,
      host_note: rec.host_note ?? null,
      address: rec.address ?? null,
      distance_from_property: rec.distance_from_property ?? null,
      estimated_travel_time: rec.estimated_travel_time ?? null,
      price_level: rec.price_level ?? null,
      opening_hours: rec.opening_hours ?? null,
      booking_required: false,
      family_friendly: rec.family_friendly ?? true,
      map_url: rec.map_url ?? null,
      tags: rec.tags ?? [],
      priority_score: rec.priority_score ?? 5,
      active: true,
      embedding: toVectorLiteral(embedding),
    });
    if (error) console.error(`  ✗ ${rec.name}: ${error.message}`);
    else console.log(`  ✓ ${rec.name}`);
  }

  const kbEmbedding = await embedText(KB.content);
  const { error: kbErr } = await supabase.from("property_knowledge_base").insert({
    property_id: propertyId,
    source_type: KB.source_type,
    title: KB.title,
    content: KB.content,
    chunk_index: 0,
    active: true,
    embedding: toVectorLiteral(kbEmbedding),
  });
  if (kbErr) console.error(`  ✗ KB entry: ${kbErr.message}`);
  else console.log(`  ✓ KB entry "${KB.title}"`);

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
