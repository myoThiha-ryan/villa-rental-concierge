/**
 * Sync a property's iCal calendar locally (no server needed).
 *
 * Usage:  npx tsx scripts/sync-ical.ts "Villa Serena (Demo)"
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createAdminClient } from "../src/lib/supabase/admin";
import { syncPropertyCalendar } from "../src/lib/ical/sync";
import type { Property } from "../src/types/database";

async function main() {
  const name = process.argv[2] ?? "Villa Serena (Demo)";
  const supabase = createAdminClient();

  const { data: property, error } = await supabase
    .from("properties")
    .select("*")
    .eq("name", name)
    .single();
  if (error || !property) {
    console.error(`Property "${name}" not found.`);
    process.exit(1);
  }
  if (!property.ical_url) {
    console.error(`"${name}" has no ical_url set. Set it in Settings or the DB first.`);
    process.exit(1);
  }

  const result = await syncPropertyCalendar(supabase, property as Property);
  console.log(`Synced "${name}":`, result);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
