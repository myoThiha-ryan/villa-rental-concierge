import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApiError, handleApiError } from "@/lib/utils/errors";
import { syncPropertyCalendar } from "@/lib/ical/sync";
import type { Property } from "@/types/database";

// POST /api/properties/[id]/sync-ical — pull the iCal feed, upsert bookings,
// and (re)generate lifecycle scheduled messages.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError(401, "Unauthorized");

    const { data: property, error } = await supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !property) throw new ApiError(404, "Property not found");
    if (!property.ical_url) throw new ApiError(400, "Add an iCal URL for this property first");

    const result = await syncPropertyCalendar(supabase, property as Property);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
