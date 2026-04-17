/**
 * Auth module barrel export.
 *
 * All auth-related imports should come from here:
 *   import { signToken, getRequestUser, ... } from "@/lib/auth"
 *
 * Internal modules:
 *   - jwt.ts: JWT signing/verification, token cookie management
 *   - request-user.ts: Extract user info from middleware-set headers
 *
 * Related modules (not re-exported to avoid circular deps):
 *   - @/lib/storage/user-io: User CRUD on disk
 *   - @/types/users: User/SafeUser/JwtPayload types
 *   - @/stores/auth-store: Client-side auth state (Zustand)
 *   - @/middleware.ts: Auth middleware (Next.js convention location)
 */

// JWT operations
export {
  signToken,
  verifyToken,
  getCurrentUser,
  TOKEN_COOKIE,
  TOKEN_MAX_AGE,
} from "./jwt";

// Request user extraction (from middleware headers)
export { getRequestUser } from "./request-user";
export type { RequestUser } from "./request-user";
