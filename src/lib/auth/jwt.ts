import { SignJWT, jwtVerify, errors } from "jose";
import { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { CABINET_INTERNAL_DIR } from "@/lib/storage/path-utils";
import { ensureDirectory } from "@/lib/storage/fs-operations";
import type { JwtPayload, SafeUser } from "@/types";

const SECRET_FILE = path.join(CABINET_INTERNAL_DIR, "jwt-secret.txt");
const TOKEN_COOKIE = "kb-auth";
const TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

let cachedSecret: Uint8Array | null = null;

async function getSecret(): Promise<Uint8Array> {
  if (cachedSecret) return cachedSecret;

  try {
    const raw = await fs.readFile(SECRET_FILE, "utf8");
    cachedSecret = new TextEncoder().encode(raw.trim());
    return cachedSecret;
  } catch {
    // Generate new secret
    await ensureDirectory(CABINET_INTERNAL_DIR);
    const secret = crypto.randomBytes(48).toString("base64url");
    await fs.writeFile(SECRET_FILE, secret, "utf8");
    cachedSecret = new TextEncoder().encode(secret);
    return cachedSecret;
  }
}

export async function signToken(user: SafeUser): Promise<string> {
  const secret = await getSecret();
  const payload: JwtPayload = {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };

  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE}s`)
    .setSubject(user.id)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const secret = await getSecret();
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.userId as string,
      username: payload.username as string,
      displayName: payload.displayName as string,
      role: payload.role as JwtPayload["role"],
    };
  } catch (e) {
    if (e instanceof errors.JWTExpired) {
      console.warn("JWT expired");
    }
    return null;
  }
}

export async function getCurrentUser(req: NextRequest): Promise<JwtPayload | null> {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export { TOKEN_COOKIE, TOKEN_MAX_AGE };
