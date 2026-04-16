import { NextRequest } from "next/server";

export interface RequestUser {
  userId: string;
  username: string;
  displayName: string;
  role: string;
}

/**
 * Extract user info set by middleware via headers.
 * Returns null in legacy/no-auth mode.
 */
export function getRequestUser(req: NextRequest): RequestUser | null {
  const userId = req.headers.get("x-user-id");
  const username = req.headers.get("x-user-name");
  const role = req.headers.get("x-user-role");
  const displayName = req.headers.get("x-user-display-name");

  if (!userId || !username || !role) return null;

  return {
    userId,
    username,
    displayName: displayName ? decodeURIComponent(displayName) : username,
    role,
  };
}
