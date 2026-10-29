import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Next.js 16 renamed middleware.ts -> proxy.ts.
// This is a fast, optimistic redirect only. Real authorization happens in
// every route handler / page via getSession(), so never rely on this alone.
export async function proxy(req: NextRequest) {
  const token = req.cookies.get("ops_session")?.value;
  let authed = false;

  if (token && process.env.SESSION_SECRET) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET));
      authed = true;
    } catch {
      authed = false;
    }
  }

  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/dashboard") && !authed) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if ((pathname === "/login" || pathname === "/register") && authed) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
