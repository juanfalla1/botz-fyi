import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";
import OpenAI from "openai";

const NOTETAKER_AUTOMATION_WEBHOOK_URL =
  "https://n8nio-n8n-latest.onrender.com/webhook/botz/notetaker-events";

const NOTETAKER_AUTOMATION_SECRET = process.env.NOTETAKER_AUTOMATION_SECRET || "";

type NotetakerState = {
  agent_id: string;
  profile_id: string;
  prompt: string;
  calendars: any[];
  folders: any[];
  meetings: any[];
};

function isMissingTableError(err: any) {
  const msg = String(err?.message || "").toLowerCase();
  const code = String(err?.code || "").toLowerCase();
  return (
    code === "pgrst205" ||
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("notetaker_profiles") ||
    msg.includes("notetaker_calendars") ||
    msg.includes("notetaker_folders") ||
    msg.includes("notetaker_meetings")
  );
}

function toLegacyState(agent: any): NotetakerState {
  const cfg = agent?.configuration || {};
  const ui = cfg?.notetaker_ui || {};
  return {
    agent_id: String(agent?.id || ""),
    profile_id: `legacy-${String(agent?.id || "")}`,
    prompt: String(ui?.prompt || ""),
    calendars: Array.isArray(ui?.calendars) ? ui.calendars : [],
    folders: Array.isArray(ui?.folders) ? ui.folders : [],
    meetings: Array.isArray(ui?.meetings) ? ui.meetings : [],
  };
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

async function notifyNotetakerAutomation(event: {
  action: "interaction_created" | "interaction_analyzed" | "pipeline_saved";
  tenantId: string;
  userId: string;
  profileId: string;
  meeting: any;
  salesPrompt?: string;
}) {
  if (!NOTETAKER_AUTOMATION_WEBHOOK_URL) return;

  try {
    console.info("[notetaker->n8n] sending", {
      action: event.action,
      tenantId: event.tenantId,
      hasSecret: Boolean(NOTETAKER_AUTOMATION_SECRET),
      url: NOTETAKER_AUTOMATION_WEBHOOK_URL,
    });

    const payload = {
      source: "botz_notetaker",
      timestamp: new Date().toISOString(),
      action: event.action,
      tenant_id: event.tenantId,
      user_id: event.userId,
      profile_id: event.profileId,
      meeting: event.meeting || null,
      sales_prompt: event.salesPrompt || "",
    };

    const headers: Record<string, string> = { "Content-Type": "application/json", "X-Botz-Source": "notetaker" };
    if (NOTETAKER_AUTOMATION_SECRET) headers["X-Botz-Secret"] = NOTETAKER_AUTOMATION_SECRET;

    const res = await fetch(NOTETAKER_AUTOMATION_WEBHOOK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn("[notetaker->n8n] webhook error", { status: res.status, detail: detail.slice(0, 300) });
    }
  } catch (e: any) {
    console.warn("[notetaker->n8n] webhook exception", e?.message || e);
  }
}

async function resolveTenantId(supabase: any, userId: string): Promise<string> {
  const byAuth = await supabase
    .from("team_members")
    .select("tenant_id")
    .eq("auth_user_id", userId)
    .eq("activo", true)
    .maybeSingle();
  if (byAuth?.data?.tenant_id) return String(byAuth.data.tenant_id);

  try {
    const byUser = await supabase
      .from("team_members")
      .select("tenant_id")
      .eq("user_id", userId)
      .eq("activo", true)
      .maybeSingle();
    if (byUser?.data?.tenant_id) return String(byUser.data.tenant_id);
  } catch {
    // compat
  }

  const bySub = await supabase
    .from("subscriptions")
    .select("tenant_id")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .maybeSingle();
  if (bySub?.data?.tenant_id) return String(bySub.data.tenant_id);

  return SYSTEM_TENANT_ID;
}

async function analyzeInteraction(prompt: string, title: string, host: string, meetingUrl: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return {
      summary: `Interaccion registrada: ${title || "Conversacion"}.`,
      intent: "consulta_general",
      priority: "media",
      next_action: "Realizar seguimiento en menos de 24 horas",
      suggested_status: "CONTACTADO",
      score: 62,
    };
  }

  const openai = new OpenAI({ apiKey: key });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 180,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Eres un copiloto comercial IA. Devuelve JSON con llaves exactas: summary, intent, priority, next_action, suggested_status, score. suggested_status debe ser uno de: NUEVO, CONTACTADO, INTERESADO, CONVERTIDO, PERDIDO. priority: baja|media|alta. score: 0-100.",
      },
      {
        role: "user",
        content: `Framework comercial:\n${prompt || "sin framework"}\n\nInteraccion:\n- titulo: ${title || "sin titulo"}\n- host: ${host || "sin host"}\n- url: ${meetingUrl || "sin url"}`,
      },
    ],
  });
  const raw = String(completion.choices[0]?.message?.content || "{}");
  const parsed = JSON.parse(raw);
  return {
    summary: String(parsed.summary || "Interaccion analizada por Copiloto IA."),
    intent: String(parsed.intent || "consulta_general"),
    priority: String(parsed.priority || "media"),
    next_action: String(parsed.next_action || "Realizar seguimiento"),
    suggested_status: String(parsed.suggested_status || "CONTACTADO").toUpperCase(),
    score: Math.max(0, Math.min(100, Number(parsed.score || 60))),
  };
}

