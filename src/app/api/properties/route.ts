import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { propertySchema } from "@/lib/utils/validators";
import { ApiError, handleApiError } from "@/lib/utils/errors";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError(401, "Unauthorized");

    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new ApiError(500, error.message);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError(401, "Unauthorized");

    const body = await request.json();
    const parsed = propertySchema.parse(body);

    const { data, error } = await supabase
      .from("properties")
      .insert({ ...parsed, owner_id: user.id })
      .select()
      .single();

    if (error) throw new ApiError(500, error.message);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
