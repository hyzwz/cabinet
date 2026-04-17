/**
 * Modular auth middleware — extracted from src/middleware.ts for
 * better isolation and reduced merge conflict surface with upstream.
 *
 * If upstream adds their own middleware, the main middleware.ts
 * can compose both by chaining: authMiddleware → upstreamMiddleware.
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import fs from "fs";
import path from "path";

export interface AuthMiddlewareConfig {
  dataDir: string;
  publicPaths: string[];
  apiPrefix: string;
  loginPath: string;
  tokenCookie: string;
}

const defaultConfig: AuthMiddlewareConfig = {
  dataDir: getDefaultDataDir(),
  publicPaths: ["/login", "/api/auth/", "/api/health"],
  apiPrefix: "/api/",
  loginPath: "/login",
  tokenCookie: "kb-auth",
};

function getDefaultDataDir(): string {
  const configured = process.env.CABINET_DATA_DIR?.trim();
  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), "data");
}

function usersExist(cabinetInternalDir: string): boolean {
  try {
    const raw = fs.readFileSync(
      path.join(cabinetInternalDir, "users.json"),
      "utf8"
    );
    const users = JSON.parse(raw);
    return Array.isArray(users) && users.length > 0;
  } catch {
    return false;
  }
}

function getJwtSecret(cabinetInternalDir: string): Uint8Array | null {
  try {
    const raw = fs.readFileSync(
      path.join(cabinetInternalDir, "jwt-secret.txt"),
      "utf8"
    );
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

function authFailed(
  req: NextRequest,
  pathname: string,
  loginPath: string
): NextResponse {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL(loginPath, req.url));
}

function isPublicPath(pathname: string, publicPaths: string[]): boolean {
  return publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p)
  );
}

/**
 * Create an auth middleware function with the given config.
 * Returns null to indicate "pass through" (no auth action needed),
 * or a NextResponse to intercept the request.
 */
export function createAuthMiddleware(
  config: Partial<AuthMiddlewareConfig> = {}
) {
  const cfg = { ...defaultConfig, ...config };
  const cabinetInternalDir = path.join(cfg.dataDir, ".cabinet-state");

  return async function authMiddleware(
    req: NextRequest
  ): Promise<NextResponse | null> {
    const password = process.env.KB_PASSWORD || "";
    const hasUsers = usersExist(cabinetInternalDir);
    const { pathname } = req.nextUrl;

    // No auth configured — need first-user setup
    if (!password && !hasUsers) {
      if (
        isPublicPath(pathname, cfg.publicPaths) ||
        pathname.startsWith("/_next/") ||
        pathname === "/favicon.ico"
      ) {
        return null; // pass through
      }
      return authFailed(req, pathname, cfg.loginPath);
    }

    // Always allow public paths
    if (isPublicPath(pathname, cfg.publicPaths)) {
      return null;
    }

    const token = req.cookies.get(cfg.tokenCookie)?.value;

    // Multi-user mode: validate JWT
    if (hasUsers) {
      if (!token) {
        return authFailed(req, pathname, cfg.loginPath);
      }

      const secret = getJwtSecret(cabinetInternalDir);
      if (!secret) {
        return authFailed(req, pathname, cfg.loginPath);
      }

      try {
        const { payload } = await jwtVerify(token, secret);
        const response = NextResponse.next();
        response.headers.set("x-user-id", payload.userId as string);
        response.headers.set("x-user-name", payload.username as string);
        response.headers.set("x-user-role", payload.role as string);
        response.headers.set(
          "x-user-display-name",
          encodeURIComponent(payload.displayName as string)
        );
        return response;
      } catch {
        return authFailed(req, pathname, cfg.loginPath);
      }
    }

    // Legacy single-password mode
    if (password) {
      const expected = await hashLegacyToken(password);
      if (token !== expected) {
        return authFailed(req, pathname, cfg.loginPath);
      }
    }

    return null; // pass through
  };
}
