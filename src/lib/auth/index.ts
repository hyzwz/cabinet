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
  authorizeAdminActor,
  authorizeUserAction,
  resolveActorFromRequest,
  resolveCabinetContextForRequest,
  resolveCabinetContextForResource,
  resolveCompanyContextForRequest,
  resolvePageDerivedResourceContext,
  resolvePageResourceContext,
  resetCabinetMembershipProvider,
  resetCabinetResourceMappingProvider,
  resetCompanyMembershipProvider,
  setCabinetMembershipProvider,
  setCabinetResourceMappingProvider,
  setCompanyMembershipProvider,
  toHttpErrorResponse,
} from "./page-authorization";

export { getRequestUser } from "./request-user";
export {
  createFileReportingRelationProvider,
  createFileReportingSnapshotProvider,
  createInMemoryReportingRelationProvider,
  createInMemoryReportingSnapshotProvider,
  getReportingReadService,
  getReportingRelationService,
  getReportingSnapshotRefreshService,
  resetReportingReadService,
  resetReportingRelationProvider,
  resetReportingSnapshotProvider,
  setCabinetOwnershipProvider,
  setReportingRelationProvider,
  setReportingSnapshotProvider,
} from "./reporting";
export type {
  CabinetOwnershipProvider,
  CabinetReportingLink,
  CabinetReportingLinkStatus,
  CabinetReportingSnapshot,
  ReportingReadService,
  ReportingRelationProvider,
  ReportingRelationService,
  ReportingSnapshotProvider,
  ReportingSnapshotRefreshService,
} from "./reporting";
