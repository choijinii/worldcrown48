/**
 * Edge middleware — tags the /admin subtree noindex.
 *
 * Firebase auth lives in the browser (IndexedDB), so Edge middleware CANNOT
 * see whether the visitor is the operator (handoff §9 trap #13). The real
 * access block is the client-side AdminAuthGuard. Middleware's job here is
 * defense-in-depth for discoverability: stamp `X-Robots-Tag: noindex` so the
 * operator console never lands in a search index, complementing robots.ts.
 */
import { NextResponse, type NextRequest } from "next/server";
import { isAdminPath } from "@/lib/lab/adminGate";

export function middleware(req: NextRequest): NextResponse {
  const res = NextResponse.next();
  if (isAdminPath(req.nextUrl.pathname)) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return res;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
