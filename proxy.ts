import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const isGeoHost = host === "geo.botz.fyi";
  const geoPathname = isGeoHost && !pathname.startsWith("/geo") ? `/geo${pathname === "/" ? "" : pathname}` : pathname;

  if (isGeoHost && pathname.startsWith("/geo")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/geo" ? "/" : pathname.replace(/^\/geo/, "");
    return NextResponse.redirect(url);
  }

  if (isGeoHost && !pathname.startsWith("/geo") && !pathname.startsWith("/api") && !pathname.startsWith("/_next")) {
    const url = request.nextUrl.clone();
    url.pathname = geoPathname;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