async function ensureAgent(supabase: any, userId: string) {
  let agent: any = null;
  const { data: existingAgents, error: listErr } = await supabase
    .from("ai_agents")
    .select("id,name,configuration")
    .eq("tenant_id", SYSTEM_TENANT_ID)
    .eq("created_by", userId)
    .eq("type", "voice")
    .order("created_at", { ascending: false });

  if (listErr) throw new Error(listErr.message);

  agent = (existingAgents || []).find((a: any) => {
    const cfg = a?.configuration || {};
    return cfg?.agent_kind === "notetaker" || cfg?.kind === "notetaker";
  });

  if (!agent) {
    const { data: created, error: createErr } = await supabase
      .from("ai_agents")
      .insert({
        tenant_id: SYSTEM_TENANT_ID,
        created_by: userId,
        name: "Notetaker",
        type: "voice",
        description: "Notetaker de reuniones Botz",
        status: "draft",
        configuration: {
          agent_kind: "notetaker",
        },
      })
      .select("id,name,configuration")
      .single();

    if (createErr) throw new Error(createErr.message);
    agent = created;
  }

  return { agent };
}

async function ensureProfile(supabase: any, userId: string) {
  const { agent } = await ensureAgent(supabase, userId);

  let profile: any = null;
  const { data: existingProfile, error: profileErr } = await supabase
    .from("notetaker_profiles")
    .select("id,agent_id,sales_prompt")
    .eq("agent_id", agent.id)
    .maybeSingle();

  if (profileErr) throw new Error(profileErr.message);
  profile = existingProfile;

  if (!profile) {
    const { data: createdProfile, error: createProfileErr } = await supabase
      .from("notetaker_profiles")
      .insert({
        agent_id: agent.id,
        tenant_id: SYSTEM_TENANT_ID,
        created_by: userId,
        sales_prompt: "",
      })
      .select("id,agent_id,sales_prompt")
      .single();

    if (createProfileErr) throw new Error(createProfileErr.message);
    profile = createdProfile;
  }

  return { agent, profile };
}

async function hasNotetakerTables(supabase: any) {
  const { error } = await supabase.from("notetaker_profiles").select("id").limit(1);
  if (!error) return true;
  if (isMissingTableError(error)) return false;
  throw new Error(error.message);
}

async function fetchState(supabase: any, userId: string): Promise<NotetakerState> {
  const { agent, profile } = await ensureProfile(supabase, userId);

  const [{ data: calendars, error: calErr }, { data: folders, error: folErr }, { data: meetings, error: meetErr }] = await Promise.all([
    supabase
      .from("notetaker_calendars")
      .select("id,calendar_id,calendar_name,calendar_email,status,provider,created_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("notetaker_folders")
      .select("id,name,color,description,icon,is_favorite,notes,created_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("notetaker_meetings")
      .select("id,title,meeting_url,host,starts_at,duration_minutes,participants_count,status,source,folder_id,metadata,created_at")
      .eq("profile_id", profile.id)
      .order("starts_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);

  if (calErr) throw new Error(calErr.message);
  if (folErr) throw new Error(folErr.message);
  if (meetErr) throw new Error(meetErr.message);

  return {
    agent_id: agent.id,
    profile_id: profile.id,
    prompt: String(profile.sales_prompt || ""),
    calendars: calendars || [],
    folders: folders || [],
    meetings: meetings || [],
  };
}

async function listGoogleCalendars(accessToken: string, fallbackEmail: string) {
  try {
    const calRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=50", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!calRes.ok) {
      return [{ id: "primary", name: "Google Calendar", email: fallbackEmail || null }];
    }
    const calJson: any = await calRes.json();
    const items: any[] = Array.isArray(calJson?.items) ? calJson.items : [];
    const mapped = items
      .map((it) => ({
        id: String(it?.id || "").trim(),
        name: String(it?.summary || it?.id || "Google Calendar"),
        email: String(it?.id || "").includes("@") ? String(it?.id || "") : (fallbackEmail || null),
      }))
      .filter((it) => it.id);
    return mapped.length ? mapped : [{ id: "primary", name: "Google Calendar", email: fallbackEmail || null }];
  } catch {
    return [{ id: "primary", name: "Google Calendar", email: fallbackEmail || null }];
  }
}

function isNoiseCalendarId(value: string) {
  return /holiday@group\.v\.calendar\.google\.com/i.test(String(value || ""));
}

function isNoiseGoogleEvent(event: any, calendarId: string) {
  if (isNoiseCalendarId(calendarId)) return true;
  const organizerEmail = String(event?.organizer?.email || "");
  const creatorEmail = String(event?.creator?.email || "");
  if (isNoiseCalendarId(organizerEmail) || isNoiseCalendarId(creatorEmail)) return true;
  return false;
}

async function refreshGoogleAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret || !refreshToken) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });
  if (!res.ok) return null;
  const json: any = await res.json().catch(() => null);
  if (!json?.access_token) return null;
  return {
    access_token: String(json.access_token),
    expires_in: Number(json.expires_in || 3600),
  };
}

