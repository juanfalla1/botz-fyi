import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { AGENTS_PRODUCT_KEY } from "@/app/api/_utils/entitlement";
import { getServiceSupabase } from "@/app/api/_utils/supabase";

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing SUPABASE env (URL or SERVICE_ROLE)" }, { status: 500 });
  }

  const currentAppMetadata = (guard.user.app_metadata || {}) as Record<string, any>;
  const currentUserMetadata = (guard.user.user_metadata || {}) as Record<string, any>;

  const { error } = await supabase.auth.admin.updateUserById(guard.user.id, {
    app_metadata: {
      ...currentAppMetadata,
      product_key: AGENTS_PRODUCT_KEY,
      products: Array.from(new Set([...(Array.isArray(currentAppMetadata.products) ? currentAppMetadata.products : []), AGENTS_PRODUCT_KEY])),
    },
    user_metadata: {
      ...currentUserMetadata,
      product_key: AGENTS_PRODUCT_KEY,
    },
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message || "Could not update agents profile" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
