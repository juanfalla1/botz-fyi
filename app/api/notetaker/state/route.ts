import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";

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
      .select("id,name,color,created_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("notetaker_meetings")
      .select("id,title,meeting_url,host,starts_at,duration_minutes,participants_count,status,source,folder_id,created_at")
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

async function syncGoogleCalendarsAndEvents(supabase: any, userId: string, profileId: string) {
  const { data: integrations, error: intErr } = await supabase
    .from("integrations")
    .select("id,email_address,credentials,status,channel_type,provider")
    .eq("user_id", userId)
    .eq("channel_type", "gmail")
    .eq("provider", "google")
    .eq("status", "connected");

  if (intErr) throw new Error(intErr.message);

  for (const integ of integrations || []) {
    const email = String(integ?.email_address || integ?.credentials?.emailAddress || integ?.credentials?.email || "").trim();
    if (!email) continue;

    await supabase
      .from("notetaker_calendars")
      .upsert(
        {
          profile_id: profileId,
          tenant_id: SYSTEM_TENANT_ID,
          created_by: userId,
          provider: "google",
          integration_id: integ.id,
          calendar_id: email,
          calendar_name: "Google Calendar",
          calendar_email: email,
          status: "connected",
        },
        { onConflict: "profile_id,calendar_id" }
      );

    const accessToken = String(integ?.credentials?.access_token || "").trim();
    if (!accessToken) continue;

    try {
      const now = new Date();
      const max = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const eventsUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
      eventsUrl.searchParams.set("singleEvents", "true");
      eventsUrl.searchParams.set("orderBy", "startTime");
      eventsUrl.searchParams.set("timeMin", now.toISOString());
      eventsUrl.searchParams.set("timeMax", max.toISOString());
      eventsUrl.searchParams.set("maxResults", "25");

      const evRes = await fetch(eventsUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!evRes.ok) continue;

      const evJson: any = await evRes.json();
      const items: any[] = Array.isArray(evJson?.items) ? evJson.items : [];
      if (items.length === 0) continue;

      const extIds = items.map((it) => String(it?.id || "")).filter(Boolean);
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
        const extId = String(it?.id || "").trim();
        if (!extId || existingSet.has(extId)) continue;

        const startsAt = it?.start?.dateTime || null;
        const endsAt = it?.end?.dateTime || null;
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
          host: String(email),
          starts_at: startsAt,
          duration_minutes: duration,
          participants_count: Array.isArray(it?.attendees) ? it.attendees.length : 0,
          status: "scheduled",
          metadata: {
            organizer: it?.organizer || null,
          },
        });
      }

      if (toInsert.length) {
        await supabase.from("notetaker_meetings").insert(toInsert);
      }
    } catch {
      // ignore sync event errors per integration
    }
  }
}

