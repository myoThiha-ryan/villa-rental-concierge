import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApiError, handleApiError } from "@/lib/utils/errors";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError(401, "Unauthorized");

    const { data, error } = await supabase
      .from("recommendation_categories")
      .select("*")
      .order("display_order");

    if (error) throw new ApiError(500, error.message);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
