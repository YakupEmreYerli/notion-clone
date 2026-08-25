import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_ROUTES = [
  // `/` artik icerik tutmuyor, sunucuda karar verip yonlendiriyor
  // (app/page.tsx) — bu yuzden hala herkese acik olmali.
  /^\/$/,
  /^\/login$/,
  /^\/register$/,
  /^\/preview(\/.*)?$/,
  /^\/api\/auth(\/.*)?$/,
  /^\/api\/files(\/.*)?$/,
  /^\/\.well-known(\/.*)?$/,
];

const isPublicRoute = (pathname: string) =>
  PUBLIC_ROUTES.some((route) => route.test(pathname));

/**
 * Optimistic session check only — it looks at the cookie, never the database,
 * so it stays edge-safe. Every Convex query/mutation and API route still
 * verifies the session (or the JWT) on its own.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/test-fixtures/")) {
    return request.headers.get("x-playwright-fixture") === "1"
      ? NextResponse.next()
      : new NextResponse(null, { status: 404 });
  }

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  if (!getSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
