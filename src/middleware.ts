import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import fs from "fs";
import path from "path";

const TOKEN_COOKIE = "kb-auth";

function getManagedDataDir(): string {
  const configured = process.env.CABINET_DATA_DIR?.trim();
  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), "data");
}

const DATA_DIR = getManagedDataDir();
const CABINET_INTERNAL_DIR = path.join(DATA_DIR, ".cabinet-state");
const SECRET_FILE = path.join(CABINET_INTERNAL_DIR, "jwt-secret.txt");
const USERS_FILE = path.join(CABINET_INTERNAL_DIR, "users.json");

function usersExist(): boolean {
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    const users = JSON.parse(raw);
    return Array.isArray(users) && users.length > 0;
  } catch {
    return false;
  }
}

function getJwtSecret(): Uint8Array | null {
  try {
    const raw = fs.readFileSync(SECRET_FILE, "utf8");
    return new TextEncoder().encode(raw.trim());
  } catch {
    return null;
  }
}

async function hashLegacyToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "cabinet-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(req: NextRequest) {
  const password = process.env.KB_PASSWORD || "";
  const hasUsers = usersExist();

  // No auth configured at all — allow everything
  if (!password && !hasUsers) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // Always allow auth-related routes and static assets
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/health")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(TOKEN_COOKIE)?.value;

  // Multi-user mode: validate JWT
  if (hasUsers) {
    if (!token) {
      return authFailed(req, pathname);
    }

    const secret = getJwtSecret();
    if (!secret) {
      return authFailed(req, pathname);
    }

    try {
      const { payload } = await jwtVerify(token, secret);
      // Attach user info as headers for downstream API routes
      const response = NextResponse.next();
      response.headers.set("x-user-id", payload.userId as string);
      response.headers.set("x-user-name", payload.username as string);
      response.headers.set("x-user-role", payload.role as string);
      response.headers.set("x-user-display-name", encodeURIComponent(payload.displayName as string));
      return response;
    } catch {
      return authFailed(req, pathname);
    }
  }

  // Legacy single-password mode
  if (password) {
    const expected = await hashLegacyToken(password);
    if (token !== expected) {
      return authFailed(req, pathname);
    }
  }

  return NextResponse.next();
}

function authFailed(req: NextRequest, pathname: string): NextResponse {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const runtime = "nodejs";

export const config = {
  matcher: [
    // Protect all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
