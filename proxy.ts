import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const isGeoHost = host === "geo.botz.fyi";
  const geoPathname = isGeoHost && !pathname.startsWith("/geo") ? `/geo${pathname === "/" ? "" : pathname}` : pathname;
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();

  const user = data.user;
  const isGeoProtected = geoPathname.startsWith("/geo/app");
  const isGeoAuthPage = geoPathname === "/geo/login" || geoPathname === "/geo/register";

  if (isGeoHost && pathname.startsWith("/geo")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/geo" ? "/" : pathname.replace(/^\/geo/, "");
    return NextResponse.redirect(url);
  }

  if (isGeoProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = isGeoHost ? "/login" : "/geo/login";
    url.searchParams.set("next", isGeoHost ? pathname : geoPathname);
    return NextResponse.redirect(url);
  }

  if (isGeoAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = isGeoHost ? "/app" : "/geo/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isGeoHost && !pathname.startsWith("/geo") && !pathname.startsWith("/api") && !pathname.startsWith("/_next")) {
    const url = request.nextUrl.clone();
    url.pathname = geoPathname;
    return NextResponse.rewrite(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