async function ensureGoogleAccessToken(supabase: any, integ: any): Promise<string | null> {
  const credentials = integ?.credentials || {};
  const currentToken = String(credentials?.access_token || "").trim();
  const refreshToken = String(credentials?.refresh_token || "").trim();
  const expiresAtRaw = String(credentials?.expires_at || "").trim();

  const nowMs = Date.now();
  const expiresAtMs = expiresAtRaw ? new Date(expiresAtRaw).getTime() : 0;
  const stillValid = currentToken && (!expiresAtMs || expiresAtMs > nowMs + 60_000);
  if (stillValid) return currentToken;

  if (!refreshToken) return currentToken || null;
  const refreshed = await refreshGoogleAccessToken(refreshToken);
  if (!refreshed?.access_token) return currentToken || null;

  const nextCredentials = {
    ...credentials,
    access_token: refreshed.access_token,
    expires_in: refreshed.expires_in,
    expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
  };

  await supabase
    .from("integrations")
    .update({ credentials: nextCredentials, status: "connected", updated_at: new Date().toISOString(), last_activity: new Date().toISOString() })
    .eq("id", integ.id)
    .eq("provider", "google")
    .eq("channel_type", "gmail");

  return refreshed.access_token;
}

async function syncGoogleCalendarsAndEvents(supabase: any, userId: string, profileId: string) {
  const report: {
    integrations: number;
    calendars: number;
    eventsFetched: number;
    eventsInserted: number;
    errors: string[];
  } = { integrations: 0, calendars: 0, eventsFetched: 0, eventsInserted: 0, errors: [] };

  const { data: integrations, error: intErr } = await supabase
    .from("integrations")
    .select("id,email_address,credentials,status,channel_type,provider")
    .eq("user_id", userId)
    .eq("channel_type", "gmail")
    .eq("provider", "google")
    .eq("status", "connected");

  if (intErr) throw new Error(intErr.message);

  for (const integ of integrations || []) {
    report.integrations += 1;
    const email = String(integ?.email_address || integ?.credentials?.emailAddress || integ?.credentials?.email || "").trim();
    if (!email) continue;

    const accessToken = await ensureGoogleAccessToken(supabase, integ);
    if (!accessToken) continue;

    try {
      const calendars = (await listGoogleCalendars(accessToken, email)).filter((cal) => !isNoiseCalendarId(cal.id));
      report.calendars += calendars.length;

      for (const cal of calendars) {
        await supabase
          .from("notetaker_calendars")
          .upsert(
            {
              profile_id: profileId,
              tenant_id: SYSTEM_TENANT_ID,
              created_by: userId,
              provider: "google",
              integration_id: integ.id,
              calendar_id: cal.id,
              calendar_name: cal.name,
              calendar_email: cal.email,
              status: "connected",
            },
            { onConflict: "profile_id,calendar_id" }
          );
      }

      const now = new Date();
      const min = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const max = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      for (const cal of calendars) {
        const calendarId = encodeURIComponent(cal.id);
        const eventsUrl = new URL(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`);
        eventsUrl.searchParams.set("singleEvents", "true");
        eventsUrl.searchParams.set("orderBy", "startTime");
        eventsUrl.searchParams.set("timeMin", min.toISOString());
        eventsUrl.searchParams.set("timeMax", max.toISOString());
        eventsUrl.searchParams.set("maxResults", "25");

        const evRes = await fetch(eventsUrl.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!evRes.ok) {
          const detail = (await evRes.text().catch(() => "")).slice(0, 300);
          report.errors.push(`events:${cal.id}:${evRes.status}:${detail}`);
          continue;
        }

        const evJson: any = await evRes.json();
        const items: any[] = Array.isArray(evJson?.items) ? evJson.items : [];
        report.eventsFetched += items.length;
        if (items.length === 0) continue;

        const extIds = items.map((it) => `${cal.id}:${String(it?.id || "")}`).filter((v) => v && !v.endsWith(":"));
        const { data: existing, error: existingErr } = await supabase
          .from("notetaker_meetings")
          .select("external_id")
          .eq("profile_id", profileId)
          .eq("source", "google_calendar")
          .in("external_id", extIds);

        if (existingErr) continue;
        const existingSet = new Set((existing || []).map((x: any) => String(x.external_id || "")));

        const toInsert: any[] = [];
        for (const it of items) {
          const rawEventId = String(it?.id || "").trim();
          if (!rawEventId) continue;
          if (isNoiseGoogleEvent(it, cal.id)) continue;
          const extId = `${cal.id}:${rawEventId}`;
          if (existingSet.has(extId)) continue;

          const startsAt = it?.start?.dateTime || it?.start?.date || null;
          const endsAt = it?.end?.dateTime || it?.end?.date || null;
          const duration = startsAt && endsAt
            ? Math.max(0, Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000))
            : 0;

          const meetingUrl =
            it?.hangoutLink ||
            (Array.isArray(it?.conferenceData?.entryPoints) ? (it.conferenceData.entryPoints[0]?.uri || "") : "") ||
            "";

          toInsert.push({
            profile_id: profileId,
            tenant_id: SYSTEM_TENANT_ID,
            created_by: userId,
            source: "google_calendar",
            external_id: extId,
            title: String(it?.summary || "Reunión"),
            meeting_url: String(meetingUrl),
            host: String(cal.email || email),
            starts_at: startsAt,
            duration_minutes: duration,
            participants_count: Array.isArray(it?.attendees) ? it.attendees.length : 0,
            status: "scheduled",
            metadata: {
              organizer: it?.organizer || null,
              calendar_id: cal.id,
              calendar_name: cal.name,
            },
          });
        }

        if (toInsert.length) {
          await supabase.from("notetaker_meetings").insert(toInsert);
          report.eventsInserted += toInsert.length;
        }
      }
    } catch (e: any) {
      report.errors.push(`integration:${String(e?.message || e)}`);
    }
  }

  return report;
}

async function fetchGoogleSnapshot(supabase: any, userId: string) {
  const calendars: any[] = [];
  const meetings: any[] = [];
  const report: {
    integrations: number;
    calendars: number;
    eventsFetched: number;
    errors: string[];
  } = { integrations: 0, calendars: 0, eventsFetched: 0, errors: [] };

  const { data: integrations, error: intErr } = await supabase
    .from("integrations")
    .select("id,email_address,credentials,status,channel_type,provider")
    .eq("user_id", userId)
    .eq("channel_type", "gmail")
    .eq("provider", "google")
    .eq("status", "connected");

  if (intErr) throw new Error(intErr.message);

  for (const integ of integrations || []) {
    report.integrations += 1;
    const email = String(integ?.email_address || integ?.credentials?.emailAddress || integ?.credentials?.email || "").trim();
    if (!email) continue;

    const accessToken = await ensureGoogleAccessToken(supabase, integ);
    if (!accessToken) continue;

    try {
      const gCals = (await listGoogleCalendars(accessToken, email)).filter((cal) => !isNoiseCalendarId(cal.id));
      report.calendars += gCals.length;
      for (const cal of gCals) {
        calendars.push({
          id: `legacy-cal-${cal.id}`,
          calendar_id: cal.id,
          calendar_name: cal.name,
          calendar_email: cal.email,
          status: "connected",
          provider: "google",
        });
      }

      const now = new Date();
      const min = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const max = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      for (const cal of gCals) {
        const calendarId = encodeURIComponent(cal.id);
        const eventsUrl = new URL(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`);
        eventsUrl.searchParams.set("singleEvents", "true");
        eventsUrl.searchParams.set("orderBy", "startTime");
        eventsUrl.searchParams.set("timeMin", min.toISOString());
        eventsUrl.searchParams.set("timeMax", max.toISOString());
        eventsUrl.searchParams.set("maxResults", "25");

        const evRes = await fetch(eventsUrl.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!evRes.ok) {
          const detail = (await evRes.text().catch(() => "")).slice(0, 300);
          report.errors.push(`events:${cal.id}:${evRes.status}:${detail}`);
          continue;
        }

        const evJson: any = await evRes.json();
        const items: any[] = Array.isArray(evJson?.items) ? evJson.items : [];
        report.eventsFetched += items.length;

        for (const it of items) {
          const rawEventId = String(it?.id || "").trim();
          if (!rawEventId) continue;
          if (isNoiseGoogleEvent(it, cal.id)) continue;
          const startsAt = it?.start?.dateTime || it?.start?.date || null;
          const endsAt = it?.end?.dateTime || it?.end?.date || null;
          const duration = startsAt && endsAt
            ? Math.max(0, Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000))
            : 0;

          const meetingUrl =
            it?.hangoutLink ||
            (Array.isArray(it?.conferenceData?.entryPoints) ? (it.conferenceData.entryPoints[0]?.uri || "") : "") ||
            "";

          meetings.push({
            id: `legacy-gcal-${cal.id}-${rawEventId}`,
            title: String(it?.summary || "Reunión"),
            meeting_url: String(meetingUrl),
            host: String(cal.email || email),
            starts_at: startsAt,
            duration_minutes: duration,
            participants_count: Array.isArray(it?.attendees) ? it.attendees.length : 0,
            status: "scheduled",
            source: "google_calendar",
            external_id: `${cal.id}:${rawEventId}`,
          });
        }
      }
    } catch (e: any) {
      report.errors.push(`integration:${String(e?.message || e)}`);
    }
  }

  return { calendars, meetings, report };
}

