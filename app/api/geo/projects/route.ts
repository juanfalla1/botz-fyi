import { NextResponse } from "next/server";
import { projectSchema } from "@geo/validators/project.schema";
import { getGeoApiClient } from "@/lib/geo/api-auth";
import { createProject, listProjects } from "@/lib/geo/repositories/projects.repo";

function isAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "")
  return message.includes("token") || message.includes("Unauthorized") || message.includes("Missing bearer") || message.includes("Supabase server env")
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object" && "message" in error) return String((error as { message?: unknown }).message)
  return String(error || "Unexpected project error")
}

export async function GET(req: Request) {
  try {
    const { supabase, user } = await getGeoApiClient(req);
    const data = await listProjects(supabase, user.id);
    return NextResponse.json({ data, mode: "live" });
  } catch (error) {
    return NextResponse.json({ data: [], mode: "error", error: errorMessage(error) }, { status: isAuthError(error) ? 401 : 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const { supabase, user } = await getGeoApiClient(req);
    const data = await createProject(supabase, {
      user_id: user.id,
      workspace_id: body.workspace_id ?? null,
      company_name: parsed.data.company_name,
      website_url: parsed.data.website_url,
      country: parsed.data.country,
      language: parsed.data.language,
      industry: parsed.data.industry,
      business_goal: parsed.data.business_goal,
    });
    return NextResponse.json({ data, mode: "live" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: isAuthError(error) ? 401 : 500 });
  }
}
