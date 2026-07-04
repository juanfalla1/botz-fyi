import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const VIDEO_PATH = "/BOTZ%20Clinic(1).mp4";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email") || null;
  const clinic = url.searchParams.get("clinic") || null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      await supabase.from("botz_video_opens").insert({
        email,
        clinic_name: clinic,
        video: "BOTZ Clinic(1).mp4",
        user_agent: request.headers.get("user-agent"),
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        opened_at: new Date().toISOString(),
      });
    } catch {
      // Never block the video if tracking storage is unavailable.
    }
  }

  return NextResponse.redirect(new URL(VIDEO_PATH, request.url));
}