async function fetchGoogleSnapshot(supabase: any, userId: string) {
  const calendars: any[] = [];
  const meetings: any[] = [];

  const { data: integrations, error: intErr } = await supabase
    .from("integrations")
    .select("id,email_address,credentials,status,channel_type,provider")
    .eq("user_id", userId)
    .eq("channel_type", "gmail")
    .eq("provider", "google")
    .eq("status", "connected");

  if (intErr) throw new Error(intErr.message);

  for (const integ of integrations || []) {
    const email = String(integ?.email_address || integ?.credentials?.emailAddress || integ?.credentials?.email || "").trim();
    if (!email) continue;

    calendars.push({
      id: `legacy-cal-${email}`,
      calendar_id: email,
      calendar_name: "Google Calendar",
      calendar_email: email,
      status: "connected",
      provider: "google",
    });

    const accessToken = String(integ?.credentials?.access_token || "").trim();
    if (!accessToken) continue;

    try {
      const now = new Date();
      const max = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const eventsUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
      eventsUrl.searchParams.set("singleEvents", "true");
      eventsUrl.searchParams.set("orderBy", "startTime");
      eventsUrl.searchParams.set("timeMin", now.toISOString());
      eventsUrl.searchParams.set("timeMax", max.toISOString());
      eventsUrl.searchParams.set("maxResults", "25");

      const evRes = await fetch(eventsUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!evRes.ok) continue;

      const evJson: any = await evRes.json();
      const items: any[] = Array.isArray(evJson?.items) ? evJson.items : [];

      for (const it of items) {
        const startsAt = it?.start?.dateTime || null;
        const endsAt = it?.end?.dateTime || null;
        const duration = startsAt && endsAt
          ? Math.max(0, Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000))
          : 0;

        const meetingUrl =
          it?.hangoutLink ||
          (Array.isArray(it?.conferenceData?.entryPoints) ? (it.conferenceData.entryPoints[0]?.uri || "") : "") ||
          "";

        meetings.push({
          id: `legacy-gcal-${String(it?.id || makeId("gcal"))}`,
          title: String(it?.summary || "Reunión"),
          meeting_url: String(meetingUrl),
          host: String(email),
          starts_at: startsAt,
          duration_minutes: duration,
          participants_count: Array.isArray(it?.attendees) ? it.attendees.length : 0,
          status: "scheduled",
          source: "google_calendar",
          external_id: String(it?.id || ""),
        });
      }
    } catch {
      // ignore per integration
    }
  }

  return { calendars, meetings };
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
          return NextResponse.json({ ok: false, error: "Falta el nombre de la carpeta" }, { status: 400 });
        }
        const { error } = await supabase
          .from("notetaker_folders")
          .insert({
            profile_id: profileId,
            tenant_id: SYSTEM_TENANT_ID,
            created_by: guard.user.id,
            name,
            color: "#a3e635",
          });
        if (error) throw new Error(error.message);
      } else if (op === "create_meeting") {
        const meetingUrl = String(body?.meeting_url || "").trim();
        if (!meetingUrl) {
          return NextResponse.json({ ok: false, error: "Falta la URL de la reunión" }, { status: 400 });
        }
        const { error } = await supabase
          .from("notetaker_meetings")
          .insert({
            profile_id: profileId,
            tenant_id: SYSTEM_TENANT_ID,
            created_by: guard.user.id,
            source: "manual",
            title: "Reunión manual",
            meeting_url: meetingUrl,
            host: "You",
            starts_at: new Date().toISOString(),
            duration_minutes: 30,
            participants_count: 2,
            status: "scheduled",
          });
        if (error) throw new Error(error.message);
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
      } else if (op === "sync_google") {
        await syncGoogleCalendarsAndEvents(supabase, guard.user.id, profileId);
      }

      const state = await fetchState(supabase, guard.user.id);
      return NextResponse.json({ ok: true, data: state, mode: "tables" });
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
        return NextResponse.json({ ok: false, error: "Falta el nombre de la carpeta" }, { status: 400 });
      }
      const exists = next.folders.some((f: any) => String(f?.name || "").toLowerCase() === name.toLowerCase());
      if (!exists) {
        next.folders = [{ id: makeId("folder"), name, color: "#a3e635" }, ...next.folders];
      }
    } else if (op === "create_meeting") {
      const meetingUrl = String(body?.meeting_url || "").trim();
      if (!meetingUrl) {
        return NextResponse.json({ ok: false, error: "Falta la URL de la reunión" }, { status: 400 });
      }
      next.meetings = [
        {
          id: makeId("meeting"),
          title: "Reunión manual",
          meeting_url: meetingUrl,
          host: "You",
          starts_at: new Date().toISOString(),
          duration_minutes: 30,
          participants_count: 2,
          status: "scheduled",
          source: "manual",
        },
        ...next.meetings,
      ];
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
    }

    const saved = await saveLegacyState(supabase, guard.user.id, next);
    return NextResponse.json({ ok: true, data: saved, mode: "legacy" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error desconocido" }, { status: 500 });
  }
}