async function saveLegacyState(supabase: any, userId: string, nextState: NotetakerState) {
  const { agent } = await ensureAgent(supabase, userId);
  const cfg = agent?.configuration || {};
  const nextCfg = {
    ...cfg,
    agent_kind: "notetaker",
    notetaker_ui: {
      prompt: String(nextState.prompt || ""),
      calendars: Array.isArray(nextState.calendars) ? nextState.calendars : [],
      folders: Array.isArray(nextState.folders) ? nextState.folders : [],
      meetings: Array.isArray(nextState.meetings) ? nextState.meetings : [],
    },
  };

  const { error } = await supabase
    .from("ai_agents")
    .update({ configuration: nextCfg })
    .eq("id", agent.id)
    .eq("tenant_id", SYSTEM_TENANT_ID)
    .eq("created_by", userId);

  if (error) throw new Error(error.message);

  return {
    ...nextState,
    agent_id: String(agent.id),
    profile_id: `legacy-${String(agent.id)}`,
  };
}

export async function GET(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing SUPABASE env (URL or SERVICE_ROLE)" }, { status: 500 });
  }

  try {
    const tablesReady = await hasNotetakerTables(supabase);
    if (tablesReady) {
      const state = await fetchState(supabase, guard.user.id);
      return NextResponse.json({ ok: true, data: state, mode: "tables" });
    }

    const { agent } = await ensureAgent(supabase, guard.user.id);
    const legacy = toLegacyState(agent);
    return NextResponse.json({ ok: true, data: legacy, mode: "legacy" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error desconocido" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing SUPABASE env (URL or SERVICE_ROLE)" }, { status: 500 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const op = String(body?.op || "").trim();
    const tablesReady = await hasNotetakerTables(supabase);
    const tenantId = await resolveTenantId(supabase, guard.user.id);
    let syncReport: any = null;

    if (tablesReady) {
      const { profile } = await ensureProfile(supabase, guard.user.id);
      const profileId = String(profile.id);

      if (op === "save_prompt") {
        const prompt = String(body?.prompt || "");
        const { error } = await supabase
          .from("notetaker_profiles")
          .update({ sales_prompt: prompt })
          .eq("id", profileId)
          .eq("created_by", guard.user.id);
        if (error) throw new Error(error.message);
      } else if (op === "create_folder") {
        const name = String(body?.name || "").trim();
        if (!name) {
          return NextResponse.json({ ok: false, error: "Falta el nombre del playbook" }, { status: 400 });
        }
        const description = String(body?.description || "").trim();
        const color = String(body?.color || "#a3e635").trim() || "#a3e635";
        const icon = String(body?.icon || "folder").trim() || "folder";
        const { error } = await supabase
          .from("notetaker_folders")
          .insert({
            profile_id: profileId,
            tenant_id: SYSTEM_TENANT_ID,
            created_by: guard.user.id,
            name,
            description: description || null,
            color,
            icon,
            is_favorite: false,
            notes: "",
          });
        if (error) throw new Error(error.message);
      } else if (op === "update_folder") {
        const id = String(body?.folder_id || "").trim();
        if (!id) return NextResponse.json({ ok: false, error: "Falta folder_id" }, { status: 400 });

        const patch: any = {};
        if (body?.name !== undefined) {
          const name = String(body?.name || "").trim();
          if (!name) return NextResponse.json({ ok: false, error: "El nombre no puede estar vacío" }, { status: 400 });
          patch.name = name;
        }
        if (body?.description !== undefined) patch.description = String(body?.description || "").trim() || null;
        if (body?.color !== undefined) patch.color = String(body?.color || "#a3e635").trim() || "#a3e635";
        if (body?.icon !== undefined) patch.icon = String(body?.icon || "folder").trim() || "folder";
        if (body?.is_favorite !== undefined) patch.is_favorite = Boolean(body?.is_favorite);
        if (body?.notes !== undefined) patch.notes = String(body?.notes || "");

        if (Object.keys(patch).length === 0) {
          return NextResponse.json({ ok: false, error: "No hay cambios para guardar" }, { status: 400 });
        }

        const { error } = await supabase
          .from("notetaker_folders")
          .update(patch)
          .eq("id", id)
          .eq("profile_id", profileId)
          .eq("created_by", guard.user.id);
        if (error) throw new Error(error.message);
      } else if (op === "delete_folder") {
        const id = String(body?.folder_id || "").trim();
        if (!id) {
          return NextResponse.json({ ok: false, error: "Falta folder_id" }, { status: 400 });
        }
        const { error } = await supabase
          .from("notetaker_folders")
          .delete()
          .eq("id", id)
          .eq("profile_id", profileId)
          .eq("created_by", guard.user.id);
        if (error) throw new Error(error.message);
      } else if (op === "set_meeting_folder") {
        const meetingId = String(body?.meeting_id || "").trim();
        const folderIdRaw = body?.folder_id;
        const folderId = folderIdRaw ? String(folderIdRaw).trim() : null;
        if (!meetingId) return NextResponse.json({ ok: false, error: "Falta meeting_id" }, { status: 400 });

        if (folderId) {
          const { data: folder, error: folErr } = await supabase
            .from("notetaker_folders")
            .select("id")
            .eq("id", folderId)
            .eq("profile_id", profileId)
            .eq("created_by", guard.user.id)
            .maybeSingle();
          if (folErr) throw new Error(folErr.message);
          if (!folder) return NextResponse.json({ ok: false, error: "Playbook no encontrado" }, { status: 404 });
        }

        const { error } = await supabase
          .from("notetaker_meetings")
          .update({ folder_id: folderId })
          .eq("id", meetingId)
          .eq("profile_id", profileId)
          .eq("created_by", guard.user.id);
        if (error) throw new Error(error.message);
      } else if (op === "create_meeting") {
        const meetingUrl = String(body?.meeting_url || "").trim();
        if (!meetingUrl) {
          return NextResponse.json({ ok: false, error: "Falta la URL de la reunión" }, { status: 400 });
        }
        const contactName = String(body?.contact_name || "").trim();
        const contactEmail = String(body?.contact_email || "").trim();
        const contactPhone = String(body?.contact_phone || "").trim();
        const { data: createdMeeting, error } = await supabase
          .from("notetaker_meetings")
          .insert({
            profile_id: profileId,
            tenant_id: tenantId,
            created_by: guard.user.id,
            source: "manual",
            title: contactName ? `Interacción con ${contactName}` : "Interacción manual",
            meeting_url: meetingUrl,
            host: "You",
            starts_at: new Date().toISOString(),
            duration_minutes: 30,
            participants_count: 2,
            status: "scheduled",
            metadata: {
              contact: {
                name: contactName || null,
                email: contactEmail || null,
                phone: contactPhone || null,
              },
              crm: { state: "pending" },
            },
          })
          .select("id,title,meeting_url,host,starts_at,duration_minutes,participants_count,status,source,metadata")
          .single();
        if (error) throw new Error(error.message);

        await notifyNotetakerAutomation({
          action: "interaction_created",
          tenantId,
          userId: guard.user.id,
          profileId,
          meeting: createdMeeting,
          salesPrompt: String(profile.sales_prompt || ""),
        });
      } else if (op === "toggle_meeting") {
        const id = String(body?.meeting_id || "").trim();
        if (!id) {
          return NextResponse.json({ ok: false, error: "Falta meeting_id" }, { status: 400 });
        }
        const { data: m, error: mErr } = await supabase
          .from("notetaker_meetings")
          .select("id,status")
          .eq("id", id)
          .eq("profile_id", profileId)
          .eq("created_by", guard.user.id)
          .maybeSingle();
        if (mErr) throw new Error(mErr.message);
        if (!m) return NextResponse.json({ ok: false, error: "Reunión no encontrada" }, { status: 404 });
        const nextStatus = m.status === "scheduled" ? "recorded" : "scheduled";
        const { error } = await supabase
          .from("notetaker_meetings")
          .update({ status: nextStatus })
          .eq("id", id)
          .eq("profile_id", profileId)
          .eq("created_by", guard.user.id);
        if (error) throw new Error(error.message);
      } else if (op === "delete_meeting") {
        const id = String(body?.meeting_id || "").trim();
        if (!id) {
          return NextResponse.json({ ok: false, error: "Falta meeting_id" }, { status: 400 });
        }
        const { error } = await supabase
          .from("notetaker_meetings")
          .delete()
          .eq("id", id)
          .eq("profile_id", profileId)
          .eq("created_by", guard.user.id);
        if (error) throw new Error(error.message);
      } else if (op === "analyze_meeting") {
        const id = String(body?.meeting_id || "").trim();
        if (!id) return NextResponse.json({ ok: false, error: "Falta meeting_id" }, { status: 400 });

        const { data: m, error: mErr } = await supabase
          .from("notetaker_meetings")
          .select("id,title,meeting_url,host,metadata")
          .eq("id", id)
          .eq("profile_id", profileId)
          .eq("created_by", guard.user.id)
          .maybeSingle();
        if (mErr) throw new Error(mErr.message);
        if (!m) return NextResponse.json({ ok: false, error: "Interacción no encontrada" }, { status: 404 });

        const analysis = await analyzeInteraction(
          String(profile.sales_prompt || ""),
          String(m.title || ""),
          String(m.host || ""),
          String(m.meeting_url || "")
        );

        const nextMetadata = {
          ...(m.metadata || {}),
          crm: {
            ...((m.metadata || {}).crm || {}),
            state: "analyzed",
            updated_at: new Date().toISOString(),
            summary: analysis.summary,
            intent: analysis.intent,
            priority: analysis.priority,
            next_action: analysis.next_action,
            suggested_status: analysis.suggested_status,
            score: analysis.score,
          },
        };

        const { error } = await supabase
          .from("notetaker_meetings")
          .update({ metadata: nextMetadata })
          .eq("id", id)
          .eq("profile_id", profileId)
          .eq("created_by", guard.user.id);
        if (error) throw new Error(error.message);

        await notifyNotetakerAutomation({
          action: "interaction_analyzed",
          tenantId,
          userId: guard.user.id,
          profileId,
          meeting: {
            ...m,
            metadata: nextMetadata,
            analysis,
          },
          salesPrompt: String(profile.sales_prompt || ""),
        });
      } else if (op === "save_pipeline") {
        const id = String(body?.meeting_id || "").trim();
        if (!id) return NextResponse.json({ ok: false, error: "Falta meeting_id" }, { status: 400 });

        const { data: m, error: mErr } = await supabase
          .from("notetaker_meetings")
          .select("id,title,metadata")
          .eq("id", id)
          .eq("profile_id", profileId)
          .eq("created_by", guard.user.id)
          .maybeSingle();
        if (mErr) throw new Error(mErr.message);
        if (!m) return NextResponse.json({ ok: false, error: "Interacción no encontrada" }, { status: 404 });

        const crm = (m.metadata || {}).crm || {};
        const nextMetadata = {
          ...(m.metadata || {}),
          crm: {
            ...crm,
            state: "applied",
            applied_at: new Date().toISOString(),
            pipeline_saved: true,
          },
        };
        const { error: metErr } = await supabase
          .from("notetaker_meetings")
          .update({ metadata: nextMetadata })
          .eq("id", id)
          .eq("profile_id", profileId)
          .eq("created_by", guard.user.id);
        if (metErr) throw new Error(metErr.message);

        await notifyNotetakerAutomation({
          action: "pipeline_saved",
          tenantId,
          userId: guard.user.id,
          profileId,
          meeting: {
            ...m,
            metadata: nextMetadata,
          },
          salesPrompt: String(profile.sales_prompt || ""),
        });
      } else if (op === "disconnect_google") {
        const nowIso = new Date().toISOString();
        await supabase
          .from("notetaker_meetings")
          .delete()
          .eq("profile_id", profileId)
          .eq("created_by", guard.user.id)
          .eq("source", "google_calendar");

        await supabase
          .from("notetaker_calendars")
          .delete()
          .eq("profile_id", profileId)
          .eq("created_by", guard.user.id)
          .eq("provider", "google");

        await supabase
          .from("integrations")
          .update({ status: "disconnected", updated_at: nowIso, last_activity: nowIso })
          .eq("user_id", guard.user.id)
          .eq("channel_type", "gmail")
          .eq("provider", "google");
      } else if (op === "sync_google") {
        syncReport = await syncGoogleCalendarsAndEvents(supabase, guard.user.id, profileId);
      }

      const state = await fetchState(supabase, guard.user.id);
      return NextResponse.json({ ok: true, data: state, mode: "tables", sync_report: syncReport });
    }

    // Fallback para entornos sin tablas notetaker_* (mantiene funcionalidad)
    const { agent } = await ensureAgent(supabase, guard.user.id);
    const current = toLegacyState(agent);
    let next: NotetakerState = { ...current };

    if (op === "save_prompt") {
      next.prompt = String(body?.prompt || "");
    } else if (op === "create_folder") {
      const name = String(body?.name || "").trim();
      if (!name) {
        return NextResponse.json({ ok: false, error: "Falta el nombre del playbook" }, { status: 400 });
      }
      const description = String(body?.description || "").trim();
      const color = String(body?.color || "#a3e635").trim() || "#a3e635";
      const icon = String(body?.icon || "folder").trim() || "folder";
      const exists = next.folders.some((f: any) => String(f?.name || "").toLowerCase() === name.toLowerCase());
      if (!exists) {
        next.folders = [{ id: makeId("folder"), name, description, color, icon, is_favorite: false, notes: "" }, ...next.folders];
      }
    } else if (op === "update_folder") {
      const id = String(body?.folder_id || "").trim();
      if (!id) return NextResponse.json({ ok: false, error: "Falta folder_id" }, { status: 400 });
      next.folders = next.folders.map((f: any) => {
        if (String(f?.id) !== id) return f;
        const updated = { ...f };
        if (body?.name !== undefined) {
          const name = String(body?.name || "").trim();
          if (name) updated.name = name;
        }
        if (body?.description !== undefined) updated.description = String(body?.description || "").trim();
        if (body?.color !== undefined) updated.color = String(body?.color || "#a3e635").trim() || "#a3e635";
        if (body?.icon !== undefined) updated.icon = String(body?.icon || "folder").trim() || "folder";
        if (body?.is_favorite !== undefined) updated.is_favorite = Boolean(body?.is_favorite);
        if (body?.notes !== undefined) updated.notes = String(body?.notes || "");
        return updated;
      });
    } else if (op === "delete_folder") {
      const id = String(body?.folder_id || "").trim();
      if (!id) {
        return NextResponse.json({ ok: false, error: "Falta folder_id" }, { status: 400 });
      }
      next.folders = next.folders.filter((f: any) => String(f?.id) !== id);
      next.meetings = next.meetings.map((m: any) => {
        if (String(m?.folder_id || "") !== id) return m;
        return { ...m, folder_id: null };
      });
    } else if (op === "set_meeting_folder") {
      const meetingId = String(body?.meeting_id || "").trim();
      const folderIdRaw = body?.folder_id;
      const folderId = folderIdRaw ? String(folderIdRaw).trim() : null;
      if (!meetingId) return NextResponse.json({ ok: false, error: "Falta meeting_id" }, { status: 400 });
      next.meetings = next.meetings.map((m: any) => {
        if (String(m?.id) !== meetingId) return m;
        return { ...m, folder_id: folderId };
      });
    } else if (op === "create_meeting") {
      const meetingUrl = String(body?.meeting_url || "").trim();
      if (!meetingUrl) {
        return NextResponse.json({ ok: false, error: "Falta la URL de la reunión" }, { status: 400 });
      }
      const contactName = String(body?.contact_name || "").trim();
      const contactEmail = String(body?.contact_email || "").trim();
      const contactPhone = String(body?.contact_phone || "").trim();
      const createdMeeting = {
          id: makeId("meeting"),
          title: contactName ? `Interacción con ${contactName}` : "Interacción manual",
          meeting_url: meetingUrl,
          host: "You",
          starts_at: new Date().toISOString(),
          duration_minutes: 30,
          participants_count: 2,
          status: "scheduled",
          source: "manual",
          metadata: {
            contact: { name: contactName || null, email: contactEmail || null, phone: contactPhone || null },
            crm: { state: "pending" },
          },
        };
      next.meetings = [createdMeeting, ...next.meetings];

      await notifyNotetakerAutomation({
        action: "interaction_created",
        tenantId,
        userId: guard.user.id,
        profileId: next.profile_id,
        meeting: createdMeeting,
        salesPrompt: String(next.prompt || ""),
      });
    } else if (op === "analyze_meeting") {
      const id = String(body?.meeting_id || "").trim();
      const m = next.meetings.find((x: any) => String(x?.id) === id);
      if (!m) return NextResponse.json({ ok: false, error: "Interacción no encontrada" }, { status: 404 });
      const analysis = await analyzeInteraction(next.prompt || "", String(m.title || ""), String(m.host || ""), String(m.meeting_url || ""));
      next.meetings = next.meetings.map((x: any) => {
        if (String(x?.id) !== id) return x;
        return {
          ...x,
          metadata: {
            ...(x?.metadata || {}),
            crm: {
              ...((x?.metadata || {}).crm || {}),
              state: "analyzed",
              updated_at: new Date().toISOString(),
              summary: analysis.summary,
              intent: analysis.intent,
              priority: analysis.priority,
              next_action: analysis.next_action,
              suggested_status: analysis.suggested_status,
              score: analysis.score,
            },
          },
        };
      });

      const analyzed = next.meetings.find((x: any) => String(x?.id) === id) || m;
      await notifyNotetakerAutomation({
        action: "interaction_analyzed",
        tenantId,
        userId: guard.user.id,
        profileId: next.profile_id,
        meeting: {
          ...analyzed,
          analysis,
        },
        salesPrompt: String(next.prompt || ""),
      });
    } else if (op === "save_pipeline") {
      const id = String(body?.meeting_id || "").trim();
      const m = next.meetings.find((x: any) => String(x?.id) === id);
      if (!m) return NextResponse.json({ ok: false, error: "Interacción no encontrada" }, { status: 404 });
      next.meetings = next.meetings.map((x: any) => {
        if (String(x?.id) !== id) return x;
        return {
          ...x,
          metadata: {
            ...(x?.metadata || {}),
            crm: {
              ...((x?.metadata || {}).crm || {}),
              state: "applied",
              applied_at: new Date().toISOString(),
              pipeline_saved: true,
            },
          },
        };
      });

      const applied = next.meetings.find((x: any) => String(x?.id) === id) || m;
      await notifyNotetakerAutomation({
        action: "pipeline_saved",
        tenantId,
        userId: guard.user.id,
        profileId: next.profile_id,
        meeting: applied,
        salesPrompt: String(next.prompt || ""),
      });
    } else if (op === "toggle_meeting") {
      const id = String(body?.meeting_id || "").trim();
      next.meetings = next.meetings.map((m: any) => {
        if (String(m?.id) !== id) return m;
        return { ...m, status: m?.status === "scheduled" ? "recorded" : "scheduled" };
      });
    } else if (op === "delete_meeting") {
      const id = String(body?.meeting_id || "").trim();
      next.meetings = next.meetings.filter((m: any) => String(m?.id) !== id);
    } else if (op === "sync_google") {
      const snapshot = await fetchGoogleSnapshot(supabase, guard.user.id);
      syncReport = snapshot.report || null;
      const calMap = new Map<string, any>();
      for (const c of [...next.calendars, ...snapshot.calendars]) {
        const key = String(c?.calendar_id || c?.calendar_email || c?.id || "");
        if (!key) continue;
        calMap.set(key, c);
      }
      next.calendars = Array.from(calMap.values());

      const existingIds = new Set(next.meetings.map((m: any) => String(m?.external_id || m?.id || "")));
      const addMeetings = snapshot.meetings.filter((m: any) => !existingIds.has(String(m?.external_id || m?.id || "")));
      next.meetings = [...next.meetings, ...addMeetings];
    } else if (op === "disconnect_google") {
      const nowIso = new Date().toISOString();
      next.calendars = next.calendars.filter((c: any) => String(c?.provider || "") !== "google");
      next.meetings = next.meetings.filter((m: any) => String(m?.source || "") !== "google_calendar");
      await supabase
        .from("integrations")
        .update({ status: "disconnected", updated_at: nowIso, last_activity: nowIso })
        .eq("user_id", guard.user.id)
        .eq("channel_type", "gmail")
        .eq("provider", "google");
    }

    const saved = await saveLegacyState(supabase, guard.user.id, next);
    return NextResponse.json({ ok: true, data: saved, mode: "legacy", sync_report: syncReport });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error desconocido" }, { status: 500 });
  }
}
