import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Completely bypass API routes, Next.js system assets, and static files
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/avatars") ||
    pathname.startsWith("/textures") ||
    pathname.startsWith("/models") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/offline.html" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Landing Page & Direct QR Assignment Lookups: Set visitor session cookie
  if (
    pathname === "/" ||
    pathname.startsWith("/my-assignment") ||
    pathname.startsWith("/qr/")
  ) {
    const response = NextResponse.next();
    response.cookies.set("peso_landing_visited", "1", {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    });
    return response;
  }

  // 3. Sub-addresses (e.g. /restrictions/checker, /apply, /dashboard, /login, etc.)
  // Allow internal Next.js client-side router requests (RSC fetches)
  const isRsc = request.headers.get("rsc") === "1";
  const isNextRouter = request.headers.get("next-router-state-tree") !== null;
  if (isRsc || isNextRouter) {
    return NextResponse.next();
  }

  const isPublicSubRoute =
    pathname === "/login" ||
    pathname.startsWith("/apply") ||
    pathname.startsWith("/restrictions/checker");

  const hasAuthCookie = Boolean(request.cookies.get("tupad_auth_token")?.value);

  // Protect staff-only routes when no authentication token cookie is present
  if (!isPublicSubRoute && !hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.cookies.set("peso_landing_visited", "1", {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    });
    return redirectResponse;
  }

  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  const isInternalReferer = Boolean(referer && host && referer.includes(host));
  const isExternalReferer = Boolean(referer && host && !referer.includes(host));
  const hasLandingCookie = request.cookies.has("peso_landing_visited");

  // If an unauthenticated visitor accesses a public sub-route via an external link
  // OR without an active landing page session: redirect to landing page (/)
  if (!hasAuthCookie && (isExternalReferer || (!isInternalReferer && !hasLandingCookie))) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";

    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.cookies.set("peso_landing_visited", "1", {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    });
    return redirectResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except API routes, static assets, and Next.js internal files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|offline.html).*)",
  ],
};
