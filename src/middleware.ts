/**
 * Next.js middleware entry point.
 *
 * Auth logic is extracted into src/middleware/auth-middleware.ts for modularity.
 * If upstream adds their own middleware, compose them here:
 *   const result = await authMiddleware(req);
 *   if (result) return result;
 *   return upstreamMiddleware(req);
 */

import { NextRequest, NextResponse } from "next/server";
import { createAuthMiddleware } from "@/middleware/auth-middleware";

const authMiddleware = createAuthMiddleware();

export async function middleware(req: NextRequest) {
  const result = await authMiddleware(req);
  if (result) return result;
  return NextResponse.next();
}

export const runtime = "nodejs";

export const config = {
  matcher: [
    // Protect all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
