import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runDueScheduledMessages } from "@/lib/scheduling/runner";
import { handleApiError, ApiError } from "@/lib/utils/errors";

/**
 * Cron entry point: deliver all due scheduled messages across properties.
 * Protected by CRON_SECRET (sent as `Authorization: Bearer <secret>`), since it
 * runs cross-property with the service-role client rather than a user session.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) throw new ApiError(401, "Unauthorized");
    }

    const supabase = createAdminClient();
    const result = await runDueScheduledMessages(supabase);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
