/**
 * Deliver due scheduled messages locally (simulates the cron runner).
 *
 * Usage:  npx tsx scripts/run-scheduled.ts
 *         npx tsx scripts/run-scheduled.ts 2026-07-21T12:00:00Z   # override "now"
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createAdminClient } from "../src/lib/supabase/admin";
import { runDueScheduledMessages } from "../src/lib/scheduling/runner";

async function main() {
  const nowArg = process.argv[2];
  const now = nowArg ? new Date(nowArg) : new Date();
  const supabase = createAdminClient();
  const result = await runDueScheduledMessages(supabase, now);
  console.log(`Ran scheduled messages as of ${now.toISOString()}:`, result);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
