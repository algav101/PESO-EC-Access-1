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

  // 2. Landing Page: Set visitor session cookie to acknowledge entry via landing page
  if (pathname === "/") {
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

  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  const isInternalReferer = Boolean(referer && host && referer.includes(host));
  const isExternalReferer = Boolean(referer && host && !referer.includes(host));
  const hasLandingCookie = request.cookies.has("peso_landing_visited");

  // If accessed via a shared external link (e.g., Facebook, Messenger, Viber, etc.)
  // OR accessed directly without internal referrer and without active landing page session:
  // Always redirect directly to the landing page (/)
  if (isExternalReferer || (!isInternalReferer && !hasLandingCookie)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";

    const redirectResponse = NextResponse.redirect(url);
    // Mark landing page as visited for subsequent in-session clicks
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
